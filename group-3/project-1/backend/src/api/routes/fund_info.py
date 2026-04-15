"""基金基本信息路由"""

from flask import Blueprint, request
from src.api.response import success_response
from src.api.errors import APIError
from src.api.services import fund_info_service

fund_info_bp = Blueprint('fund_info', __name__)


@fund_info_bp.route('/', methods=['GET'])
def get_fund_list():
    """获取基金列表（分页）

    支持按基金类型筛选，返回分页数据。

    ---
    tags:
      - 基金信息
    summary: 获取基金列表
    description: 分页获取基金基本信息列表，可按基金类型筛选
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
      - name: fund_type
        in: query
        type: string
        description: '基金类型筛选，如 "混合型-灵活"、"股票型"'
    responses:
      200:
        description: 成功返回基金列表
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              - fund_code: "000001"
                fund_name: 华夏成长混合
                fund_type: 混合型-灵活
                fund_company: 华夏基金
                fund_manager: XXX
              - fund_code: "000006"
                fund_name: 西部利得量化成长混合A
                fund_type: 混合型-偏股
            pagination:
              page: 1
              page_size: 20
              total: 100
              pages: 5
    """
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)
    fund_type = request.args.get('fund_type', None, type=str)

    rows, pagination = fund_info_service.get_fund_list(page, page_size, fund_type)
    return success_response(rows, pagination)


@fund_info_bp.route('/search', methods=['GET'])
def search_funds():
    """基金搜索（代码或名称模糊匹配）

    ---
    tags:
      - 基金信息
    summary: 搜索基金
    description: 根据关键词模糊匹配基金代码或基金名称
    parameters:
      - name: q
        in: query
        type: string
        required: true
        description: 搜索关键词（基金代码或名称）
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
    responses:
      200:
        description: 成功返回搜索结果
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              - fund_code: "000001"
                fund_name: 华夏成长混合
            pagination:
              page: 1
              page_size: 20
              total: 5
              pages: 1
      400:
        description: 搜索关键词为空
        examples:
          application/json:
            traceId: req-xxx
            error: '搜索关键词 q 不能为空'
    """
    keyword = request.args.get('q', '', type=str).strip()
    if not keyword:
        raise APIError("搜索关键词 q 不能为空", 400)

    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('page_size', 20, type=int)

    rows, pagination = fund_info_service.search_funds(keyword, page, page_size)
    return success_response(rows, pagination)


@fund_info_bp.route('/<fund_code>', methods=['GET'])
def get_fund_detail(fund_code):
    """获取单只基金详情

    ---
    tags:
      - 基金信息
    summary: 获取基金详情
    description: 根据基金代码获取基金完整信息
    parameters:
      - name: fund_code
        in: path
        type: string
        required: true
        description: 基金代码，如 "000001"
    responses:
      200:
        description: 成功返回基金详情
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              fund_code: "000001"
              fund_name: 华夏成长混合
              fund_full_name: 华夏成长混合证券投资基金
              fund_type: 混合型-灵活
              fund_company: 华夏基金
              fund_manager: XXX
              establish_date: "20010918"
              latest_scale: "10.5亿"
              custodian_bank: 中国建设银行
              fund_theme: 成长
      404:
        description: 基金不存在
        examples:
          application/json:
            traceId: req-xxx
            error: '基金 999999 不存在'
    """
    fund = fund_info_service.get_fund_detail(fund_code)
    if fund is None:
        raise APIError(f"基金 {fund_code} 不存在", 404)
    return success_response(fund)
