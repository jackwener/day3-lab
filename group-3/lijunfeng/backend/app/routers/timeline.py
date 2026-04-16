"""
时间线路由
GET /api/timeline
GET /api/timeline/{week}
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request, Path

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


@router.get("/timeline")
async def get_timeline_list(request: Request):
    """
    获取所有周节点列表
    
    Returns:
        {
            "traceId": "string",
            "data": {
                "weeks": [WeekNode, ...]
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        weeks = storage.get_all_timeline()
        return _success_response(trace_id, {"weeks": weeks})
    except FileNotFoundError:
        raise _error_response(trace_id, "DATA_NOT_FOUND", "时间线数据不存在", 404)
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)


@router.get("/timeline/{week}")
async def get_timeline_detail(
    request: Request,
    week: int = Path(..., ge=1, description="周编号，必须 >= 1")
):
    """
    获取指定周的完整数据，包含主题基金和小规模基金
    
    Args:
        week: 周编号
        
    Returns:
        {
            "traceId": "string",
            "data": {
                "weekNumber": 1,
                "startDate": "2026-03-01",
                "endDate": "2026-03-07",
                "situationScore": 65,
                "summary": "...",
                "thematicFunds": [...],
                "smallScaleFunds": [...]
            },
            "timestamp": "ISO8601"
        }
    """
    trace_id = getattr(request.state, 'trace_id', 'unknown')
    
    try:
        # 获取周节点数据
        week_data = storage.get_timeline_by_week(week)
        if not week_data:
            raise _error_response(trace_id, "DATA_NOT_FOUND", f"第 {week} 周数据不存在", 404)
        
        # 获取该周的主题基金
        thematic_funds = storage.get_thematic_funds_by_week(week)
        
        # 获取该周的小规模基金
        small_scale_funds = storage.get_small_scale_funds_by_week(week)
        
        # 构建完整响应
        response_data = {
            "weekNumber": week_data["weekNumber"],
            "startDate": week_data["startDate"],
            "endDate": week_data["endDate"],
            "situationScore": week_data["situationScore"],
            "summary": week_data["summary"],
            "thematicFunds": thematic_funds,
            "smallScaleFunds": small_scale_funds
        }
        
        return _success_response(trace_id, response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise _error_response(trace_id, "INTERNAL_ERROR", f"服务器内部错误: {str(e)}", 500)
