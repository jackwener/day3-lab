"""统一错误处理"""

import uuid
from datetime import datetime, timezone

from flask import jsonify


class APIError(Exception):
    """API 自定义异常"""

    def __init__(self, message, status_code=400, error_code=None, details=None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or _status_to_code(status_code)
        self.details = details or {}


def _status_to_code(status_code):
    """HTTP 状态码 -> 错误码映射"""
    mapping = {
        400: "PARAM_INVALID",
        404: "DATA_NOT_FOUND",
        500: "INTERNAL_ERROR",
        503: "DATA_SOURCE_ERROR",
    }
    return mapping.get(status_code, "INTERNAL_ERROR")


def _error_response(error_code, message, status_code, details=None, trace_id=None):
    """构建统一错误响应"""
    return jsonify({
        "traceId": trace_id or f"req-{uuid.uuid4().hex[:12]}",
        "error": {
            "code": error_code,
            "message": message,
            "details": details or {},
        },
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }), status_code


def register_error_handlers(app):
    """注册全局错误处理器"""

    @app.errorhandler(APIError)
    def handle_api_error(error):
        return _error_response(
            error_code=error.error_code,
            message=error.message,
            status_code=error.status_code,
            details=error.details,
        )

    @app.errorhandler(404)
    def handle_not_found(error):
        return _error_response(
            error_code="DATA_NOT_FOUND",
            message="资源不存在",
            status_code=404,
        )

    @app.errorhandler(400)
    def handle_bad_request(error):
        return _error_response(
            error_code="PARAM_INVALID",
            message="请求参数错误",
            status_code=400,
        )

    @app.errorhandler(500)
    def handle_internal_error(error):
        return _error_response(
            error_code="INTERNAL_ERROR",
            message="服务器内部错误",
            status_code=500,
        )
