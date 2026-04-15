from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from utils.errors import ApiError
from utils.trace import get_trace_id
from services.skill_service import SkillService
from services.ranking_service import RankingService


query_bp = Blueprint("query", __name__, url_prefix="/api/v1/hub")


def _get_skill_service() -> SkillService:
    storage = current_app.extensions["storage"]
    ranking = RankingService(storage)
    return SkillService(storage, ranking)


@query_bp.get("/skills")
def list_skills():
    svc = _get_skill_service()
    q = request.args.get("q", "")
    category = request.args.get("category", "")
    tags = request.args.get("tags", "")
    sort = request.args.get("sort", "hot")
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 12))

    # Validate params
    err = SkillService.validate_list_params(q, category, sort, page, page_size)
    if err:
        code, details = err
        raise ApiError(code=code, status_code=400, details=details)

    items, total = svc.list_skills(
        q=q, category=category, tags=tags,
        sort=sort, page=page, page_size=page_size,
    )
    return jsonify({
        "traceId": get_trace_id(),
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@query_bp.get("/skills/tags")
def get_tags():
    svc = _get_skill_service()
    tags = svc.get_tags()
    return jsonify({"traceId": get_trace_id(), "items": tags})


@query_bp.get("/categories")
def get_categories():
    svc = _get_skill_service()
    cats = svc.get_categories()
    return jsonify({"traceId": get_trace_id(), "items": cats})


@query_bp.get("/skills/<skill_id>")
def get_skill_detail(skill_id: str):
    svc = _get_skill_service()
    detail = svc.get_skill_detail(skill_id)
    if detail is None:
        raise ApiError(code="SKILL_NOT_FOUND", status_code=404)

    detail["traceId"] = get_trace_id()
    return jsonify(detail)
