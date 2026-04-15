"""资讯路由 — /api/insights"""
from flask import Blueprint, request
from utils.response import success_response
from services import insights_service

insights_bp = Blueprint("insights", __name__)


@insights_bp.get("/articles")
def articles():
    category = request.args.get("category")
    tag = request.args.get("tag")
    keyword = request.args.get("keyword")
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 10))
    data = insights_service.get_articles(category, tag, keyword, page, page_size)
    return success_response(data)
