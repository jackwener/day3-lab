"""Error handling utilities for API responses."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from flask import jsonify, Response
from utils.trace import generate_trace_id


class ErrorCode(Enum):
    """Enumeration of all error codes used in the API."""
    EMPTY_FIELD = "EMPTY_FIELD"
    INVALID_CATEGORY = "INVALID_CATEGORY"
    INVALID_TAG = "INVALID_TAG"
    INVALID_QUERY = "INVALID_QUERY"
    INVALID_RATING = "INVALID_RATING"
    INVALID_PAGE = "INVALID_PAGE"
    MISSING_SKILL_MD = "MISSING_SKILL_MD"
    BUNDLE_LIMIT_EXCEEDED = "BUNDLE_LIMIT_EXCEEDED"
    UNSAFE_ZIP = "UNSAFE_ZIP"
    SKILL_NOT_FOUND = "SKILL_NOT_FOUND"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    RATE_LIMITED = "RATE_LIMITED"
    UPSTREAM_ERROR = "UPSTREAM_ERROR"


# HTTP status code mapping for each error code
ERROR_STATUS_MAP = {
    ErrorCode.EMPTY_FIELD: 400,
    ErrorCode.INVALID_CATEGORY: 400,
    ErrorCode.INVALID_TAG: 400,
    ErrorCode.INVALID_QUERY: 400,
    ErrorCode.INVALID_RATING: 400,
    ErrorCode.INVALID_PAGE: 400,
    ErrorCode.MISSING_SKILL_MD: 400,
    ErrorCode.BUNDLE_LIMIT_EXCEEDED: 400,
    ErrorCode.UNSAFE_ZIP: 400,
    ErrorCode.SKILL_NOT_FOUND: 404,
    ErrorCode.FILE_TOO_LARGE: 413,
    ErrorCode.RATE_LIMITED: 429,
    ErrorCode.UPSTREAM_ERROR: 500,
}

# Default error messages for each error code (Chinese)
ERROR_MESSAGES = {
    ErrorCode.EMPTY_FIELD: "必填字段不能为空",
    ErrorCode.INVALID_CATEGORY: "分类不在白名单中",
    ErrorCode.INVALID_TAG: "标签格式不合法",
    ErrorCode.INVALID_QUERY: "请求参数不合法",
    ErrorCode.INVALID_RATING: "评分必须是1-5之间的整数",
    ErrorCode.INVALID_PAGE: "分页参数不合法",
    ErrorCode.MISSING_SKILL_MD: "压缩包根目录缺少 skill.md",
    ErrorCode.BUNDLE_LIMIT_EXCEEDED: "压缩包解压后超出限制",
    ErrorCode.UNSAFE_ZIP: "压缩包包含不安全路径",
    ErrorCode.SKILL_NOT_FOUND: "技能不存在",
    ErrorCode.FILE_TOO_LARGE: "上传文件超过 10MB",
    ErrorCode.RATE_LIMITED: "请求过于频繁",
    ErrorCode.UPSTREAM_ERROR: "服务器内部错误",
}


class ApiError(Exception):
    """API error exception class."""
    
    def __init__(
        self,
        code: str | ErrorCode,
        status_code: int,
        message: str | None = None,
        details: dict | None = None,
    ):
        """Initialize API error.
        
        Args:
            code: Error code (string or ErrorCode enum)
            status_code: HTTP status code
            message: Error message (optional)
            details: Additional error details (optional)
        """
        if isinstance(code, ErrorCode):
            self.code = code.value
            self._error_code = code
        else:
            self.code = code
            self._error_code = None
        
        self.status_code = status_code
        
        if message is None and self._error_code:
            self.message = ERROR_MESSAGES.get(self._error_code, "请求失败")
        else:
            self.message = message or "请求失败"
        
        self.details = details or {}
        super().__init__(self.message)
    
    def to_response(self, trace_id: str) -> tuple[Response, int]:
        """Convert to Flask JSON response.
        
        Args:
            trace_id: Request trace ID
        
        Returns:
            tuple: (Flask response, status code)
        """
        payload = {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
                "traceId": trace_id,
            }
        }
        response = jsonify(payload)
        response.status_code = self.status_code
        return response


class ValidationError(ApiError):
    """Validation error exception."""
    
    def __init__(self, code: str | ErrorCode, details: dict | None = None, status_code: int = 400):
        """Initialize validation error.
        
        Args:
            code: Error code
            details: Additional error details
            status_code: HTTP status code (default 400)
        """
        super().__init__(code=code, status_code=status_code, details=details or {})


def api_error(
    code: str | ErrorCode,
    status_code: int | None = None,
    message: Optional[str] = None,
    details: Optional[dict[str, Any]] = None,
    trace_id: Optional[str] = None
) -> tuple[Response, int]:
    """Generate a standardized API error response.
    
    Args:
        code: Error code (string or ErrorCode enum)
        status_code: HTTP status code (optional, inferred from code if not provided)
        message: Custom error message (optional)
        details: Additional error details dict (optional)
        trace_id: Trace ID for request tracking (optional)
    
    Returns:
        tuple: (Flask JSON response, HTTP status code)
    """
    if trace_id is None:
        trace_id = generate_trace_id()
    
    # Handle ErrorCode enum
    if isinstance(code, ErrorCode):
        error_code = code
        code_value = code.value
    else:
        error_code = None
        code_value = code
    
    # Get message
    if message is None:
        if error_code:
            message = ERROR_MESSAGES.get(error_code, "Unknown error")
        else:
            message = ERROR_MESSAGES.get(ErrorCode.UPSTREAM_ERROR, "Unknown error")
    
    if details is None:
        details = {}
    
    # Get status code
    if status_code is None:
        if error_code:
            status_code = ERROR_STATUS_MAP.get(error_code, 500)
        else:
            status_code = 500
    
    response = {
        "error": {
            "code": code_value,
            "message": message,
            "details": details,
            "traceId": trace_id
        }
    }
    
    return jsonify(response), status_code


def api_success(data: dict[str, Any], trace_id: Optional[str] = None) -> tuple[Response, int]:
    """Generate a standardized API success response.
    
    Args:
        data: Response data dict
        trace_id: Trace ID for request tracking (optional)
    
    Returns:
        tuple: (Flask JSON response, HTTP status code)
    """
    if trace_id is None:
        trace_id = generate_trace_id()
    
    response = {"traceId": trace_id}
    response.update(data)
    
    return jsonify(response), 200


def api_created(data: dict[str, Any], trace_id: Optional[str] = None) -> tuple[Response, int]:
    """Generate a standardized API created response.
    
    Args:
        data: Response data dict
        trace_id: Trace ID for request tracking (optional)
    
    Returns:
        tuple: (Flask JSON response, HTTP status code 201)
    """
    if trace_id is None:
        trace_id = generate_trace_id()
    
    response = {"traceId": trace_id}
    response.update(data)
    
    return jsonify(response), 201
