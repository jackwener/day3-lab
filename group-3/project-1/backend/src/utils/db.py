"""MySQL 数据库连接模块"""
import pymysql
from pymysql.cursors import DictCursor
from typing import Optional
from contextlib import contextmanager

# 数据库配置
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "billion",
    "password": "20260301",
    "database": "billion_db",
    "charset": "utf8mb4",
}


def get_connection(
    config: Optional[dict] = None,
) -> pymysql.connections.Connection:
    """获取数据库连接

    Args:
        config: 数据库配置，默认使用 DB_CONFIG

    Returns:
        pymysql 连接对象
    """
    cfg = config or DB_CONFIG
    return pymysql.connect(**cfg, cursorclass=DictCursor)


@contextmanager
def get_cursor(config: Optional[dict] = None):
    """上下文管理器：自动获取游标并在结束时提交/回滚

    Usage:
        with get_cursor() as cursor:
            cursor.execute("SELECT 1")
    """
    conn = get_connection(config)
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
