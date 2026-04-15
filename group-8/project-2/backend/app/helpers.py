import uuid
from flask import jsonify, request


def make_trace_id() -> str:
    """生成唯一的 trace ID"""
    return "tr_" + uuid.uuid4().hex


def _get_or_create_trace_id() -> str:
    """从请求头获取 trace ID 或创建新的"""
    trace_id = request.headers.get("X-Trace-Id")
    if trace_id:
        return trace_id
    return make_trace_id()


def ok(data: dict, status: int = 200):
    """
    成功响应，注入 traceId
    """
    trace_id = _get_or_create_trace_id()
    response_data = data.copy() if data else {}
    response_data["traceId"] = trace_id
    return jsonify(response_data), status


def err(code: str, message: str, details: dict = None, status: int = 400):
    """
    统一错误响应格式
    """
    trace_id = _get_or_create_trace_id()
    error_data = {
        "error": {
            "code": code,
            "message": message,
            "details": details if details else {},
            "traceId": trace_id
        }
    }
    return jsonify(error_data), status
