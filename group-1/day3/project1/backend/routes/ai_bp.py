"""AI blueprint for LLM-powered endpoints (draft generation, smart search)."""

import uuid
from flask import Blueprint, request, jsonify

from utils.trace import generate_trace_id
from utils.errors import api_error, ErrorCode
from utils.rate_limiter import rate_limit_by_visitor
from services.llm_service import get_llm_service
from storage.json_storage import get_storage


# Create blueprint
ai_bp = Blueprint('ai', __name__)


def get_or_create_visitor_id() -> tuple[str, bool]:
    """Get visitor ID from cookie or create new one."""
    visitor_id = request.cookies.get('hub_visitor')
    was_created = False
    
    if not visitor_id:
        visitor_id = f"v_{uuid.uuid4().hex}"
        was_created = True
    
    return visitor_id, was_created


def set_visitor_cookie(response, visitor_id: str) -> None:
    """Set visitor cookie on response."""
    response.set_cookie(
        'hub_visitor',
        visitor_id,
        max_age=365 * 24 * 60 * 60,  # 1 year
        httponly=True,
        samesite='Lax'
    )


# ==================== Draft Generation Endpoint ====================

@ai_bp.route('/skills/draft', methods=['POST'])
@rate_limit_by_visitor(max_calls=1, period=5)  # 1 call per 5 seconds
def generate_draft():
    """
    AI生成技能草稿
    ---
    tags:
      - AI
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            intent:
              type: string
              description: 意图描述
            category:
              type: string
              description: 分类
    responses:
      200:
        description: 生成成功
      400:
        description: 参数错误
      429:
        description: 请求过于频繁
    """
    trace_id = generate_trace_id()
    visitor_id, was_created = get_or_create_visitor_id()
    
    # Validate request body
    data = request.get_json(silent=True) or {}
    intent = data.get('intent', '')
    category = data.get('category')
    
    # Validate intent
    if not intent:
        return api_error(
            ErrorCode.EMPTY_FIELD,
            message="Intent is required",
            details={"field": "intent"},
            trace_id=trace_id
        )
    
    if len(intent) < 10 or len(intent) > 200:
        return api_error(
            ErrorCode.INVALID_QUERY,
            message="Intent must be between 10 and 200 characters",
            details={"field": "intent", "max": 200},
            trace_id=trace_id
        )
    
    # Validate category if provided
    if category:
        from models.skill import is_valid_category
        if not is_valid_category(category):
            return api_error(
                ErrorCode.INVALID_CATEGORY,
                details={"field": "category"},
                trace_id=trace_id
            )
    
    # Generate draft using LLM
    service = get_llm_service()
    result = service.generate_draft(intent, category)
    
    response_data = {
        "traceId": trace_id,
        "skill_md_draft": result["skill_md_draft"],
        "fallback": result["fallback"],
        "upstream_latency_ms": result["upstream_latency_ms"]
    }
    
    response = jsonify(response_data)
    if was_created:
        set_visitor_cookie(response, visitor_id)
    
    return response, 200


# ==================== Smart Search Endpoint ====================

@ai_bp.route('/skills/smart-search', methods=['POST'])
def smart_search():
    """
    AI智能搜索
    ---
    tags:
      - AI
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            query:
              type: string
              description: 搜索关键词
            limit:
              type: integer
              default: 10
              description: 返回数量
    responses:
      200:
        description: 搜索成功
      400:
        description: 参数错误
    """
    trace_id = generate_trace_id()
    
    # Validate request body
    data = request.get_json(silent=True) or {}
    query = data.get('query', '')
    limit = data.get('limit', 10)
    
    # Validate query
    if not query:
        return api_error(
            ErrorCode.EMPTY_FIELD,
            message="Query is required",
            details={"field": "query"},
            trace_id=trace_id
        )
    
    if len(query) < 1 or len(query) > 200:
        return api_error(
            ErrorCode.INVALID_QUERY,
            message="Query must be between 1 and 200 characters",
            details={"field": "query", "max": 200},
            trace_id=trace_id
        )
    
    # Validate limit
    if not isinstance(limit, int) or limit < 5 or limit > 20:
        limit = 10
    
    # Get all skills for search
    storage = get_storage()
    skills, _ = storage.list_skills(page=1, page_size=1000)
    
    # Perform smart search
    service = get_llm_service()
    result = service.smart_search(query, skills, limit)
    
    # Convert items to SkillSummary format
    items = []
    for item in result["items"]:
        items.append({
            "skill_id": item.get("skill_id"),
            "name": item.get("name"),
            "description": item.get("description"),
            "category": item.get("category"),
            "tags": item.get("tags", []),
            "rating_avg": round(item.get("rating_avg", 0), 2),
            "rating_count": item.get("rating_count", 0),
            "view_count": item.get("view_count", 0),
            "download_count": item.get("download_count", 0),
            "like_count": item.get("like_count", 0),
            "favorite_count": item.get("favorite_count", 0),
            "hot_score": item.get("hot_score", 0),
            "has_bundle": item.get("has_bundle", False),
            "updated_at": item.get("updated_at", ""),
            "match_reason": item.get("match_reason", "")
        })
    
    response_data = {
        "traceId": trace_id,
        "items": items,
        "keywords": result["keywords"],
        "fallback": result["fallback"],
        "upstream_latency_ms": result["upstream_latency_ms"]
    }
    
    return jsonify(response_data), 200
