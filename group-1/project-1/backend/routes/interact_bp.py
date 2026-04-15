"""Interaction blueprint for like, favorite, and rating endpoints."""

import uuid
from flask import Blueprint, request, jsonify, current_app

from utils.trace import generate_trace_id
from utils.errors import api_error, ErrorCode


# Create blueprint
interact_bp = Blueprint('interact', __name__)


def get_or_create_visitor_id() -> tuple[str, bool]:
    """Get visitor ID from cookie or create new one.
    
    Returns:
        tuple: (visitor_id, was_created)
    """
    visitor_id = request.cookies.get('hub_visitor')
    was_created = False
    
    if not visitor_id:
        visitor_id = f"v_{uuid.uuid4().hex}"
        was_created = True
    
    return visitor_id, was_created


def set_visitor_cookie(response, visitor_id: str) -> None:
    """Set visitor cookie on response.
    
    Args:
        response: Flask response object
        visitor_id: Visitor ID to set
    """
    response.set_cookie(
        'hub_visitor',
        visitor_id,
        max_age=365 * 24 * 60 * 60,  # 1 year
        httponly=True,
        samesite='Lax'
    )


# ==================== Like Endpoints ====================

@interact_bp.route('/skills/<skill_id>/like', methods=['POST'])
def like_skill(skill_id: str):
    """
    点赞技能
    ---
    tags:
      - Interact
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
    responses:
      200:
        description: 点赞成功
      404:
        description: 技能不存在
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Check skill exists
    storage = current_app.extensions["storage"]
    if not storage.get_skill(skill_id):
        return api_error(ErrorCode.SKILL_NOT_FOUND, trace_id=trace_id)
    
    # Like the skill
    service = current_app.extensions["interaction_service"]
    result = service.like_skill(skill_id, visitor_id)
    
    response_data = {
        "traceId": trace_id,
        "skill_id": skill_id,
        "liked": result["liked"],
        "like_count": result["like_count"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


@interact_bp.route('/skills/<skill_id>/like', methods=['DELETE'])
def unlike_skill(skill_id: str):
    """
    取消点赞
    ---
    tags:
      - Interact
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
    responses:
      200:
        description: 取消点赞成功
      404:
        description: 技能不存在
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Check skill exists
    storage = current_app.extensions["storage"]
    if not storage.get_skill(skill_id):
        return api_error(ErrorCode.SKILL_NOT_FOUND, trace_id=trace_id)
    
    # Unlike the skill
    service = current_app.extensions["interaction_service"]
    result = service.unlike_skill(skill_id, visitor_id)
    
    response_data = {
        "traceId": trace_id,
        "skill_id": skill_id,
        "liked": result["liked"],
        "like_count": result["like_count"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


# ==================== Favorite Endpoints ====================

@interact_bp.route('/skills/<skill_id>/favorite', methods=['POST'])
def favorite_skill(skill_id: str):
    """
    收藏技能
    ---
    tags:
      - Interact
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
    responses:
      200:
        description: 收藏成功
      404:
        description: 技能不存在
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Check skill exists
    storage = current_app.extensions["storage"]
    if not storage.get_skill(skill_id):
        return api_error(ErrorCode.SKILL_NOT_FOUND, trace_id=trace_id)
    
    # Favorite the skill
    service = current_app.extensions["interaction_service"]
    result = service.favorite_skill(skill_id, visitor_id)
    
    response_data = {
        "traceId": trace_id,
        "skill_id": skill_id,
        "favorited": result["favorited"],
        "favorite_count": result["favorite_count"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


@interact_bp.route('/skills/<skill_id>/favorite', methods=['DELETE'])
def unfavorite_skill(skill_id: str):
    """
    取消收藏
    ---
    tags:
      - Interact
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
    responses:
      200:
        description: 取消收藏成功
      404:
        description: 技能不存在
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Check skill exists
    storage = current_app.extensions["storage"]
    if not storage.get_skill(skill_id):
        return api_error(ErrorCode.SKILL_NOT_FOUND, trace_id=trace_id)
    
    # Unfavorite the skill
    service = current_app.extensions["interaction_service"]
    result = service.unfavorite_skill(skill_id, visitor_id)
    
    response_data = {
        "traceId": trace_id,
        "skill_id": skill_id,
        "favorited": result["favorited"],
        "favorite_count": result["favorite_count"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


# ==================== Rating Endpoint ====================

@interact_bp.route('/skills/<skill_id>/rate', methods=['POST'])
def rate_skill(skill_id: str):
    """
    评分技能
    ---
    tags:
      - Interact
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            score:
              type: integer
              minimum: 1
              maximum: 5
              description: 评分(1-5)
    responses:
      200:
        description: 评分成功
      400:
        description: 评分无效
      404:
        description: 技能不存在
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Check skill exists
    storage = current_app.extensions["storage"]
    if not storage.get_skill(skill_id):
        return api_error(ErrorCode.SKILL_NOT_FOUND, trace_id=trace_id)
    
    # Validate request body
    data = request.get_json(silent=True) or {}
    score = data.get('score')
    
    # Validate score
    if score is None:
        return api_error(
            ErrorCode.INVALID_RATING,
            message="Rating score is required",
            details={"field": "score"},
            trace_id=trace_id
        )
    
    if not isinstance(score, int) or score < 1 or score > 5:
        return api_error(
            ErrorCode.INVALID_RATING,
            details={"field": "score"},
            trace_id=trace_id
        )
    
    # Rate the skill
    service = current_app.extensions["interaction_service"]
    result = service.rate_skill(skill_id, visitor_id, score)
    
    response_data = {
        "traceId": trace_id,
        "skill_id": skill_id,
        "rating_avg": result["rating_avg"],
        "rating_count": result["rating_count"],
        "my_score": result["my_score"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


# ==================== Visitor Favorites Endpoint ====================

@interact_bp.route('/me/favorites', methods=['GET'])
def get_my_favorites():
    """
    获取我的收藏
    ---
    tags:
      - Interact
    responses:
      200:
        description: 收藏列表
    """
    trace_id = generate_trace_id()
    visitor_id = request.cookies.get('hub_visitor')
    
    if not visitor_id:
        # No visitor ID, return empty list
        return jsonify({
            "traceId": trace_id,
            "items": [],
            "total": 0
        }), 200
    
    # Get favorites
    service = current_app.extensions["interaction_service"]
    favorites = service.get_visitor_favorites(visitor_id)
    
    # Convert to SkillSummary format
    items = []
    for skill in favorites:
        items.append({
            "skill_id": skill.get("skill_id"),
            "name": skill.get("name"),
            "description": skill.get("description"),
            "category": skill.get("category"),
            "tags": skill.get("tags", []),
            "rating_avg": round(skill.get("rating_avg", 0), 2),
            "rating_count": skill.get("rating_count", 0),
            "view_count": skill.get("view_count", 0),
            "download_count": skill.get("download_count", 0),
            "like_count": skill.get("like_count", 0),
            "favorite_count": skill.get("favorite_count", 0),
            "hot_score": skill.get("hot_score", 0),
            "has_bundle": skill.get("has_bundle", False),
            "updated_at": skill.get("updated_at", "")
        })
    
    return jsonify({
        "traceId": trace_id,
        "items": items,
        "total": len(items)
    }), 200
