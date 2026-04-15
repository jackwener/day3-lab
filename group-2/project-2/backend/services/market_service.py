"""行情服务 — 真实大盘指数 + 基金排行列表"""
from providers.akshare_provider import get_market_indices, get_fund_rank_list


def get_indices():
    """获取大盘指数（东财实时数据）"""
    return get_market_indices()


def get_funds(fund_type=None, sort_by="day_change", order="desc", page=1, page_size=10):
    """获取基金列表（akshare 排行数据）"""
    data = get_fund_rank_list(page=1, page_size=200)  # 拿多一点用于筛选
    funds = data.get("list", [])

    # 类型筛选
    if fund_type and fund_type != "全部":
        funds = [f for f in funds if f.get("fund_type") == fund_type]

    # 排序
    reverse = order == "desc"
    if sort_by in ("day_change", "week_change", "month_change", "year_change", "nav"):
        funds.sort(key=lambda f: f.get(sort_by, 0), reverse=reverse)

    # 分页
    total = len(funds)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "list": funds[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
    }
