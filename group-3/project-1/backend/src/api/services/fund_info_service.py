"""基金基本信息 Service"""

from src.utils.db import get_cursor
from src.api.services import paginate_query


def get_fund_list(page=1, page_size=20, fund_type=None):
    """获取基金列表（分页）"""
    where_clause = ""
    params = ()

    if fund_type:
        where_clause = "WHERE fund_type = %s"
        params = (fund_type,)

    base_sql = f"SELECT * FROM fund_basic_info {where_clause} ORDER BY fund_code"
    count_sql = f"SELECT COUNT(*) FROM fund_basic_info {where_clause}"

    return paginate_query(base_sql, count_sql, params, page, page_size)


def get_fund_detail(fund_code):
    """获取单只基金详情"""
    with get_cursor() as cursor:
        cursor.execute("SELECT * FROM fund_basic_info WHERE fund_code = %s", (fund_code,))
        return cursor.fetchone()


def search_funds(keyword, page=1, page_size=20):
    """基金搜索（代码或名称模糊匹配）"""
    like_param = f"%{keyword}%"
    params = (like_param, like_param)

    where_clause = "WHERE fund_code LIKE %s OR fund_name LIKE %s"
    base_sql = f"SELECT * FROM fund_basic_info {where_clause} ORDER BY fund_code"
    count_sql = f"SELECT COUNT(*) FROM fund_basic_info {where_clause}"

    return paginate_query(base_sql, count_sql, params, page, page_size)
