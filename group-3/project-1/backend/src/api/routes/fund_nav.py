"""基金历史净值路由"""

from flask import Blueprint, request
from src.api.response import success_response
from src.api.errors import APIError
from src.api.services import fund_nav_service

fund_nav_bp = Blueprint('fund_nav', __name__)


VALID_PERIODS = {'1m', '3m', '6m', '1y'}

PERIOD_DAYS = {
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 365,
}


@fund_nav_bp.route('/<fund_code>/nav', methods=['GET'])
def get_fund_nav(fund_code):
    """获取基金历史净值趋势

    ---
    tags:
      - 基金净值
    summary: 获取基金历史净值
    description: 根据基金代码和时间范围获取基金历史净值数据
    parameters:
      - name: fund_code
        in: path
        type: string
        required: true
        description: 基金代码，如 "000001"
      - name: period
        in: query
        type: string
        enum: [1m, 3m, 6m, 1y]
        default: 3m
        description: 时间范围（1m=近1月, 3m=近3月, 6m=近6月, 1y=近1年）
    responses:
      200:
        description: 成功返回净值数据
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              fundCode: "000001"
              fundName: 华夏成长混合
              period: 3m
              navData:
                - date: "2024-10-01"
                  accumulatedNav: 1.2345
                  dailyGrowth: 0.0012
                - date: "2024-10-02"
                  accumulatedNav: 1.2380
                  dailyGrowth: 0.0028
      400:
        description: period 参数无效
        examples:
          application/json:
            error: 'period 参数无效，可选值: 1m, 3m, 6m, 1y'
      404:
        description: 基金不存在或无净值数据
        examples:
          application/json:
            error: 基金代码不存在或无净值数据
    """
    period = request.args.get('period', '3m', type=str)
    if period not in VALID_PERIODS:
        raise APIError(
            f"period 参数无效，可选值: {', '.join(sorted(VALID_PERIODS))}",
            400,
            error_code="PARAM_INVALID",
            details={"period": period},
        )

    result = fund_nav_service.get_fund_nav(fund_code, period)
    if result is None:
        raise APIError(
            "基金代码不存在或无净值数据",
            404,
            error_code="DATA_NOT_FOUND",
            details={"fundCode": fund_code},
        )
    return success_response(result)
