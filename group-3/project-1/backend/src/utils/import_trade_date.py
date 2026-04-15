"""解析 data/trade_date.csv 并保存到 MySQL trade_date 表

Usage:
    python src/utils/import_trade_date.py
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import pandas as pd
from src.utils.db import get_cursor

CSV_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', 'data', 'trade_date.csv'
)

_INSERT_SQL = """
INSERT INTO trade_date (nature_date, trade_date, is_trading_day, trade_date_before)
VALUES (%(nature_date)s, %(trade_date)s, %(is_trading_day)s, %(trade_date_before)s)
ON DUPLICATE KEY UPDATE
    trade_date=VALUES(trade_date),
    is_trading_day=VALUES(is_trading_day),
    trade_date_before=VALUES(trade_date_before)
"""


def load_trade_date_csv(path: str = CSV_PATH) -> list:
    """读取 trade_date.csv，返回字典列表"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"文件不存在: {path}")

    df = pd.read_csv(path, dtype=str, encoding='utf-8-sig')
    # 确保必要列存在
    required = {'nature_date', 'trade_date', 'is_trading_day', 'trade_date_before'}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV 缺少列: {missing}")

    return df.to_dict(orient='records')


def save_to_db(rows: list, batch_size: int = 1000) -> int:
    """批量写入数据库，返回总影响行数"""
    total_affected = 0
    with get_cursor() as cursor:
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            cursor.executemany(_INSERT_SQL, batch)
            total_affected += cursor.rowcount
            print(f"已写入 {min(i + batch_size, len(rows))}/{len(rows)} 条")
    return total_affected


def main() -> None:
    print(f"读取文件: {os.path.abspath(CSV_PATH)}")
    rows = load_trade_date_csv()
    print(f"共 {len(rows)} 条记录，开始写入数据库...")
    affected = save_to_db(rows)
    print(f"完成，影响 {affected} 行")


if __name__ == "__main__":
    main()
