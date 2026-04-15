"""
市场数据路由蓝图
提供金价查询和历史数据接口
"""
from flask import Blueprint

from app.services import market_service
from app.utils.response import success_response, error_response, INVALID_PARAM

market_bp = Blueprint('market_bp', __name__, url_prefix='/api/v1/gold/market')


@market_bp.route('/price', methods=['GET'])
def get_current_price():
    """
    获取当前金价
    
    Returns:
        JSON: { price, currency, updated_at }
    """
    result = market_service.get_current_price()
    return success_response(data=result)


@market_bp.route('/history', methods=['GET'])
def get_price_history():
    """
    获取金价历史数据
    
    Query Params:
        range: 时间范围，可选值 "realtime", "1month", "3month"
    
    Returns:
        JSON: { range, points: [{timestamp, price}] }
    """
    from flask import request
    
    range_type = request.args.get('range', 'realtime')
    
    # 参数校验
    valid_ranges = ['realtime', '1month', '3month']
    if range_type not in valid_ranges:
        return error_response(
            message=f"Invalid range parameter. Must be one of: {', '.join(valid_ranges)}",
            error_code=INVALID_PARAM,
            http_status=400
        )
    
    points = market_service.get_price_history(range_type)
    
    result = {
        "range": range_type,
        "points": points
    }
    
    return success_response(data=result)
