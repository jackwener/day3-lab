"""局势/时间轴路由"""

import uuid
from datetime import datetime, timezone

from flask import Blueprint, request

from src.api.response import success_response
from src.api.errors import APIError
from src.api.services import situation_service

situation_bp = Blueprint('situation', __name__)


def _make_response(data):
    """构建符合 API 规格的响应"""
    return {
        "traceId": f"req-{uuid.uuid4().hex[:12]}",
        "data": data,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


@situation_bp.route('/timeline', methods=['GET'])
def get_timeline():
    """获取局势时间轴数据

    ---
    tags:
      - 局势分析
    summary: 获取局势时间轴
    description: 获取最近 12 周的周期数据，包含每周的局势分值
    responses:
      200:
        description: 成功返回时间轴数据
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              weeks:
                - weekNumber: 1
                  startDate: "2024-10-01"
                  endDate: "2024-10-07"
                  situationScore: 62
                  summary: "2024-10-01 ~ 2024-10-07 周期数据"
    """
    data = situation_service.get_timeline_data()
    return success_response(_make_response(data))


@situation_bp.route('/timeline/<int:week>', methods=['GET'])
def get_week_detail(week):
    """获取指定周详细数据

    ---
    tags:
      - 局势分析
    summary: 获取指定周详情
    description: 获取指定周的详细数据，包含主题基金和小规模基金列表
    parameters:
      - name: week
        in: path
        type: integer
        required: true
        description: 周编号（>=1），对应时间轴中的 weekNumber
    responses:
      200:
        description: 成功返回周详情
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              weekNumber: 1
              startDate: "2024-10-01"
              endDate: "2024-10-07"
              situationScore: 62
              thematicFunds:
                - fundCode: "000216"
                  theme: 黄金
                  fundName: 华安黄金ETF联接A
                  returnRate: 2.35
              smallScaleFunds:
                - fundCode: "001234"
                  fundName: 西部利得量化成长混合A
                  company: 西部利得基金
                  scale: 2.5亿
                  returnRate: 1.89
      404:
        description: 指定周数据不存在
        examples:
          application/json:
            error: '指定周数据不存在: week=999'
    """
    if week < 1:
        raise APIError("week 参数必须 >= 1", 400)
    data = situation_service.get_week_detail(week)
    return success_response(_make_response(data))


@situation_bp.route('/funds/thematic', methods=['GET'])
def get_thematic_funds():
    """获取主题基金列表

    返回指定周内收益率最高的主题基金。

    ---
    tags:
      - 局势分析
    summary: 获取主题基金列表
    description: 获取指定周（默认最新周）内收益率最高的主题基金，基金具有 fund_theme 标签
    parameters:
      - name: week
        in: query
        type: integer
        description: 周编号（>=1），不传则返回最新周数据
    responses:
      200:
        description: 成功返回主题基金列表
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              weekNumber: 12
              startDate: "2025-01-01"
              endDate: "2025-01-07"
              funds:
                - fundCode: "000216"
                  theme: 黄金
                  fundName: 华安黄金ETF联接A
                  returnRate: 2.35
                - theme: 电力
                  fundName: 电力ETF华宝
                  returnRate: 1.89
      404:
        description: 暂无净值数据或指定周不存在
    """
    week = request.args.get('week', None, type=int)
    if week is not None and week < 1:
        raise APIError("week 参数必须 >= 1", 400)
    data = situation_service.get_thematic_funds(week)
    return success_response(_make_response(data))


@situation_bp.route('/funds/small-scale', methods=['GET'])
def get_small_scale_funds():
    """获取精选小规模基金列表

    ---
    tags:
      - 局势分析
    summary: 获取小规模优质基金
    description: 获取指定周（默认最新周）内收益率较高且规模较小的优质基金
    parameters:
      - name: week
        in: query
        type: integer
        description: 周编号（>=1），不传则返回最新周数据
      - name: limit
        in: query
        type: integer
        default: 5
        minimum: 1
        maximum: 20
        description: 返回数量限制（1-20）
    responses:
      200:
        description: 成功返回小规模基金列表
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              weekNumber: 12
              startDate: "2025-01-01"
              endDate: "2025-01-07"
              funds:
                - fundName: 西部利得量化成长混合A
                  company: 西部利得基金
                  scale: 2.5亿
                  returnRate: 1.89
      400:
        description: 参数校验失败
        examples:
          application/json:
            error: limit 参数必须在 1-20 之间
      404:
        description: 暂无净值数据或指定周不存在
    """
    week = request.args.get('week', None, type=int)
    limit = request.args.get('limit', 5, type=int)
    if week is not None and week < 1:
        raise APIError("week 参数必须 >= 1", 400)
    if limit is not None and (limit < 1 or limit > 20):
        raise APIError("limit 参数必须在 1-20 之间", 400)
    data = situation_service.get_small_scale_funds(week, limit)
    return success_response(_make_response(data))


@situation_bp.route('/situation/score', methods=['GET'])
def get_situation_score():
    """获取当前局势分值

    ---
    tags:
      - 局势分析
    summary: 获取当前局势分值
    description: 获取最新一周的局势评分（0-100分），分值越高表示市场越好
    responses:
      200:
        description: 成功返回局势分值
        examples:
          application/json:
            traceId: req-a1b2c3d4e5f6
            data:
              score: 62
              source: fund_performance
              updatedAt: "2025-01-07T12:00:00Z"
      404:
        description: 暂无净值数据
    """
    data = situation_service.get_situation_score()
    return success_response(_make_response(data))
