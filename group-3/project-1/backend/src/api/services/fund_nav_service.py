"""基金历史净值 Service"""

from src.utils.db import get_cursor

PERIOD_DAYS = {
    '1m': 30,
    '3m': 90,
    '6m': 180,
    '1y': 365,
}


def get_fund_nav(fund_code, period='3m'):
    """获取基金历史净值趋势

    Args:
        fund_code: 基金代码
        period: 时间范围 1m/3m/6m/1y

    Returns:
        dict with fundCode, fundName, period, navData or None if not found
    """
    days = PERIOD_DAYS[period]

    with get_cursor() as cursor:
        # 获取基金名称
        cursor.execute(
            "SELECT fund_name FROM fund_basic_info WHERE fund_code = %s",
            (fund_code,),
        )
        fund_row = cursor.fetchone()
        if fund_row is None:
            return None

        # 获取历史净值（按日期升序）
        cursor.execute(
            """
            SELECT nav_date, accumulated_nav, daily_growth
            FROM fund_nav
            WHERE fund_code = %s
              AND nav_date >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL %s DAY), '%%Y%%m%%d')
            ORDER BY nav_date ASC
            """,
            (fund_code, days),
        )
        nav_rows = cursor.fetchall()

    if not nav_rows:
        return None

    nav_data = []
    for row in nav_rows:
        entry = {
            "date": _format_date(row["nav_date"]),
            "accumulatedNav": float(row["accumulated_nav"]) if row["accumulated_nav"] is not None else None,
            "dailyGrowth": float(row["daily_growth"]) if row["daily_growth"] is not None else None,
        }
        nav_data.append(entry)

    return {
        "fundCode": fund_code,
        "fundName": fund_row["fund_name"],
        "period": period,
        "navData": nav_data,
    }


def _format_date(date_str):
    """将 yyyymmdd 格式转换为 yyyy-mm-dd"""
    if date_str is None:
        return None
    s = str(date_str)
    if len(s) == 8:
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    return s
