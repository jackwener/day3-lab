"""获取基金净值数据并保存到 MySQL

Usage:
    # 增量模式（默认）：只处理 fund_nav 中没有数据的基金
    python src/fetch_data/fetch_fund_nav.py

    # 全量模式：忽略已有数据，重新获取所有基金
    python src/fetch_data/fetch_fund_nav.py --force

    # 验证模式：只获取10只基金的数据，先删后写
    python src/fetch_data/fetch_fund_nav.py --verify

    # 精简模式：只获取股票型+偏股混合型基金，先删后写
    python src/fetch_data/fetch_fund_nav.py --concise

    # 主题模式：只获取有主题的基金（fund_theme 不为空），增量更新
    python src/fetch_data/fetch_fund_nav.py --theme
"""
import sys
import os
import argparse
from typing import Optional
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import math
import akshare as ak
import pandas as pd
from src.utils import (
    format_fund_code,
    retry_decorator,
)
from src.utils.db import get_cursor
from src.config import get_logger

logger = get_logger(__name__)

_INSERT_SQL = """
INSERT INTO fund_nav (fund_code, nav_date, accumulated_nav, daily_growth)
VALUES (%(fund_code)s, %(nav_date)s, %(accumulated_nav)s, %(daily_growth)s)
ON DUPLICATE KEY UPDATE
    accumulated_nav=VALUES(accumulated_nav),
    daily_growth=VALUES(daily_growth)
"""

# API 调用间隔（秒），避免频率过高被封禁
API_REQUEST_INTERVAL = 0.5


def load_fund_codes_from_db() -> list:
    """从数据库 fund_basic_info 表加载基金代码，只获取 establish_date 不为空的基金"""
    with get_cursor() as cursor:
        cursor.execute("SELECT fund_code FROM fund_basic_info WHERE establish_date IS NOT NULL AND establish_date != '' ORDER BY fund_code")
        return [row['fund_code'] for row in cursor.fetchall()]


def load_concise_fund_codes() -> list:
    """从 fund_basic_info 加载精选基金代码

    筛选条件：
    - 基金类型 = '股票型'
    - 或 基金类型 = '混合型' 且 二级基金类型 = '偏股'
    - establish_date 不为空
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT fund_code FROM fund_basic_info
            WHERE establish_date IS NOT NULL AND establish_date != ''
              AND (
                  fund_type = '股票型'
                  OR (fund_type = '混合型' AND fund_type_second = '偏股')
              )
            ORDER BY fund_code
        """)
        return [row['fund_code'] for row in cursor.fetchall()]


def load_theme_fund_codes() -> list:
    """从 fund_basic_info 加载主题基金代码

    筛选条件：fund_theme 不为空
    """
    with get_cursor() as cursor:
        cursor.execute("""
            SELECT fund_code FROM fund_basic_info
            WHERE fund_theme IS NOT NULL AND fund_theme != ''
            ORDER BY fund_code
        """)
        return [row['fund_code'] for row in cursor.fetchall()]


def get_processed_fund_codes() -> set:
    """从 fund_nav 表获取已有净值数据的基金代码集合"""
    with get_cursor() as cursor:
        cursor.execute("SELECT DISTINCT fund_code FROM fund_nav")
        return {row['fund_code'] for row in cursor.fetchall()}


@retry_decorator(max_retries=3, delay=2)
def fetch_fund_nav(fund_code: str) -> Optional[pd.DataFrame]:
    """获取单只基金的累计净值走势"""
    df = ak.fund_open_fund_info_em(symbol=fund_code, indicator="累计净值走势")
    if df is None or df.empty:
        return None
    return df


def parse_nav_df(df: pd.DataFrame, fund_code: str) -> list:
    """将接口返回的 DataFrame 转为数据库记录列表

    日期从 yyyy-MM-dd 转为 yyyyMMdd
    日增长率通过累计净值计算: (今日 - 昨日) / 昨日 * 100
    """
    records = []
    prev_nav = None
    for _, row in df.iterrows():
        nav_date_raw = str(row.get('净值日期', ''))
        # yyyy-MM-dd -> yyyyMMdd
        nav_date = nav_date_raw.replace('-', '') if nav_date_raw else None
        if not nav_date or len(nav_date) != 8:
            continue
        accumulated_nav = row.get('累计净值')
        # 跳过 NaN 值，避免 MySQL 写入报错
        if accumulated_nav is None or (isinstance(accumulated_nav, float) and math.isnan(accumulated_nav)):
            continue
        accumulated_nav = float(accumulated_nav)
        # 计算日增长率，第一条数据无前一日，设为 0
        if prev_nav is not None and prev_nav > 0:
            daily_growth = round((accumulated_nav - prev_nav) / prev_nav * 100, 4)
        else:
            daily_growth = 0.0
        prev_nav = accumulated_nav
        records.append({
            'fund_code': format_fund_code(fund_code),
            'nav_date': nav_date,
            'accumulated_nav': accumulated_nav,
            'daily_growth': daily_growth,
        })
    return records


_DELETE_SQL = "DELETE FROM fund_nav WHERE fund_code = %s"


def delete_fund_nav(fund_code: str) -> int:
    """删除某只基金的已有净值数据"""
    with get_cursor() as cursor:
        cursor.execute(_DELETE_SQL, (fund_code,))
        return cursor.rowcount


def save_batch_to_db(rows: list, batch_size: int = 1000) -> int:
    """批量写入数据库"""
    if not rows:
        return 0
    total = 0
    with get_cursor() as cursor:
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            cursor.executemany(_INSERT_SQL, batch)
            total += cursor.rowcount
    return total


def main() -> None:
    """主函数：遍历所有基金，获取净值并写入数据库"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='获取基金净值数据并保存到 MySQL')
    parser.add_argument('--verify', action='store_true',
                        help='验证模式：只获取10只基金的数据，先删后写')
    parser.add_argument('--force', action='store_true',
                        help='全量模式：忽略已有数据，重新获取所有基金，先删后写')
    parser.add_argument('--concise', action='store_true',
                        help='精简模式：只获取股票型+偏股混合型基金，先删后写')
    parser.add_argument('--theme', action='store_true',
                        help='主题模式：只获取有主题的基金（fund_theme 不为空），增量更新')
    args = parser.parse_args()

    concise = args.concise
    theme = args.theme

    # 加载基金代码
    if concise:
        fund_codes = load_concise_fund_codes()
    elif theme:
        fund_codes = load_theme_fund_codes()
    else:
        fund_codes = load_fund_codes_from_db()
    if not fund_codes:
        logger.warning("未从数据库 fund_basic_info 表加载基金代码，请先运行 fetch_fund_info.py")
        return

    # 增量模式：获取已有净值数据的基金代码集合
    # 主题模式也走增量更新，只获取尚未有净值数据的主题基金
    processed = set()
    if not args.force and not args.verify:
        if not concise or theme:
            processed = get_processed_fund_codes()
            if processed:
                mode_name = "主题模式（增量）" if theme else "增量模式"
                logger.info("%s：%d 只基金已有净值数据，将跳过", mode_name, len(processed))

    # 验证模式：只取前10只
    if args.verify:
        original_count = len(fund_codes)
        fund_codes = fund_codes[:10]
        logger.info("验证模式：只处理前 %d 只基金（共 %d 只候选）", len(fund_codes), original_count)

    if concise:
        logger.info("精简模式：筛选条件为 股票型 或 (混合型+偏股)，共 %d 只基金", len(fund_codes))

    if theme:
        remaining = len(fund_codes) - len(processed)
        logger.info("主题模式：筛选条件为 fund_theme 不为空，增量更新，共 %d 只主题基金，待获取 %d 只", len(fund_codes), remaining)

    total = len(fund_codes)
    logger.info("共 %d 只基金，开始获取净值数据...", total)

    success_count = 0
    fail_count = 0
    skip_count = 0
    for i, code in enumerate(fund_codes):
        if i % 10 == 0:
            logger.info("进度: %d/%d", i, total)

        # 增量模式：跳过已有数据的基金
        if code in processed:
            skip_count += 1
            continue

        # 精简模式/验证模式/全量模式：先删后写（主题模式为增量更新，不删除）
        if concise or args.verify or args.force:
            delete_fund_nav(code)

        df = fetch_fund_nav(code)
        if df is None:
            fail_count += 1
            continue

        records = parse_nav_df(df, code)
        if records:
            affected = save_batch_to_db(records)
            success_count += 1
            if (i + 1) % 10 == 0 or args.verify or concise or theme:
                logger.info("基金 %s: %d 条净值，写入 %d 行", code, len(records), affected)
        else:
            fail_count += 1

        # 控制 API 调用频率，避免被封禁
        time.sleep(API_REQUEST_INTERVAL)

    logger.info("完成，共处理 %d 只基金，跳过 %d 只，失败 %d 只", success_count, skip_count, fail_count)


if __name__ == "__main__":
    main()
