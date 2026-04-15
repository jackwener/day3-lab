"""基金路由 — /api/fund"""
from flask import Blueprint, request
from utils.response import success_response, error_response, validate_fund_code
from services import fund_service

fund_bp = Blueprint("fund", __name__)


@fund_bp.get("/diagnosis")
def diagnosis():
    fund_code = request.args.get("fund_code", "").strip()
    valid, err = validate_fund_code(fund_code)
    if not valid:
        return err
    data = fund_service.get_diagnosis(fund_code)
    if not data:
        return error_response(404, "FUND_NOT_FOUND", f"未找到基金 {fund_code}")
    return success_response(data)


@fund_bp.get("/returns")
def returns():
    fund_code = request.args.get("fund_code", "").strip()
    valid, err = validate_fund_code(fund_code)
    if not valid:
        return err
    data = fund_service.get_returns(fund_code)
    if not data:
        return error_response(404, "FUND_NOT_FOUND", f"未找到基金 {fund_code}")
    return success_response(data)


@fund_bp.get("/holdings-news")
def holdings_news():
    fund_code = request.args.get("fund_code", "").strip()
    valid, err = validate_fund_code(fund_code)
    if not valid:
        return err
    data = fund_service.get_holdings_news(fund_code)
    if not data:
        return error_response(404, "FUND_NOT_FOUND", f"未找到基金 {fund_code}")
    return success_response(data)
