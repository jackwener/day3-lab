"""基金评级路由"""

from flask import Blueprint, request
from src.api.response import success_response
from src.api.errors import APIError
from src.api.services import fund_rating_service

fund_rating_bp = Blueprint('fund_rating', __name__)

VALID_RATINGS = {'A', 'B', 'C', 'D', 'E'}


@fund_rating_bp.route('/', methods=['GET'])
def get_rating_list():
    """获取评级结果列表（分页）

    ---
    tags:
      - 基金评级
    summary: 获取基金评级列表
    description: 分页获取基金评级结果，可按评级等级筛选
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: 页码
      - name: page_size
        in: query
        type: integer
        default: 20
        description: 每页条数
      - name: rating
        in: query
        type: string
        enum: [A, B, C, D, E]
        description: 评级等级筛选
    responses:
      200:
        description: 成功返回评级列表
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              - fund_code: "000001"
                fund_name: 华夏成长混合
                rating: A
                rating_date: "202501"
                rating_desc: 优秀
                predicted_excess_return: 0.52
                fund_type: 混合型-灵活
                fund_company: 华夏基金
            pagination:
              page: 1
              page_size: 20
              total: 200
              pages: 10
      400:
        description: '无效的评级参数'
        examples:
          application/json:
            error: '无效的评级参数，可选值: A/B/C/D/E'
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    rating = request.args.get('rating', None, type=str)

    if rating and rating.upper() not in VALID_RATINGS:
        raise APIError(f"无效的评级参数，可选值: A/B/C/D/E", 400)

    rows, pagination = fund_rating_service.get_rating_list(rating, page, page_size)
    return success_response(rows, pagination)


@fund_rating_bp.route('/distribution', methods=['GET'])
def get_rating_distribution():
    """获取评级分布统计

    ---
    tags:
      - 基金评级
    summary: 评级分布统计
    description: 获取各评级等级（A/B/C/D/E）的基金数量分布
    responses:
      200:
        description: 成功返回评级分布
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              A: 45
              B: 80
              C: 120
              D: 90
              E: 35
    """
    distribution = fund_rating_service.get_rating_distribution()
    return success_response(distribution)


@fund_rating_bp.route('/<fund_code>', methods=['GET'])
def get_fund_rating(fund_code):
    """获取单只基金评级

    ---
    tags:
      - 基金评级
    summary: 获取单只基金评级
    description: 根据基金代码获取该基金的历史评级记录（可能包含多个月份）
    parameters:
      - name: fund_code
        in: path
        type: string
        required: true
        description: 基金代码，如 "000001"
    responses:
      200:
        description: 成功返回基金历史评级
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              - fund_code: "000001"
                fund_name: 华夏成长混合
                rating_date: "202501"
                rating: A
                rating_desc: 优秀
                predicted_excess_return: 0.52
              - fund_code: "000001"
                rating_date: "202412"
                rating: B
                predicted_excess_return: 0.35
      404:
        description: 基金评级数据不存在
        examples:
          application/json:
            error: '基金 999999 的评级数据不存在'
    """
    ratings = fund_rating_service.get_fund_rating(fund_code)
    if not ratings:
        raise APIError(f"基金 {fund_code} 的评级数据不存在", 404)
    return success_response(ratings)
