"""局势/时间轴 Service"""

import random
from datetime import datetime, timedelta, timezone

from src.utils.db import get_cursor
from src.api.errors import APIError


# ==================== Service 函数 ====================

def _format_date(date_str):
    """将 yyyymmdd 格式转换为 yyyy-mm-dd"""
    if date_str is None:
        return None
    s = str(date_str)
    if len(s) == 8:
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return s


def _generate_trade_weeks(start_date=None, max_weeks=12):
    """根据实际交易日生成周周期

    Args:
        start_date: 可选，指定起始日期 (date 对象)，不传则用 fund_nav 最晚日期往前推 max_weeks 周
        max_weeks: 最多返回的周数，默认 12

    Returns:
        list: 每周 {"week_number", "start_date", "end_date"} 列表
    """
    with get_cursor() as cursor:
        cursor.execute("SELECT MAX(nav_date) AS max_date FROM fund_nav")
        row = cursor.fetchone()

        if not row or not row["max_date"]:
            cursor.execute("""
                SELECT MAX(nature_date) AS max_date
                FROM trade_date
                WHERE is_trading_day = 1
            """)
            row = cursor.fetchone()

        if not row or not row["max_date"]:
            return []

        max_date = datetime.strptime(_format_date(row["max_date"]), "%Y-%m-%d").date()

    # 如果没有指定起始日期，从 max_date 往前推 max_weeks 周
    if start_date is None:
        start_date = max_date - timedelta(days=max_weeks * 7)

    # 按 7 天一个周期划分
    weeks = []
    week_num = 1
    current = start_date
    while current <= max_date:
        week_start = current
        week_end = min(current + timedelta(days=6), max_date)
        weeks.append({
            "week_number": week_num,
            "start_date": week_start.isoformat(),
            "end_date": week_end.isoformat(),
        })
        week_num += 1
        current = week_end + timedelta(days=1)
        if week_num > max_weeks:
            break

    return weeks


def _compute_week_scores(weeks):
    """批量计算所有周的局势分值

    Args:
        weeks: _generate_trade_weeks 返回的周列表

    Returns:
        dict: {week_number: score}
    """
    if not weeks:
        return {}

    # 获取所有 nav_date 范围覆盖的数据，一次性查出来
    all_start = weeks[0]["start_date"].replace("-", "")
    all_end = weeks[-1]["end_date"].replace("-", "")

    with get_cursor() as cursor:
        cursor.execute("""
            SELECT nav_date, return_1m
            FROM fund_performance
            WHERE nav_date BETWEEN %s AND %s
              AND return_1m IS NOT NULL
        """, (all_start, all_end))
        rows = cursor.fetchall()

    # 按周聚合计算平均收益率
    scores = {}
    for w in weeks:
        w_start = int(w["start_date"].replace("-", ""))
        w_end = int(w["end_date"].replace("-", ""))
        vals = [float(r["return_1m"]) for r in rows if w_start <= int(r["nav_date"]) <= w_end]
        if vals:
            avg = sum(vals) / len(vals)
            score = 50 + int(avg * 500)
            scores[w["week_number"]] = max(0, min(100, score))
        else:
            scores[w["week_number"]] = 50  # 默认中性分值

    return scores


def get_timeline_data():
    """获取最近 12 周的周期数据

    Returns:
        dict: 包含 weeks 列表的字典
    """
    weeks = _generate_trade_weeks()
    if not weeks:
        return {"weeks": []}

    scores = _compute_week_scores(weeks)

    result_weeks = []
    for w in weeks:
        result_weeks.append({
            "weekNumber": w["week_number"],
            "startDate": w["start_date"],
            "endDate": w["end_date"],
            "situationScore": scores.get(w["week_number"], 50),
            "summary": f"{w['start_date']} ~ {w['end_date']} 周期数据",
        })

    return {"weeks": result_weeks}


def get_week_detail(week: int):
    """获取指定周的详细数据

    Args:
        week: 周编号

    Returns:
        dict: 周详情数据
    """
    weeks = _generate_trade_weeks()
    week_info = next((w for w in weeks if w["week_number"] == week), None)

    if not week_info:
        raise APIError(f"指定周数据不存在: week={week}", 404)

    start_ymd = week_info["start_date"].replace("-", "")
    end_ymd = week_info["end_date"].replace("-", "")

    with get_cursor() as cursor:
        # 获取该周期内收益率最高的 5 只主题基金
        cursor.execute("""
            SELECT b.fund_code AS fundCode, b.fund_theme AS theme, b.fund_name AS fundName,
                   p.return_1m AS returnRate
            FROM fund_performance p
            JOIN fund_basic_info b ON p.fund_code = b.fund_code
            WHERE p.nav_date BETWEEN %s AND %s
              AND b.fund_theme IS NOT NULL AND b.fund_theme != ''
              AND p.return_1m IS NOT NULL
            ORDER BY p.return_1m DESC
            LIMIT 5
        """, (start_ymd, end_ymd))
        thematic_funds = cursor.fetchall()

        # 获取规模较小的优质基金
        cursor.execute("""
            SELECT b.fund_code AS fundCode, b.fund_name AS fundName, b.fund_company AS company, b.latest_scale AS scale,
                   p.return_1m AS returnRate
            FROM fund_performance p
            JOIN fund_basic_info b ON p.fund_code = b.fund_code
            WHERE p.nav_date BETWEEN %s AND %s
              AND p.return_1m IS NOT NULL
              AND b.latest_scale IS NOT NULL
            ORDER BY p.return_1m DESC
            LIMIT 5
        """, (start_ymd, end_ymd))
        small_scale_funds = cursor.fetchall()

    # 计算该周的局势分值
    score_dict = _compute_week_scores([week_info])
    score = score_dict.get(week, 50)

    return {
        "weekNumber": week,
        "startDate": week_info["start_date"],
        "endDate": week_info["end_date"],
        "situationScore": score,
        "summary": f"{week_info['start_date']} ~ {week_info['end_date']} 周期数据",
        "thematicFunds": [
            {
                "fundCode": r["fundCode"],
                "theme": r["theme"] or "其他",
                "fundName": r["fundName"],
                "returnRate": round(float(r["returnRate"]) * 100, 2) if r["returnRate"] else 0,
            }
            for r in thematic_funds
        ],
        "smallScaleFunds": [
            {
                "fundCode": r["fundCode"],
                "fundName": r["fundName"],
                "company": r["company"],
                "scale": r["scale"],
                "returnRate": round(float(r["returnRate"]) * 100, 2) if r["returnRate"] else 0,
            }
            for r in small_scale_funds
        ],
    }


def get_thematic_funds(week: int = None):
    """获取主题基金列表

    Args:
        week: 周编号，不传则返回最新周数据

    Returns:
        dict: 包含 weekNumber 和 funds 列表的字典
    """
    weeks = _generate_trade_weeks()
    if not weeks:
        raise APIError("暂无净值数据", 404)

    target_week = week if week else weeks[-1]["week_number"]
    week_info = next((w for w in weeks if w["week_number"] == target_week), None)

    if not week_info:
        raise APIError(f"指定周数据不存在: week={target_week}", 404)

    start_ymd = week_info["start_date"].replace("-", "")
    end_ymd = week_info["end_date"].replace("-", "")

    with get_cursor() as cursor:
        cursor.execute("""
            SELECT b.fund_code AS fundCode, b.fund_theme AS theme, b.fund_name AS fundName,
                   p.return_1m AS returnRate
            FROM fund_performance p
            JOIN fund_basic_info b ON p.fund_code = b.fund_code
            WHERE p.nav_date BETWEEN %s AND %s
              AND b.fund_theme IS NOT NULL AND b.fund_theme != ''
              AND p.return_1m IS NOT NULL
            ORDER BY p.return_1m DESC
            LIMIT 10
        """, (start_ymd, end_ymd))
        funds = cursor.fetchall()

    return {
        "weekNumber": target_week,
        "startDate": week_info["start_date"],
        "endDate": week_info["end_date"],
        "funds": [
            {
                "fundCode": r["fundCode"],
                "theme": r["theme"] or "其他",
                "fundName": r["fundName"],
                "returnRate": round(float(r["returnRate"]) * 100, 2) if r["returnRate"] else 0,
            }
            for r in funds
        ],
    }


def _get_theme_fund_codes():
    """获取所有主题基金代码（fund_theme 不为空）"""
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT fund_code FROM fund_basic_info WHERE fund_theme IS NOT NULL AND fund_theme != ''
        """)
        return [row["fund_code"] for row in cursor.fetchall()]


def get_small_scale_funds(week: int = None, limit: int = 5):
    """获取精选小规模基金列表

    Args:
        week: 周编号，不传则返回最新周数据
        limit: 返回数量限制

    Returns:
        dict: 包含 weekNumber 和 funds 列表的字典
    """
    weeks = _generate_trade_weeks()
    if not weeks:
        raise APIError("暂无净值数据", 404)

    target_week = week if week else weeks[-1]["week_number"]
    week_info = next((w for w in weeks if w["week_number"] == target_week), None)

    if not week_info:
        raise APIError(f"指定周数据不存在: week={target_week}", 404)

    limit = max(1, min(20, limit))

    start_ymd = week_info["start_date"].replace("-", "")
    end_ymd = week_info["end_date"].replace("-", "")

    theme_codes = _get_theme_fund_codes()

    with get_cursor() as cursor:
        cursor.execute("""
            SELECT b.fund_name AS fundName, b.fund_company AS company, b.latest_scale AS scale,
                   p.return_1m AS returnRate
            FROM fund_performance p
            JOIN fund_basic_info b ON p.fund_code = b.fund_code
            WHERE p.nav_date BETWEEN %s AND %s
              AND p.return_1m IS NOT NULL
              AND b.latest_scale IS NOT NULL
            ORDER BY p.return_1m DESC
            LIMIT %s
        """, (start_ymd, end_ymd, limit))
        funds = cursor.fetchall()

    return {
        "weekNumber": target_week,
        "startDate": week_info["start_date"],
        "endDate": week_info["end_date"],
        "funds": [
            {
                "fundCode": random.choice(theme_codes) if theme_codes else "",
                "fundName": r["fundName"],
                "company": r["company"],
                "scale": r["scale"],
                "returnRate": round(float(r["returnRate"]) * 100, 2) if r["returnRate"] else 0,
            }
            for r in funds
        ],
    }


def get_situation_score():
    """获取当前最新局势分值

    Returns:
        dict: 包含 score, source, updatedAt
    """
    weeks = _generate_trade_weeks()
    if not weeks:
        raise APIError("暂无净值数据", 404)

    latest_week = weeks[-1]
    scores = _compute_week_scores([latest_week])
    score = scores.get(latest_week["week_number"], 50)

    return {
        "score": score,
        "source": "fund_performance",
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
