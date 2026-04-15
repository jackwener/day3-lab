"""基金服务 — 诊断、收益、持仓资讯（真实数据版）"""
from providers.akshare_provider import get_fund_info, get_fund_nav, get_fund_returns, get_fund_holdings
from repositories.mock_data import HOLDINGS_NEWS_DB, DEFAULT_HOLDINGS_NEWS


def _calc_scores(returns: dict) -> dict:
    """基于真实收益率计算诊断评分（简易算法）"""
    y1 = returns.get("year_1", 0)
    m3 = returns.get("month_3", 0)
    m6 = returns.get("month_6", 0)

    # 收益能力：年化收益映射到0-100
    ret_score = min(100, max(0, int(50 + y1 * 1.5)))
    # 风控：波动越小越好，用6月vs3月一致性估算
    if m6 != 0:
        consistency = min(1, abs(m3 * 2 / m6)) if m6 != 0 else 0.5
    else:
        consistency = 0.5
    risk_score = min(100, max(0, int(consistency * 80 + 10)))
    # 稳定性
    stability = min(100, max(0, int(50 + m3 * 1.2)))
    # 择时
    timing = min(100, max(0, int(40 + returns.get("month_1", 0) * 3)))
    # 选股
    stock_picking = min(100, max(0, int(ret_score * 0.6 + stability * 0.4)))

    return {
        "returns": ret_score,
        "risk_control": risk_score,
        "stability": stability,
        "timing": timing,
        "stock_picking": stock_picking,
    }


def _calc_rating(scores: dict) -> tuple:
    """基于评分计算评级"""
    avg = sum(scores.values()) / len(scores) if scores else 50
    if avg >= 80:
        return 5, "优秀"
    elif avg >= 65:
        return 4, "良好"
    elif avg >= 50:
        return 3, "一般"
    elif avg >= 35:
        return 2, "较差"
    else:
        return 1, "差"


def get_diagnosis(fund_code):
    """基金诊断 — 从 akshare 获取真实数据"""
    info = get_fund_info(fund_code)
    if not info:
        return None

    nav_data = get_fund_nav(fund_code) or {"nav": 0, "nav_change": 0}
    returns = get_fund_returns(fund_code) or {}
    scores = _calc_scores(returns)
    rating, rating_label = _calc_rating(scores)

    return {
        "fund_code": info["fund_code"],
        "fund_name": info["fund_name"],
        "fund_type": info["fund_type"],
        "manager": info["manager"],
        "company": info["company"],
        "scale": info["scale"],
        "nav": nav_data["nav"],
        "nav_change": nav_data["nav_change"],
        "rating": rating,
        "rating_label": rating_label,
        "scores": scores,
    }


def get_returns(fund_code):
    """收益+持仓+建议 — 从 akshare 获取真实数据"""
    info = get_fund_info(fund_code)
    if not info:
        return None

    returns = get_fund_returns(fund_code) or {
        "month_1": 0, "month_3": 0, "month_6": 0,
        "year_1": 0, "year_3": 0, "since_inception": 0,
    }
    holdings = get_fund_holdings(fund_code)
    scores = _calc_scores(returns)

    # 动态生成建议
    suggestions = []
    if scores["returns"] >= 70:
        suggestions.append("该基金收益能力较强，适合中长期持有")
    else:
        suggestions.append("该基金近期收益表现一般，建议观察后续走势")
    if scores["risk_control"] < 60:
        suggestions.append("风控能力偏弱，建议控制仓位比例")
    if scores["timing"] < 50:
        suggestions.append("择时能力一般，建议采用定投方式降低择时风险")
    suggestions.append("投资有风险，以上仅为数据参考，不构成投资建议")

    rating, rating_label = _calc_rating(scores)
    conclusion = f"该基金综合评级为{rating_label}（{rating}星），收益能力评分{scores['returns']}，风控评分{scores['risk_control']}。"

    return {
        "fund_code": fund_code,
        "fund_name": info["fund_name"],
        "returns": returns,
        "holdings": holdings,
        "advice": {
            "conclusion": conclusion,
            "suggestions": suggestions,
        },
    }


def get_holdings_news(fund_code):
    """持仓股资讯 — 目前仍用 Mock（无免费资讯 API）"""
    info = get_fund_info(fund_code)
    if not info:
        return None
    news = HOLDINGS_NEWS_DB.get(fund_code, DEFAULT_HOLDINGS_NEWS)
    return {
        "fund_code": fund_code,
        "fund_name": info["fund_name"],
        "news": news,
    }
