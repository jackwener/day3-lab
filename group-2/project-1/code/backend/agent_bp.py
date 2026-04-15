"""API 路由层 -- 会话管理 / 问答提交 / 健康检查 / 文档溯源

TASK-05: 会话管理  (对齐 09 S4/S5/S6/S7, 05 US-001/US-004)
TASK-06: 问答/SSE   (对齐 09 S3, 05 US-002, 04 R-01~R-04, 08 S1.2)
TASK-07: 辅助端点  (对齐 09 S1/S8/S9, 05 US-003/US-005)

端点清单:
- POST   /sessions              新建会话 (201)
- GET    /sessions              会话列表 (200)
- DELETE /sessions/<id>         删除会话 (200)
- GET    /sessions/<id>/records 问答记录 (200)
- POST   /ask                   问答提交 + SSE 流式 (200)
- GET    /capabilities          能力探测 (200)
- GET    /health                健康检查 (200)
- GET    /doc/chunks            原文溯源 (200)
"""

import json
import uuid

from flask import Blueprint, Response, request, jsonify, current_app

agent_bp = Blueprint("agent", __name__)


# ── helpers ────────────────────────────────────────────────────────


def _get_trace_id() -> str:
    """优先复用请求头 X-Trace-Id，缺省时本地生成 (对齐 07 S3.1 链路追踪)"""
    return request.headers.get("X-Trace-Id") or f"tr_{uuid.uuid4().hex}"


def _get_storage():
    """从 Flask app config 获取 Storage 实例"""
    return current_app.config["STORAGE"]


def _get_agent():
    """从 Flask app config 获取 CoPawAgent 实例"""
    return current_app.config["AGENT"]


def _error_response(code: str, message: str, details: dict,
                    trace_id: str, http_status: int):
    """统一错误响应格式 (对齐 09 S2)"""
    return jsonify({
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "traceId": trace_id,
        }
    }), http_status


# ── 4.1 POST /sessions  -- 新建会话 ──────────────────────────────


@agent_bp.route("/sessions", methods=["POST"])
def create_session():
    trace_id = _get_trace_id()

    # 1. 解析请求 JSON
    body = request.get_json(silent=True) or {}
    title = body.get("title", "新会话")

    # 2. title 校验: 必须为字符串, <= 100 字符
    if not isinstance(title, str):
        title = "新会话"
    if len(title) > 100:
        return _error_response(
            code="INVALID_QUERY",
            message="title 不能超过 100 个字符",
            details={"max_length": 100},
            trace_id=trace_id,
            http_status=400,
        )

    # 3. 生成 session_id (UUID v4)
    session_id = f"sess_{uuid.uuid4().hex[:8]}"

    # 4. 调用 Storage
    storage = _get_storage()
    session = storage.create_session(session_id, title)

    # 5. 返回 201 + 会话对象 + traceId
    return jsonify({
        "traceId": trace_id,
        "session_id": session["session_id"],
        "title": session["title"],
        "created_at": session["created_at"],
        "query_count": session["query_count"],
    }), 201


# ── 4.2 GET /sessions  -- 会话列表 ───────────────────────────────


@agent_bp.route("/sessions", methods=["GET"])
def list_sessions():
    trace_id = _get_trace_id()
    storage = _get_storage()

    # storage.get_sessions() 已按 created_at 倒序排列
    sessions = storage.get_sessions()

    return jsonify({
        "traceId": trace_id,
        "sessions": sessions,
    }), 200


# ── 4.3 DELETE /sessions/<id>  -- 删除会话 ───────────────────────


@agent_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id: str):
    trace_id = _get_trace_id()

    # 校验 id 非空
    if not session_id or not session_id.strip():
        return _error_response(
            code="MISSING_SESSION_ID",
            message="session_id 不能为空",
            details={},
            trace_id=trace_id,
            http_status=400,
        )

    storage = _get_storage()

    try:
        result = storage.delete_session(session_id)
    except KeyError:
        return _error_response(
            code="SESSION_NOT_FOUND",
            message="指定会话不存在",
            details={"session_id": session_id},
            trace_id=trace_id,
            http_status=404,
        )

    return jsonify({
        "traceId": trace_id,
        "message": "会话已删除",
        "deleted_session_id": result["deleted_session_id"],
        "deleted_records_count": result["deleted_records_count"],
    }), 200


# ── 4.4 GET /sessions/<id>/records  -- 问答记录 ─────────────────


@agent_bp.route("/sessions/<session_id>/records", methods=["GET"])
def get_session_records(session_id: str):
    trace_id = _get_trace_id()

    # 校验 id 非空
    if not session_id or not session_id.strip():
        return _error_response(
            code="MISSING_SESSION_ID",
            message="session_id 不能为空",
            details={},
            trace_id=trace_id,
            http_status=400,
        )

    storage = _get_storage()

    try:
        records = storage.get_records_by_session(session_id)
    except KeyError:
        return _error_response(
            code="SESSION_NOT_FOUND",
            message="指定会话不存在",
            details={"session_id": session_id},
            trace_id=trace_id,
            http_status=404,
        )

    return jsonify({
        "traceId": trace_id,
        "session_id": session_id,
        "records": records,
    }), 200


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK-06: POST /ask — 问答提交与 SSE 流式响应
# 对齐 Spec: 09 §3, 05 US-002, 04 R-01~R-04, 08 §1.2 SSE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@agent_bp.route("/ask", methods=["POST"])
def ask():
    trace_id = _get_trace_id()

    # 1. 解析请求 JSON
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id")
    query = body.get("query")

    # 2. 参数校验（校验顺序: session_id 非空 → query 非空 → query 长度 → session_id 存在性）

    # 2a. session_id 缺失或为空
    if not session_id or (isinstance(session_id, str) and not session_id.strip()):
        return _error_response(
            code="MISSING_SESSION_ID",
            message="session_id 不能为空",
            details={},
            trace_id=trace_id,
            http_status=400,
        )

    # 2b. query 为空/null/全空白
    if not query or (isinstance(query, str) and not query.strip()):
        return _error_response(
            code="EMPTY_QUERY",
            message="查询内容不能为空",
            details={},
            trace_id=trace_id,
            http_status=400,
        )

    # 2c. query 超过 500 字符
    if isinstance(query, str) and len(query) > 500:
        return _error_response(
            code="INVALID_QUERY",
            message="查询内容不能超过 500 个字符",
            details={"max_length": 500, "actual_length": len(query)},
            trace_id=trace_id,
            http_status=400,
        )

    # 2d. session_id 存在性校验
    storage = _get_storage()
    sessions = storage.get_sessions()
    if not any(s["session_id"] == session_id for s in sessions):
        return _error_response(
            code="SESSION_NOT_FOUND",
            message="指定会话不存在",
            details={"session_id": session_id},
            trace_id=trace_id,
            http_status=404,
        )

    # 3. 调用 Agent 编排层
    agent = _get_agent()
    try:
        result = agent.ask(query, session_id)
    except KeyError:
        return _error_response(
            code="SESSION_NOT_FOUND",
            message="指定会话不存在",
            details={"session_id": session_id},
            trace_id=trace_id,
            http_status=404,
        )
    except Exception:
        return _error_response(
            code="LLM_SERVICE_ERROR",
            message="LLM 服务调用失败",
            details={},
            trace_id=trace_id,
            http_status=500,
        )

    # 4. SSE 流式响应封装 (对齐 08 §1.2)
    def generate_sse():
        """将 agent.ask 结果封装为 SSE 事件流（教学版按字符模拟）"""
        try:
            # 逐字符推送 chunk 事件（对齐前端 client.js event/text 格式）
            for char in result["answer"]:
                data = json.dumps({"event": "chunk", "text": char}, ensure_ascii=False)
                yield f"data: {data}\n\n"

            # 最终完整结果 done 事件
            done_data = {
                "event": "done",
                "traceId": trace_id,
                "answer": result["answer"],
                "llm_used": result["llm_used"],
                "model": result.get("model"),
                "response_time_ms": result["response_time_ms"],
                "answer_source": result["answer_source"],
                "references": result.get("references", []),
            }
            data = json.dumps(done_data, ensure_ascii=False)
            yield f"data: {data}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            error_data = json.dumps(
                {"event": "error", "message": "流式响应生成失败", "traceId": trace_id},
                ensure_ascii=False,
            )
            yield f"data: {error_data}\n\n"

    return Response(
        generate_sse(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TASK-07: 辅助端点 — 能力探测 / 健康检查 / 原文溯源
# 对齐 Spec: 09 §1/§8/§9, 05 US-003/US-005
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


# ── GET /capabilities — 能力探测 ──────────────────────────────


@agent_bp.route("/capabilities", methods=["GET"])
def get_capabilities():
    trace_id = _get_trace_id()
    agent = _get_agent()
    caps = agent.get_capabilities()
    return jsonify({
        "traceId": trace_id,
        "copaw_configured": caps["copaw_configured"],
        "bailian_configured": caps["bailian_configured"],
    }), 200


# ── GET /health — 健康检查 ────────────────────────────────────


@agent_bp.route("/health", methods=["GET"])
def health_check():
    trace_id = _get_trace_id()
    agent = _get_agent()
    health = agent.check_health()
    return jsonify({
        "traceId": trace_id,
        "status": health["status"],
        "components": health["components"],
    }), 200


# ── GET /doc/chunks — 原文溯源 ────────────────────────────────


@agent_bp.route("/doc/chunks", methods=["GET"])
def get_doc_chunk():
    trace_id = _get_trace_id()

    # 1. 解析查询参数 chunk_id
    chunk_id = request.args.get("chunk_id", "").strip()

    # 2. 校验 chunk_id 非空
    if not chunk_id:
        return _error_response(
            code="MISSING_SESSION_ID",
            message="chunk_id 参数不能为空",
            details={},
            trace_id=trace_id,
            http_status=400,
        )

    # 3. 查询文档块
    storage = _get_storage()
    chunk = storage.get_chunk_by_id(chunk_id)

    # 4. 若返回 None -> 404
    if chunk is None:
        return _error_response(
            code="DOC_CHUNK_NOT_FOUND",
            message="指定文档块不存在",
            details={"chunk_id": chunk_id},
            trace_id=trace_id,
            http_status=404,
        )

    # 5. 返回 200 + 文档块详情
    chunk["traceId"] = trace_id
    return jsonify(chunk), 200
