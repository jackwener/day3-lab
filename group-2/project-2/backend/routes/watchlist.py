"""自选基金路由 — /api/watchlist"""
from flask import Blueprint, request
from utils.response import success_response, error_response, validate_fund_code
from services import watchlist_service

watchlist_bp = Blueprint("watchlist", __name__)


@watchlist_bp.get("/")
def get_watchlist():
    data = watchlist_service.get_watchlist()
    return success_response(data)


@watchlist_bp.post("/")
def add_watchlist():
    body = request.get_json(silent=True) or {}
    fund_code = (body.get("fund_code") or "").strip()
    valid, err = validate_fund_code(fund_code)
    if not valid:
        return err

    item, error_msg = watchlist_service.add_to_watchlist(fund_code)
    if error_msg:
        return error_response(409, "DUPLICATE_WATCHLIST", error_msg)
    return success_response(item, 201)


@watchlist_bp.delete("/<fund_code>")
def remove_watchlist(fund_code):
    valid, err = validate_fund_code(fund_code)
    if not valid:
        return err

    removed = watchlist_service.remove_from_watchlist(fund_code)
    if not removed:
        return error_response(404, "NOT_IN_WATCHLIST", f"自选列表中未找到 {fund_code}")
    return success_response({"fund_code": fund_code, "removed": True})
