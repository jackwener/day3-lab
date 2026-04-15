"""Service 层公共辅助函数"""

from src.utils.db import get_cursor


def paginate_query(base_sql, count_sql, params=None, page=1, page_size=20):
    """通用分页查询

    Args:
        base_sql: 查询 SQL（不含 LIMIT）
        count_sql: 计数 SQL（SELECT COUNT(*)...）
        params: SQL 参数元组
        page: 页码，从 1 开始
        page_size: 每页条数

    Returns:
        (rows, pagination_dict)
    """
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    offset = (page - 1) * page_size

    with get_cursor() as cursor:
        # 查询总数
        cursor.execute(count_sql, params)
        total = cursor.fetchone()['COUNT(*)']

        # 查询当前页数据
        paginated_sql = f"{base_sql} LIMIT %s, %s"
        query_params = (*params, offset, page_size) if params else (offset, page_size)
        cursor.execute(paginated_sql, query_params)
        rows = cursor.fetchall()

    pagination = {
        "page": page,
        "page_size": page_size,
        "total": total,
    }
    return rows, pagination
