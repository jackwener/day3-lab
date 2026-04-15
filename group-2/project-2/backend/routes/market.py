"""行情路由 — /api/market"""
from flask import Blueprint, request
from utils.response import success_response
from services import market_service

market_bp = Blueprint("market", __name__)


@market_bp.get("/indices")
def indices():
    data = market_service.get_indices()
    return success_response(data)


@market_bp.get("/funds")
def funds():
    fund_type = request.args.get("fund_type")
    sort_by = request.args.get("sort_by", "day_change")
    order = request.args.get("order", "desc")
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 10))
    data = market_service.get_funds(fund_type, sort_by, order, page, page_size)
    return success_response(data)
