"""
routes/agent_bp.py — 核心业务路由
对齐规格: 09-API接口规格 §4~15
端点清单:
  POST   /ask
  GET    /sessions
  POST   /sessions
  DELETE /sessions/<id>
  PUT    /sessions/<id>
  GET    /sessions/<id>/records
  POST   /export
"""
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from flask import Blueprint, jsonify, request, current_app, send_file

from app.agents import bailian_agent, demo_agent, ollama_agent

agent_bp = Blueprint("agent", __name__)


# ------------------------------------------------------------------ #
# 辅助函数
# ------------------------------------------------------------------ #
def _trace() -> str:
    return f"tr_{uuid.uuid4().hex[:16]}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _err(http_code: int, code: str, message: str, details: dict | None = None):
    trace_id = _trace()
    return (
        jsonify({"error": {"code": code, "message": message, "details": details or {}, "traceId": trace_id}}),
        http_code,
    )


def _get_storage():
    return current_app.config["STORAGE"]


def _call_llm(query: str, session_context: list) -> dict:
    """四级降级：Ollama → 百炼 → Demo（对齐 08-架构 §4 / ADR-003）。"""
    # [1] 优先尝试 Ollama 本地模型
    if ollama_agent.is_available():
        try:
            result = ollama_agent.ask(query, session_context)
            if result:
                return result
        except Exception as e:
            print(f"[Agent] Ollama 调用失败: {e}")
    
    # [2] Ollama 失败，尝试百炼
    if bailian_agent.is_available():
        try:
            return bailian_agent.ask(query, session_context)
        except Exception as e:
            print(f"[Agent] 百炼调用失败: {e}")
    
    # [3] 全部失败，使用 Demo 兜底
    return demo_agent.ask(query, session_context)


# ------------------------------------------------------------------ #
# POST /ask — 问答提交 (TC-M01-032~035 / TC-M01-060~064)
# ------------------------------------------------------------------ #
@agent_bp.route("/ask", methods=["POST"])
def post_ask():
    storage = _get_storage()
    data = request.get_json(silent=True) or {}

    # 参数校验（09-API §16）
    query = (data.get("query") or "").strip()
    session_id = (data.get("session_id") or "").strip()

    if not query:
        return _err(400, "EMPTY_QUERY", "请输入问题")
    if len(query) > 500:
        return _err(400, "INVALID_QUERY", "问题过长，请控制在500字符以内", {"max_length": 500})
    if not session_id:
        return _err(400, "EMPTY_SESSION_ID", "session_id 不能为空")
    if not UUID_RE.match(session_id):
        return _err(400, "INVALID_SESSION_ID", "session_id 格式非法", {"format": "UUID"})

    session = storage.get_session(session_id)
    if session is None:
        return _err(404, "SESSION_NOT_FOUND", "会话不存在或已删除", {"session_id": session_id})

    # 获取历史上下文
    context = storage.get_records_by_session(session_id)

    # 调用 LLM（降级链）
    result = _call_llm(query, context)

    # 存储问答记录
    record = storage.add_record(
        session_id=session_id,
        query=query,
        answer=result["answer"],
        llm_used=result["llm_used"],
        model=result.get("model"),
        response_time_ms=result["response_time_ms"],
        answer_source=result["answer_source"],
        sources=result.get("sources", []),
    )

    return (
        jsonify(
            {
                "traceId": _trace(),
                "answer": result["answer"],
                "llm_used": result["llm_used"],
                "model": result.get("model"),
                "response_time_ms": result["response_time_ms"],
                "answer_source": result["answer_source"],
                "sources": result.get("sources", []),
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# GET /sessions — 会话列表 (TC-M01-020)
# ------------------------------------------------------------------ #
@agent_bp.route("/sessions", methods=["GET"])
def get_sessions():
    storage = _get_storage()
    page = max(1, int(request.args.get("page", 1)))
    page_size = min(100, max(1, int(request.args.get("page_size", 20))))

    all_sessions = storage.get_sessions()
    total = len(all_sessions)
    start = (page - 1) * page_size
    paginated = all_sessions[start: start + page_size]

    return (
        jsonify(
            {
                "traceId": _trace(),
                "total": total,
                "page": page,
                "page_size": page_size,
                "sessions": paginated,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# POST /sessions — 新建会话 (TC-M01-021)
# ------------------------------------------------------------------ #
@agent_bp.route("/sessions", methods=["POST"])
def create_session():
    storage = _get_storage()
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "新会话").strip()

    if len(title) > 100:
        return _err(400, "INVALID_TITLE", "标题过长，最多100字符", {"max_length": 100})

    session_id = str(uuid.uuid4())
    session = storage.create_session(session_id, title)

    return (
        jsonify(
            {
                "traceId": _trace(),
                "session_id": session["session_id"],
                "title": session["title"],
                "created_at": session["created_at"],
                "query_count": session["query_count"],
            }
        ),
        201,
    )


# ------------------------------------------------------------------ #
# DELETE /sessions/<id> — 删除会话 (TC-M01-022/023)
# ------------------------------------------------------------------ #
@agent_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    storage = _get_storage()

    if not UUID_RE.match(session_id):
        return _err(400, "INVALID_SESSION_ID", "session_id 格式非法", {"format": "UUID"})

    session = storage.get_session(session_id)
    if session is None:
        return _err(404, "SESSION_NOT_FOUND", "会话不存在", {"session_id": session_id})

    storage.delete_session(session_id)

    return (
        jsonify(
            {
                "traceId": _trace(),
                "deleted": True,
                "session_id": session_id,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# PUT /sessions/<id> — 更新会话标题 (TC-M01-024/047)
# ------------------------------------------------------------------ #
@agent_bp.route("/sessions/<session_id>", methods=["PUT"])
def update_session(session_id):
    storage = _get_storage()
    data = request.get_json(silent=True) or {}

    if not UUID_RE.match(session_id):
        return _err(400, "INVALID_SESSION_ID", "session_id 格式非法")

    title = (data.get("title") or "").strip()
    if not title:
        return _err(400, "INVALID_TITLE", "标题不能为空")
    if len(title) > 100:
        return _err(400, "INVALID_TITLE", "标题过长，最多100字符", {"max_length": 100})

    session = storage.get_session(session_id)
    if session is None:
        return _err(404, "SESSION_NOT_FOUND", "会话不存在", {"session_id": session_id})

    updated = storage.update_session(session_id, {"title": title})

    return (
        jsonify(
            {
                "traceId": _trace(),
                "session_id": session_id,
                "title": updated["title"],
                "updated_at": updated["updated_at"],
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# GET /sessions/<id>/records — 问答记录 (TC-M01-030/031/025)
# ------------------------------------------------------------------ #
@agent_bp.route("/sessions/<session_id>/records", methods=["GET"])
def get_records(session_id):
    storage = _get_storage()

    if not UUID_RE.match(session_id):
        return _err(400, "INVALID_SESSION_ID", "session_id 格式非法")

    session = storage.get_session(session_id)
    if session is None:
        return _err(404, "SESSION_NOT_FOUND", "会话不存在或已删除", {"session_id": session_id})

    page = max(1, int(request.args.get("page", 1)))
    page_size = min(100, max(1, int(request.args.get("page_size", 20))))

    all_records = storage.get_records_by_session(session_id)
    total = len(all_records)
    start = (page - 1) * page_size
    paginated = all_records[start: start + page_size]

    return (
        jsonify(
            {
                "traceId": _trace(),
                "session_id": session_id,
                "total": total,
                "records": paginated,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# POST /export — 导出问答记录 (TC-M01-036~038)
# ------------------------------------------------------------------ #
@agent_bp.route("/export", methods=["POST"])
def export_records():
    storage = _get_storage()
    data = request.get_json(silent=True) or {}

    session_id = (data.get("session_id") or "").strip()
    fmt = (data.get("format") or "").strip().lower()

    if not session_id:
        return _err(400, "EMPTY_SESSION_ID", "session_id 不能为空")
    if not UUID_RE.match(session_id):
        return _err(400, "INVALID_SESSION_ID", "session_id 格式非法")
    if fmt not in ("json", "txt"):
        return _err(400, "INVALID_FORMAT", "不支持的导出格式", {"supported": ["json", "txt"]})

    session = storage.get_session(session_id)
    if session is None:
        return _err(404, "SESSION_NOT_FOUND", "会话不存在", {"session_id": session_id})

    records = storage.get_records_by_session(session_id)

    export_id = f"exp_{uuid.uuid4().hex[:12]}"
    exports_dir = os.path.join(storage.data_dir, "exports")
    os.makedirs(exports_dir, exist_ok=True)

    if fmt == "json":
        import json as _json
        content = _json.dumps(
            {"session": session, "records": records}, ensure_ascii=False, indent=2
        )
        filename = f"{export_id}.json"
    else:
        lines = [f"会话：{session.get('title', '未命名')}", "=" * 40]
        for r in records:
            lines.append(f"\n[{r.get('timestamp', '')}]")
            lines.append(f"问：{r.get('query', '')}")
            lines.append(f"答：{r.get('answer', '')}")
            lines.append(f"来源：{r.get('answer_source', 'demo')}")
            lines.append("-" * 40)
        content = "\n".join(lines)
        filename = f"{export_id}.txt"

    filepath = os.path.join(exports_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    # 导出链接有效期 5 分钟（对齐 09-API §15 / 07-非功能 §5.1）
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=5)).strftime("%Y-%m-%dT%H:%M:%SZ")

    return (
        jsonify(
            {
                "traceId": _trace(),
                "export_id": export_id,
                "status": "completed",
                "download_url": f"/api/v1/agent/download/{export_id}",
                "expires_at": expires_at,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# GET /download/<export_id> — 下载导出文件
# ------------------------------------------------------------------ #
@agent_bp.route("/download/<export_id>", methods=["GET"])
def download_export(export_id):
    storage = _get_storage()
    exports_dir = os.path.join(storage.data_dir, "exports")

    for filename in (f"{export_id}.json", f"{export_id}.txt"):
        filepath = os.path.join(exports_dir, filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)

    return _err(404, "EXPORT_NOT_FOUND", "导出文件不存在或已过期")
