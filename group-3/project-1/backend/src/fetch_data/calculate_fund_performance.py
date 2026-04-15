"""计算基金业绩指标并保存到 MySQL

数据源：fund_nav 表
目标表：fund_performance 表

Usage:
    # 增量模式（默认）：只计算 fund_performance 中缺少数据的基金
    python src/fetch_data/calculate_fund_performance.py

    # 全量模式：重新计算所有基金的业绩指标
    python src/fetch_data/calculate_fund_performance.py --full

    # 主题基金模式：只增量计算主题基金（fund_basic_info 中 fund_theme 不为空）的业绩
    python src/fetch_data/calculate_fund_performance.py --theme
"""
import os
import sys
import warnings
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from dateutil.relativedelta import relativedelta
from threading import Lock

warnings.filterwarnings('ignore', category=RuntimeWarning)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.utils import get_trade_date_map
from src.utils.db import get_cursor
from src.config import get_logger

logger = get_logger(__name__)

# 读取交易日数据（仅使用 trade_date_df）
_, _, trade_date_df = get_trade_date_map()

# 性能指标列（与 fund_performance 表字段一致）
PERFORMANCE_COLUMNS = [
    'return_1w',
    'return_1m', 'annualized_return_1m', 'volatility_1m', 'sharpe_ratio_1m', 'info_ratio_1m', 'max_drawdown_1m',
    'return_3m', 'annualized_return_3m', 'volatility_3m', 'sharpe_ratio_3m', 'info_ratio_3m', 'max_drawdown_3m',
    'return_6m', 'annualized_return_6m', 'volatility_6m', 'sharpe_ratio_6m', 'info_ratio_6m', 'max_drawdown_6m',
    'return_1y', 'annualized_return_1y', 'volatility_1y', 'sharpe_ratio_1y', 'info_ratio_1y', 'max_drawdown_1y',
    'return_2y', 'annualized_return_2y', 'volatility_2y', 'sharpe_ratio_2y', 'info_ratio_2y', 'max_drawdown_2y',
    'return_3y', 'annualized_return_3y', 'volatility_3y', 'sharpe_ratio_3y', 'info_ratio_3y', 'max_drawdown_3y',
]

# 时间段定义（近一周仅计算简单收益率，不含年化/波动/夏普等）
PERIODS = [
    ('1m', 1), ('3m', 3), ('6m', 6), ('1y', 12), ('2y', 24), ('3y', 36)
]

# 无风险利率（年化）
RISK_FREE_RATE = 0.015

# 线程安全的进度锁
_progress_lock = Lock()


# ---- 向量化计算 ----

# DECIMAL(12, 6) 最大值，超过会导致 MySQL 1264 错误
MAX_DECIMAL_VALUE = 999999.999999


def _clamp(value):
    """将数值限制在 DECIMAL(12, 6) 范围内，inf/nan 返回 None"""
    if value is None or not np.isfinite(value):
        return None
    return max(-MAX_DECIMAL_VALUE, min(MAX_DECIMAL_VALUE, float(value)))


def calculate_performance_metrics_vectorized(nav_dates, accumulated_nav, daily_returns):
    """向量化计算某只基金所有日期的业绩指标

    核心优化：将原来逐行 + DataFrame 过滤的 O(N*6) 操作，
    改为按时间段向量化计算，使用 numpy 数组切片。

    Args:
        nav_dates: numpy array of datetime64
        accumulated_nav: numpy array of float
        daily_returns: numpy array of float

    Returns:
        list of dicts, one per date (skipping first date)
    """
    n = len(nav_dates)
    if n < 2:
        return []

    results = [None] * (n - 1)

    # 近一周收益率（7 天前）
    return_1w = np.full(n, np.nan)
    for i in range(n):
        end_dt = pd.Timestamp(nav_dates[i])
        start_nat = end_dt - relativedelta(weeks=1)
        pos = np.searchsorted(nav_dates, np.datetime64(start_nat), side='left')
        if pos < i:
            return_1w[i] = (accumulated_nav[i] - accumulated_nav[pos]) / accumulated_nav[pos]

    # 预计算该基金每个日期各时间段的起始位置（在基金自身数组中的索引）
    # fund_start_positions[period_name][i] = start index within fund's data for end index i
    fund_start_positions = {}
    for period_name, months in PERIODS:
        positions = np.empty(n, dtype=np.int64)
        for i in range(n):
            end_dt = pd.Timestamp(nav_dates[i])
            start_nat = end_dt - relativedelta(months=months)
            # 在基金自身数据中找到 >= start_nat 的位置
            pos = np.searchsorted(nav_dates, np.datetime64(start_nat), side='left')
            positions[i] = pos
        fund_start_positions[period_name] = positions

    for period_name, _ in PERIODS:
        starts = fund_start_positions[period_name]
        ends = np.arange(n)
        valid_mask = ends - starts >= 1

        ret = np.full(n, np.nan)
        ann_ret = np.full(n, np.nan)
        vol = np.full(n, np.nan)
        sharpe = np.full(n, np.nan)
        info = np.full(n, np.nan)
        mdd = np.full(n, np.nan)

        if valid_mask.any():
            valid_ends = ends[valid_mask]
            valid_starts = starts[valid_mask]

            # 收益率
            total_ret = (accumulated_nav[valid_ends] - accumulated_nav[valid_starts]) / accumulated_nav[valid_starts]
            ret[valid_mask] = total_ret

            # 年化收益率
            days = (nav_dates[valid_ends] - nav_dates[valid_starts]).astype('timedelta64[D]').astype(int)
            days = np.maximum(days, 1)
            ann = np.power(1 + total_ret, 365.0 / days) - 1
            ann_ret[valid_mask] = ann

            # 波动率 & 夏普 & 信息比率
            vol_arr = np.empty(len(valid_ends), dtype=np.float64)
            mean_arr = np.empty(len(valid_ends), dtype=np.float64)
            for idx in range(len(valid_ends)):
                s = valid_starts[idx]
                e = valid_ends[idx] + 1
                window = daily_returns[s:e]
                vol_arr[idx] = np.nanstd(window, ddof=1)
                mean_arr[idx] = np.nanmean(window)

            vol_ann = vol_arr * np.sqrt(252)
            vol[valid_mask] = vol_ann
            sharpe[valid_mask] = np.where(vol_ann > 0, (ann - RISK_FREE_RATE) / vol_ann, 0.0)

            bench_ann = mean_arr * 252
            active = ann - bench_ann
            info[valid_mask] = np.where(vol_ann > 0, active / vol_ann, 0.0)

            # 最大回撤
            for idx in range(len(valid_ends)):
                s = valid_starts[idx]
                e = valid_ends[idx] + 1
                window_returns = daily_returns[s:e]
                cum = np.cumprod(1 + window_returns)
                running_max = np.maximum.accumulate(cum)
                drawdown = (cum - running_max) / running_max
                mdd[valid_mask[idx]] = np.min(drawdown)

        # 收集结果（跳过第0行）
        for i in range(1, n):
            if results[i - 1] is None:
                results[i - 1] = {}

            # 近一周收益率
            r1w = return_1w[i] if not np.isnan(return_1w[i]) else None
            cr1w = _clamp(r1w)
            results[i - 1]['return_1w'] = round(cr1w, 6) if cr1w is not None else None

            r = ret[i] if not np.isnan(ret[i]) else None
            ar = ann_ret[i] if not np.isnan(ann_ret[i]) else None
            v = vol[i] if not np.isnan(vol[i]) else None
            sp = sharpe[i] if not np.isnan(sharpe[i]) else 0.0
            ir = info[i] if not np.isnan(info[i]) else 0.0
            md = mdd[i] if not np.isnan(mdd[i]) else None
            cr = _clamp(r)
            car = _clamp(ar)
            cv = _clamp(v)
            csp = _clamp(sp)
            cir = _clamp(ir)
            cmd = _clamp(md)
            results[i - 1][f'return_{period_name}'] = round(cr, 6) if cr is not None else None
            results[i - 1][f'annualized_return_{period_name}'] = round(car, 6) if car is not None else None
            results[i - 1][f'volatility_{period_name}'] = round(cv, 6) if cv is not None else None
            results[i - 1][f'sharpe_ratio_{period_name}'] = round(csp, 6) if csp is not None else 0.0
            results[i - 1][f'info_ratio_{period_name}'] = round(cir, 6) if cir is not None else 0.0
            results[i - 1][f'max_drawdown_{period_name}'] = round(cmd, 6) if cmd is not None else None

    return results


# ---- 数据库操作 ----

def load_fund_nav_from_db(fund_code: str = None) -> pd.DataFrame:
    """从数据库加载基金净值数据"""
    if fund_code:
        query = "SELECT fund_code, nav_date, accumulated_nav, daily_growth FROM fund_nav WHERE fund_code = %s ORDER BY nav_date ASC"
        with get_cursor() as cursor:
            cursor.execute(query, (fund_code,))
            rows = cursor.fetchall()
    else:
        query = "SELECT fund_code, nav_date, accumulated_nav, daily_growth FROM fund_nav ORDER BY fund_code, nav_date ASC"
        with get_cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df['nav_date'] = pd.to_datetime(df['nav_date'], format='%Y%m%d')
    df['accumulated_nav'] = df['accumulated_nav'].astype(float)
    if 'daily_growth' in df.columns:
        df['daily_growth'] = df['daily_growth'].astype(float)
    return df


def get_fund_codes_in_db() -> set:
    """从 fund_nav 表获取所有不重复的基金代码"""
    with get_cursor() as cursor:
        cursor.execute("SELECT DISTINCT fund_code FROM fund_nav")
        rows = cursor.fetchall()
    return {row['fund_code'] for row in rows}


def get_theme_fund_codes() -> set:
    """从 fund_basic_info 表获取主题基金代码（fund_theme 不为空）"""
    with get_cursor() as cursor:
        cursor.execute(
            "SELECT DISTINCT fund_code FROM fund_basic_info "
            "WHERE fund_theme IS NOT NULL AND fund_theme != ''"
        )
        rows = cursor.fetchall()
    return {row['fund_code'] for row in rows}


def get_processed_fund_codes() -> set:
    """从 fund_performance 表获取已有业绩指标的基金代码集合"""
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT DISTINCT fund_code FROM fund_performance")
            rows = cursor.fetchall()
        return {row['fund_code'] for row in rows}
    except Exception:
        return set()


def ensure_performance_table() -> None:
    """确保 fund_performance 表存在"""
    sql_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sql', 'fund_performance.sql')
    if os.path.exists(sql_path):
        with open(sql_path, 'r', encoding='utf-8') as f:
            ddl = f.read()
        with get_cursor() as cursor:
            cursor.execute(ddl)
        logger.info("数据库表 fund_performance 已就绪")


def delete_fund_performance(fund_code: str) -> int:
    """删除某只基金的已有业绩指标"""
    with get_cursor() as cursor:
        cursor.execute("DELETE FROM fund_performance WHERE fund_code = %s", (fund_code,))
        return cursor.rowcount


def save_fund_performance(records: list) -> int:
    """批量保存基金业绩指标到数据库"""
    if not records:
        return 0

    columns_str = ', '.join(PERFORMANCE_COLUMNS)
    placeholders = ', '.join([f'%({col})s' for col in ['fund_code', 'nav_date'] + PERFORMANCE_COLUMNS])
    updates_str = ', '.join([f'{col}=VALUES({col})' for col in PERFORMANCE_COLUMNS])
    insert_sql = f"""
    INSERT INTO fund_performance (fund_code, nav_date, {columns_str})
    VALUES ({placeholders})
    ON DUPLICATE KEY UPDATE {updates_str}
    """

    total = 0
    batch_size = 1000
    with get_cursor() as cursor:
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            cursor.executemany(insert_sql, batch)
            total += cursor.rowcount
    return total


# ---- 主处理流程 ----

def process_single_fund(fund_code: str, nav_df: pd.DataFrame) -> tuple:
    """处理单只基金的业绩指标计算（向量化版本）

    Args:
        fund_code: 基金代码
        nav_df: 该基金的净值数据，已按日期升序排列

    Returns:
        (成功条数, 失败条数)
    """
    try:
        if nav_df.empty or len(nav_df) < 2:
            return 0, 0

        nav_df = nav_df.copy()
        nav_df['daily_return'] = nav_df['accumulated_nav'].pct_change()

        nav_dates = nav_df['nav_date'].values
        acc_nav = nav_df['accumulated_nav'].values.astype(np.float64)
        daily_ret = nav_df['daily_return'].values.astype(np.float64)

        metric_results = calculate_performance_metrics_vectorized(nav_dates, acc_nav, daily_ret)

        records = []
        for i, metrics in enumerate(metric_results):
            record = {
                'fund_code': fund_code,
                'nav_date': nav_df.iloc[i + 1]['nav_date'].strftime('%Y%m%d'),
            }
            record.update(metrics)
            records.append(record)

        # 先删除已有数据，再插入新数据
        delete_fund_performance(fund_code)
        save_fund_performance(records)
        return len(records), 0

    except Exception as e:
        logger.error("处理基金 %s 失败：%s", fund_code, e)
        return 0, 1


def process_all_funds(incremental: bool = True, verify: bool = False, max_workers: int = 6, theme: bool = False) -> None:
    """处理所有基金的业绩指标计算

    Args:
        incremental: 增量模式，跳过已有业绩指标的基金
        verify: 验证模式，只处理前5只基金
        max_workers: 并发线程数
        theme: 主题基金模式，只计算 fund_basic_info 中 fund_theme 不为空的基金
    """
    ensure_performance_table()

    if theme:
        theme_codes = get_theme_fund_codes()
        if not theme_codes:
            logger.warning("未找到任何主题基金（fund_basic_info 中 fund_theme 为空）")
            return
        nav_codes = get_fund_codes_in_db()
        fund_codes = list(theme_codes & nav_codes)
        if not fund_codes:
            logger.warning("主题基金在 fund_nav 表中无净值数据")
            return
        logger.info("主题基金模式：共 %d 只主题基金有净值数据", len(fund_codes))
    else:
        fund_codes = list(get_fund_codes_in_db())
        if not fund_codes:
            logger.warning("未从 fund_nav 表获取到任何基金代码")
            return

    if incremental:
        processed = get_processed_fund_codes()
        if processed:
            logger.info("增量模式：%d 只基金已有业绩指标，将跳过", len(processed))
        fund_codes = [code for code in fund_codes if code not in processed]
    else:
        logger.info("全量模式：重新计算所有基金")

    if verify:
        original_count = len(fund_codes)
        fund_codes = fund_codes[:5]
        logger.info("验证模式：只处理前 5 只基金（共 %d 只候选）", original_count)

    if not fund_codes:
        logger.info("所有基金已有业绩指标，无需更新")
        return

    total = len(fund_codes)
    logger.info("共 %d 只基金待计算（并发数: %d）", total, max_workers)

    counter = {'success': 0, 'fail': 0, 'done': 0}

    def _process_one(code: str) -> tuple:
        try:
            nav_df = load_fund_nav_from_db(code)
            if nav_df.empty:
                return 0, 0
            return process_single_fund(code, nav_df)
        except Exception as e:
            logger.error("处理基金 %s 异常：%s", code, e)
            return 0, 1

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(_process_one, code): code for code in fund_codes}

        for future in as_completed(futures):
            code = futures[future]
            try:
                s, f = future.result()
                with _progress_lock:
                    counter['success'] += s
                    counter['fail'] += f
                    counter['done'] += 1
                    if counter['done'] % 50 == 0 or counter['done'] == total:
                        logger.info("进度: %d/%d", counter['done'], total)
            except Exception as e:
                logger.error("基金 %s 处理异常：%s", code, e)
                with _progress_lock:
                    counter['fail'] += 1
                    counter['done'] += 1

    logger.info("完成！共处理 %d 只基金，%d 条业绩指标记录，失败 %d 只",
                counter['done'], counter['success'], counter['fail'])


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='计算基金业绩指标并保存到 MySQL')
    parser.add_argument('--full', action='store_true',
                        help='全量模式：重新计算所有基金的业绩指标（默认增量模式）')
    parser.add_argument('--theme', action='store_true',
                        help='主题基金模式：只增量计算主题基金（fund_basic_info 中 fund_theme 不为空）的业绩')
    parser.add_argument('--verify', action='store_true',
                        help='验证模式：只处理前5只基金')
    parser.add_argument('--workers', type=int, default=6,
                        help='并发线程数（默认 6）')
    args = parser.parse_args()

    if args.theme:
        incremental = not args.full  # 主题 + 全量 = 重新计算所有主题基金
        mode_str = '全量主题' if not incremental else '主题基金增量'
    else:
        incremental = not args.full
        mode_str = '增量' if incremental else '全量'
    if args.verify:
        mode_str += ' + 验证'

    logger.info("=" * 60)
    logger.info("基金业绩指标计算（%s模式，%d workers）", mode_str, args.workers)
    logger.info("=" * 60)

    process_all_funds(incremental=incremental, verify=args.verify, max_workers=args.workers, theme=args.theme)
    logger.info("处理完成！")


if __name__ == "__main__":
    main()
