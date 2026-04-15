# -*- coding: utf-8 -*-
"""仪表盘路由"""

from flask import Blueprint
from app.utils.response import success_response
from app.services import review_service

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/v1/dashboard')


@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    获取仪表盘统计数据
    ---
    tags:
      - Dashboard
    produces:
      - application/json
    responses:
      200:
        description: 成功返回统计数据
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                totalReviews:
                  type: integer
                passRate:
                  type: number
                avgScore:
                  type: number
                avgDuration:
                  type: string
                todayCount:
                  type: integer
                pendingCount:
                  type: integer
                complianceIssuesTotal:
                  type: integer
                contentIssuesTotal:
                  type: integer
    """
    stats = review_service.get_dashboard_stats()
    return success_response(stats), 200


@dashboard_bp.route('/trend', methods=['GET'])
def get_trend():
    """
    获取近7日审核趋势
    ---
    tags:
      - Dashboard
    produces:
      - application/json
    responses:
      200:
        description: 成功返回趋势数据
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                trend:
                  type: array
                  items:
                    type: object
                    properties:
                      day:
                        type: string
                      total:
                        type: integer
                      passed:
                        type: integer
                      failed:
                        type: integer
    """
    trend = review_service.get_trend_data()
    return success_response({'trend': trend}), 200


@dashboard_bp.route('/top-issues', methods=['GET'])
def get_top_issues():
    """
    获取常见问题TOP5
    ---
    tags:
      - Dashboard
    produces:
      - application/json
    responses:
      200:
        description: 成功返回常见问题统计
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                issues:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      count:
                        type: integer
                      pct:
                        type: integer
    """
    issues = review_service.get_top_issues()
    return success_response({'issues': issues}), 200
