"""
统一响应格式工具模块
"""
from flask import jsonify


# 错误码常量
INVALID_PARAM = 40001
LEDGER_NOT_FOUND = 40002
RECORD_NOT_FOUND = 40003
DEFAULT_LEDGER_PROTECTED = 40004
MARKET_API_ERROR = 50001
OCR_SERVICE_ERROR = 50002
INTERNAL_ERROR = 50003


def success_response(data=None, message="success", code=0):
    """
    生成成功响应
    
    Args:
        data: 响应数据
        message: 响应消息
        code: 业务状态码，0表示成功
    
    Returns:
        Flask Response 对象
    """
    response = {
        "code": code,
        "message": message,
        "data": data
    }
    return jsonify(response)


def error_response(message, error_code, http_status=400, error_detail=None):
    """
    生成错误响应
    
    Args:
        message: 错误消息
        error_code: 业务错误码
        http_status: HTTP状态码
        error_detail: 详细错误信息（可选）
    
    Returns:
        Flask Response 对象
    """
    response = {
        "code": error_code,
        "message": message,
        "error": error_detail if error_detail is not None else message
    }
    return jsonify(response), http_status
