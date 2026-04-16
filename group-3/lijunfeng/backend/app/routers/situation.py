"""
局势路由
GET /api/situation/score
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request

from app import storage

router = APIRouter()


def assess_risk_level(portfolio: dict) -> str:
    """
    风险等级判定函数

    根据投资组合数据评估风险等级。

    Args:
        portfolio: 投资组合数据（字典），应包含:
            - stock_ratio (float): 股票占比，取值 0-100
            - keywords (list[str], optional): 投资策略关键词列表

    Returns:
        str: 风险等级 ("低风险" / "中风险" / "高风险")
    """
    # 规则1: 如果包含 "杠杆"、"期货"、"期权" → 直接高风险
    high_risk_keywords = {"杠杆", "期货", "期权"}
    keywords = portfolio.get("keywords", [])
    for kw in keywords:
        if kw in high_risk_keywords:
            return "高风险"

    # 规则2: 根据股票占比判定
    stock_ratio = portfolio.get("stock_ratio", 0)

    if stock_ratio > 70:
        return "高风险"
    elif stock_ratio >= 30:
        return "中风险"
    else:
        return "低风险"


def _get_timestamp() -> str:
    """获取当前 ISO8601 时间戳"""
    return datetime.now(timezone.utc).isoformat()


def _success_response(trace_id: str, data: dict) -> dict:
    """构建成功响应"""
    return {
        "traceId": trace_id,
        "data": data,
        "timestamp": _get_timestamp()
    }


def _error_response(trace_id: str, code: str, message: str, status_code: int = 400) -> HTTPException:
    """构建错误响应"""
    return HTTPException(
        status_code=status_code,
        detail={
            "traceId": trace_id,
            "error": {
                "code": code,
                "message": message,
                "details": {}
            },
            "timestamp": _get_timestamp()
        }
    )


@router.get("/situation/score")
async def get_situation_score(request: Request):
    """
    获取当前局势分值
    
    Returns:
        {
            "traceId": "string",
            "data": {
                "score": 65,
                "source": "Polymarket",
                "updatedAt": "2026-04-15T08:00:00Z"
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        situation = storage.get_situation_data()
        
        return _success_response(trace_id, {
            "score": situation["score"],
            "source": situation["source"],
            "updatedAt": situation["updatedAt"]
        })
        
    except FileNotFoundError:
        raise _error_response(trace_id, "DATA_NOT_FOUND", "局势数据不存在", 404)
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)
