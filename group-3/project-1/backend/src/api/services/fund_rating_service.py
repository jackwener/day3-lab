"""基金评级 Service"""

from src.utils.db import get_cursor
from src.api.services import paginate_query


def get_rating_list(rating=None, page=1, page_size=20):
    """获取评级结果列表（分页）"""
    where_clause = ""
    params = ()

    if rating:
        where_clause = "WHERE r.rating = %s"
        params = (rating.upper(),)

    base_sql = (
        f"SELECT r.fund_code, r.rating_date, r.rating, r.rating_desc, "
        f"r.predicted_excess_return, b.fund_name, b.fund_type, b.fund_company "
        f"FROM fund_rating_result r "
        f"LEFT JOIN fund_basic_info b ON r.fund_code = b.fund_code "
        f"{where_clause} "
        f"ORDER BY r.rating_date DESC, r.fund_code"
    )
    count_sql = f"SELECT COUNT(*) FROM fund_rating_result r {where_clause}"

    return paginate_query(base_sql, count_sql, params, page, page_size)


def get_fund_rating(fund_code):
    """获取单只基金的评级信息"""
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT r.fund_code, r.rating_date, r.rating, r.rating_desc, "
            "r.predicted_excess_return, b.fund_name, b.fund_type, b.fund_company "
            "FROM fund_rating_result r "
            "LEFT JOIN fund_basic_info b ON r.fund_code = b.fund_code "
            "WHERE r.fund_code = %s "
            "ORDER BY r.rating_date DESC",
            (fund_code,),
        )
        return cursor.fetchall()


def get_rating_distribution():
    """获取评级分布统计"""
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT rating, COUNT(*) AS count FROM fund_rating_result "
            "GROUP BY rating ORDER BY rating"
        )
        rows = cursor.fetchall()

    return {row['rating']: row['count'] for row in rows}
