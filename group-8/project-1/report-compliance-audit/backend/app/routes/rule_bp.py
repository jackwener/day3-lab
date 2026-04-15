# -*- coding: utf-8 -*-
"""规则路由"""

from flask import Blueprint, request
from datetime import datetime
from app.utils.response import success_response
from app.utils.validators import SEVERITY_LEVELS, ISSUE_CATEGORIES
from app.services import rule_service

rule_bp = Blueprint('rules', __name__, url_prefix='/api/v1/rules')


@rule_bp.route('', methods=['GET'])
def list_rules():
    """
    获取规则列表
    ---
    tags:
      - Rules
    parameters:
      - name: category
        in: query
        type: string
        enum: [compliance, content]
        description: 类别筛选
      - name: enabled
        in: query
        type: boolean
        description: 启用状态筛选
    produces:
      - application/json
    responses:
      200:
        description: 成功返回规则列表
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                rules:
                  type: array
                  items:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      category:
                        type: string
                      severity:
                        type: string
                      mode:
                        type: array
                        items:
                          type: string
                      description:
                        type: string
                      example:
                        type: string
                      enabled:
                        type: boolean
    """
    category = request.args.get('category')
    enabled = request.args.get('enabled')
    
    # 转换 enabled 参数
    if enabled is not None:
        enabled = enabled.lower() == 'true'
    
    rules = rule_service.get_rules(category=category, enabled=enabled)
    
    return success_response({
        'rules': [rule.to_dict() for rule in rules]
    }), 200


@rule_bp.route('/<rule_id>', methods=['PATCH'])
def update_rule(rule_id):
    """
    更新规则状态
    ---
    tags:
      - Rules
    parameters:
      - name: rule_id
        in: path
        type: string
        required: true
        description: 规则ID
    consumes:
      - application/json
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            enabled:
              type: boolean
              required: true
    produces:
      - application/json
    responses:
      200:
        description: 成功更新规则
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                id:
                  type: string
                name:
                  type: string
                enabled:
                  type: boolean
                updatedAt:
                  type: string
      404:
        description: 规则不存在
    """
    data = request.get_json()
    
    if not data or 'enabled' not in data:
        from app.utils.errors import ValidationError
        raise ValidationError("缺少enabled参数")
    
    enabled = data['enabled']
    if not isinstance(enabled, bool):
        from app.utils.errors import ValidationError
        raise ValidationError("enabled参数必须为布尔值")
    
    rule = rule_service.update_rule(rule_id, enabled)
    
    return success_response({
        'id': rule.id,
        'name': rule.name,
        'enabled': rule.enabled,
        'updatedAt': datetime.utcnow().isoformat() + '+08:00'
    }), 200
