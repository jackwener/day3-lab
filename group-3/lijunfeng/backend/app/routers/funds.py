"""
基金路由
GET /api/funds/thematic
GET /api/funds/small-scale
GET /api/funds/{fundCode}/nav
"""
from datetime import datetime, timezone
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Request, Path, Query

from app import storage

router = APIRouter()


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


@router.get("/funds/thematic")
async def get_thematic_funds(
    request: Request,
    week: Optional[int] = Query(None, ge=1, description="周编号，不传返回最新周")
):
    """
    获取主题基金列表
    
    Args:
        week: 周编号（可选，不传返回最新周）
        
    Returns:
        {
            "traceId": "string",
            "data": {
                "weekNumber": 1,
                "funds": [
                    {"theme": "原油", "fundName": "南方原油A", "returnRate": 5.2},
                    ...
                ]
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        # 确定目标周
        target_week = week if week is not None else storage.get_latest_week()
        
        # 获取该周的主题基金
        funds = storage.get_thematic_funds_by_week(target_week)
        
        # 简化响应数据
        simplified_funds = [
            {
                "theme": f["theme"],
                "fundName": f["fundName"],
                "returnRate": f["returnRate"]
            }
            for f in funds
        ]
        
        return _success_response(trace_id, {
            "weekNumber": target_week,
            "funds": simplified_funds
        })
        
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)


@router.get("/funds/small-scale")
async def get_small_scale_funds(
    request: Request,
    week: Optional[int] = Query(None, ge=1, description="周编号，不传返回最新周"),
    limit: int = Query(5, ge=1, le=20, description="返回数量限制，默认 5，范围 1-20")
):
    """
    获取小规模基金列表
    
    Args:
        week: 周编号（可选，不传返回最新周）
        limit: 返回数量限制（默认 5，范围 1-20）
        
    Returns:
        {
            "traceId": "string",
            "data": {
                "weekNumber": 1,
                "funds": [
                    {"fundName": "...", "company": "...", "scale": 4.5, "returnRate": 6.8},
                    ...
                ]
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        # 确定目标周
        target_week = week if week is not None else storage.get_latest_week()
        
        # 获取该周的小规模基金
        funds = storage.get_small_scale_funds_by_week(target_week, limit)
        
        # 简化响应数据
        simplified_funds = [
            {
                "fundName": f["fundName"],
                "company": f["company"],
                "scale": f["scale"],
                "returnRate": f["returnRate"]
            }
            for f in funds
        ]
        
        return _success_response(trace_id, {
            "weekNumber": target_week,
            "funds": simplified_funds
        })
        
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)


@router.get("/funds/{fundCode}/nav")
async def get_fund_nav(
    request: Request,
    fundCode: str = Path(..., description="基金代码"),
    period: Literal["1m", "3m", "6m", "1y"] = Query("3m", description="时间段: 1m/3m/6m/1y，默认 3m")
):
    """
    获取基金净值数据
    
    Args:
        fundCode: 基金代码
        period: 时间段（1m/3m/6m/1y，默认 3m）
        
    Returns:
        {
            "traceId": "string",
            "data": {
                "fundCode": "501018",
                "fundName": "南方原油A",
                "period": "3m",
                "navData": [
                    {"date": "2026-01-15", "accumulatedNav": 1.5234, "dailyGrowth": 0.52},
                    ...
                ]
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        # 获取基金名称
        fund_name = storage.get_fund_name_by_code(fundCode)
        if not fund_name:
            raise _error_response(trace_id, "DATA_NOT_FOUND", f"基金代码 {fundCode} 不存在", 404)
        
        # 获取净值数据
        nav_data = storage.get_fund_nav_by_code_and_period(fundCode, period)
        
        if not nav_data:
            raise _error_response(trace_id, "DATA_NOT_FOUND", f"基金 {fundCode} 净值数据不存在", 404)
        
        # 转换数据格式
        formatted_nav = [
            {
                "date": n["navDate"],
                "accumulatedNav": n["accumulatedNav"],
                "dailyGrowth": n.get("dailyGrowth")
            }
            for n in nav_data
        ]
        
        return _success_response(trace_id, {
            "fundCode": fundCode,
            "fundName": fund_name,
            "period": period,
            "navData": formatted_nav
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)
