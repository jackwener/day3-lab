"""统一响应格式 + 自定义 JSON 序列化"""

import decimal
import datetime
import uuid
from flask import jsonify
from flask.json.provider import DefaultJSONProvider


class CustomJSONProvider(DefaultJSONProvider):
    """自定义 JSON 序列化，处理 Decimal/datetime/numpy 等类型"""

    ensure_ascii = False  # 关闭 ASCII 转义，浏览器直接显示中文

    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return obj.isoformat()
        # numpy 类型处理
        try:
            import numpy as np
            if isinstance(obj, (np.integer,)):
                return int(obj)
            if isinstance(obj, (np.floating,)):
                return float(obj)
            if isinstance(obj, np.ndarray):
                return obj.tolist()
        except ImportError:
            pass
        return super().default(obj)


def _make_trace_id():
    return f"req-{uuid.uuid4().hex[:12]}"


def _now_timestamp():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def success_response(data, pagination=None):
    """构建统一成功响应

    支持两种格式：
    - 新规范（含 traceId/timestamp）：data 直接作为内层 data 字段
    - 旧格式（含 code/message）：向后兼容
    """
    if isinstance(data, dict) and "traceId" in data:
        # 已包含 traceId 的新规范格式
        result = data
    else:
        result = {
            "traceId": _make_trace_id(),
            "data": data,
            "timestamp": _now_timestamp(),
        }

    if pagination is not None:
        result["pagination"] = pagination
    return jsonify(result)
