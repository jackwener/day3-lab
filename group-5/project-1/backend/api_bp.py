"""
API 路由蓝图 — 对齐 Spec 09 端点总览（11 个端点）
对齐 Spec 08 §2 Route 层：参数校验、HTTP 状态码、traceId
"""

from flask import Blueprint, request, jsonify, g, current_app

api_bp = Blueprint("api", __name__)


# ==================== 辅助函数 ====================

def ok(data, status=200):
    """统一成功响应（对齐 Spec 09 §2）"""
    data["traceId"] = g.trace_id
    return jsonify(data), status


def error(code, message, status=400, details=None):
    """统一错误响应（对齐 Spec 09 §2）"""
    return jsonify({
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "traceId": g.trace_id,
        }
    }), status


# ==================== 1. GET /capabilities — 能力探测 ====================

@api_bp.route("/capabilities", methods=["GET"])
def get_capabilities():
    """对齐 Spec 09 §3"""
    from llm_manager import llm_manager
    caps = llm_manager.get_capabilities()
    return ok(caps)


# ==================== 2-4. 会话管理 ====================

@api_bp.route("/sessions", methods=["GET"])
def list_sessions():
    """对齐 Spec 09 §4"""
    from storage import storage
    sessions = storage.list_sessions()
    return ok({"sessions": sessions})


@api_bp.route("/sessions", methods=["POST"])
def create_session():
    """对齐 Spec 09 §5"""
    from storage import storage
    body = request.get_json(silent=True) or {}
    title = body.get("title", "新会话")
    session = storage.create_session(title)
    return ok(session, 201)


@api_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    """对齐 Spec 09 §6"""
    from storage import storage
    result = storage.delete_session(session_id)
    if result is None:
        return error("SESSION_NOT_FOUND", "会话不存在", 404, {"session_id": session_id})
    return ok(result)


# ==================== 5. 问答记录 ====================

@api_bp.route("/sessions/<session_id>/records", methods=["GET"])
def get_records(session_id):
    """对齐 Spec 09 §7"""
    from storage import storage
    if not storage.get_session(session_id):
        return error("SESSION_NOT_FOUND", "会话不存在", 404, {"session_id": session_id})
    records = storage.list_records(session_id)
    return ok({"records": records})


@api_bp.route("/sessions/<session_id>/files", methods=["GET"])
def get_session_files(session_id):
    """查询会话关联的文件列表"""
    from storage import storage
    if not storage.get_session(session_id):
        return error("SESSION_NOT_FOUND", "会话不存在", 404, {"session_id": session_id})
    files = storage.list_files_by_session(session_id)
    return ok({"files": files})


@api_bp.route("/sessions/<session_id>/analyze", methods=["GET"])
def get_session_analyze(session_id):
    """查询会话最新的深度分析结果"""
    from storage import storage
    if not storage.get_session(session_id):
        return error("SESSION_NOT_FOUND", "会话不存在", 404, {"session_id": session_id})
    from skill_client import skill_client
    result = skill_client.get_analysis_by_session(session_id)
    return ok({"analyze": result})


# ==================== 6-7. 文件上传与解析 ====================

@api_bp.route("/files/upload", methods=["POST"])
def upload_file():
    """对齐 Spec 09 §8"""
    from storage import storage
    session_id = request.form.get("session_id")
    if not session_id or not storage.get_session(session_id):
        return error("SESSION_NOT_FOUND", "会话不存在", 404)

    if "file" not in request.files:
        return error("EMPTY_FILE", "请选择文件")

    file = request.files["file"]
    # 文件类型校验
    allowed = {"pdf", "doc", "docx"}
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        return error("FILE_TYPE_INVALID", "不支持的文件类型", 400, {"allowed_types": list(allowed)})

    result = storage.save_file(session_id, file, current_app.config["UPLOAD_FOLDER"])

    # 上传成功后自动触发后台解析（对齐 Spec 10 §7）
    import threading
    def _auto_parse(fid, fpath, ftype):
        from pdf_parser import pdf_parser
        def _progress(pct):
            storage.update_file_status(fid, "parsing", progress=pct)
        storage.update_file_status(fid, "parsing", progress=0)
        parse_result = pdf_parser.parse(fpath, ftype, progress_callback=_progress)
        if parse_result and "error" not in parse_result:
            storage.update_file_status(fid, "done", progress=100, result=parse_result)
        else:
            storage.update_file_status(fid, "failed", progress=0, result=parse_result)

    file_record = storage.get_file(result["file_id"])
    if file_record:
        threading.Thread(
            target=_auto_parse,
            args=(result["file_id"], file_record["file_path"], file_record["file_type"]),
            daemon=True,
        ).start()

    return ok(result, 201)


@api_bp.route("/files/<file_id>/status", methods=["GET"])
def get_file_status(file_id):
    """对齐 Spec 09 §9"""
    from storage import storage
    status = storage.get_file_status(file_id)
    if status is None:
        return error("FILE_NOT_FOUND", "文件不存在", 404)
    return ok(status)


# ==================== 8. 问答提交 ====================

@api_bp.route("/ask", methods=["POST"])
def ask():
    """对齐 Spec 09 §10"""
    body = request.get_json(silent=True) or {}
    query = body.get("query", "").strip()
    session_id = body.get("session_id")
    file_id = body.get("file_id")
    provider = body.get("provider")

    # 参数校验（对齐 Spec 09 §14）
    if not query:
        return error("EMPTY_QUERY", "请输入问题")
    if len(query) > 500:
        return error("INVALID_QUERY", "问题过长，最多500字符", 400, {"max_length": 500})
    if not session_id:
        return error("INVALID_QUERY", "session_id 不能为空")

    from storage import storage
    if not storage.get_session(session_id):
        return error("SESSION_NOT_FOUND", "会话不存在", 404, {"session_id": session_id})

    # 调用 Agent 编排
    from report_agent import report_agent
    try:
        file_content = None
        if file_id:
            file_info = storage.get_file_status(file_id)
            if file_info and file_info.get("parse_result"):
                file_content = str(file_info["parse_result"])

        result = report_agent.ask(query, session_id, file_content, provider)

        # 保存问答记录
        storage.add_record(session_id, file_id, query, result)

        return ok(result)
    except Exception as e:
        return error("UPSTREAM_ERROR", str(e), 500)


# ==================== 9. 模型列表 ====================

@api_bp.route("/llm/providers", methods=["GET"])
def list_providers():
    """对齐 Spec 09 §11"""
    from llm_manager import llm_manager
    data = llm_manager.list_providers()
    return ok(data)


# ==================== 10-11. 深度分析 ====================

@api_bp.route("/analyze", methods=["POST"])
def trigger_analyze():
    """对齐 Spec 09 §12"""
    body = request.get_json(silent=True) or {}
    session_id = body.get("session_id")
    file_id = body.get("file_id")

    if not session_id or not file_id:
        return error("INVALID_QUERY", "session_id 和 file_id 不能为空")

    from skill_client import skill_client
    result = skill_client.trigger_analysis(session_id, file_id)
    return ok(result, 202)


@api_bp.route("/analyze/<analyze_id>/status", methods=["GET"])
def get_analyze_status(analyze_id):
    """对齐 Spec 09 §13"""
    from skill_client import skill_client
    result = skill_client.get_analysis_status(analyze_id)
    if result is None:
        return error("ANALYZE_NOT_FOUND", "分析任务不存在", 404)
    return ok(result)
