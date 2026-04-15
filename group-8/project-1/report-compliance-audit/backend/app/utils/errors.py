# -*- coding: utf-8 -*-
"""错误处理机制"""

from flask import jsonify


class ErrorCodes:
    """错误码常量定义"""
    INVALID_REQUEST = "INVALID_REQUEST"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    UNSUPPORTED_FILE_TYPE = "UNSUPPORTED_FILE_TYPE"
    REVIEW_NOT_FOUND = "REVIEW_NOT_FOUND"
    RULE_NOT_FOUND = "RULE_NOT_FOUND"
    REVIEW_IN_PROGRESS = "REVIEW_IN_PROGRESS"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE"


class APIError(Exception):
    """API错误基类"""
    
    def __init__(self, code, message, status_code=400, details=None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(APIError):
    """参数校验错误"""
    
    def __init__(self, message, details=None):
        super().__init__(ErrorCodes.INVALID_REQUEST, message, 400, details)


class NotFoundError(APIError):
    """资源不存在错误"""
    
    def __init__(self, resource_type, resource_id):
        message = f"{resource_type}不存在"
        if resource_type == "审核记录":
            code = ErrorCodes.REVIEW_NOT_FOUND
        elif resource_type == "规则":
            code = ErrorCodes.RULE_NOT_FOUND
        else:
            code = ErrorCodes.INVALID_REQUEST
        super().__init__(code, message, 404, {"id": resource_id})


class FileError(APIError):
    """文件相关错误"""
    
    def __init__(self, code, message, details=None):
        super().__init__(code, message, 400, details)


def register_error_handlers(app):
    """注册全局错误处理器"""
    
    from app.utils.response import error_response
    
    @app.errorhandler(APIError)
    def handle_api_error(error):
        response = error_response(
            code=error.code,
            message=error.message,
            details=error.details
        )
        return jsonify(response), error.status_code
    
    @app.errorhandler(400)
    def handle_bad_request(error):
        response = error_response(
            code=ErrorCodes.INVALID_REQUEST,
            message=str(error.description) if hasattr(error, 'description') else "请求参数错误"
        )
        return jsonify(response), 400
    
    @app.errorhandler(404)
    def handle_not_found(error):
        response = error_response(
            code=ErrorCodes.INVALID_REQUEST,
            message="请求的资源不存在"
        )
        return jsonify(response), 404
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        response = error_response(
            code=ErrorCodes.INTERNAL_ERROR,
            message="服务器内部错误"
        )
        return jsonify(response), 500
