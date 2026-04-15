"""统一响应格式工具 — 对齐 Spec-09 §2"""
from flask import g, jsonify


def success_response(data, status=200):
    """成功响应"""
    return jsonify({
        "code": 0,
        "message": "success",
        "data": data,
        "traceId": getattr(g, "trace_id", "tr_unknown"),
    }), status


def error_response(http_status, error_code, message, details=None):
    """错误响应"""
    return jsonify({
        "code": -1,
        "error": {
            "code": error_code,
            "message": message,
            "details": details or {},
            "traceId": getattr(g, "trace_id", "tr_unknown"),
        }
    }), http_status


import re

FUND_CODE_PATTERN = re.compile(r"^\d{6}$")


def validate_fund_code(fund_code):
    """校验基金代码，返回 (is_valid, error_response_or_None)"""
    if not fund_code:
        return False, error_response(400, "INVALID_FUND_CODE", "基金代码不能为空", {"pattern": r"^\d{6}$"})
    if not FUND_CODE_PATTERN.match(fund_code):
        return False, error_response(400, "INVALID_FUND_CODE", "基金代码格式不正确", {"pattern": r"^\d{6}$"})
    return True, None
