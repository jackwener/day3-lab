# -*- coding: utf-8 -*-
"""统一响应封装"""

import uuid


def generate_trace_id():
    """生成追踪ID"""
    return f"tr_{uuid.uuid4().hex[:12]}"


def success_response(data, trace_id=None):
    """成功响应封装"""
    return {
        "traceId": trace_id or generate_trace_id(),
        "data": data
    }


def error_response(code, message, details=None, trace_id=None):
    """错误响应封装"""
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "traceId": trace_id or generate_trace_id()
        }
    }


def paginated_response(items, total, page, page_size, trace_id=None):
    """分页响应封装"""
    return {
        "traceId": trace_id or generate_trace_id(),
        "data": {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "list": items
        }
    }
