"""获取基金基本信息并保存到 MySQL

优化点：
- 增量更新：跳过 DB 中已有详细信息的基金（establish_date 非空）
- 并发控制：ThreadPoolExecutor + Semaphore 限制同时请求数
- 速率限制：每次 API 调用后 sleep 防止过载
- 优雅中断：Ctrl+C 时保存已获取数据后退出

Usage:
    # 增量模式（默认，只更新缺少详细信息的基金）
    python src/fetch_data/fetch_fund_info.py

    # 全量模式（更新所有基金详细信息）
    python src/fetch_data/fetch_fund_info.py --full

    # 股票型基金净值下载（增量，只下载缺失的）
    python src/fetch_data/fetch_fund_info.py --stock-nav

    # 股票型基金净值下载（全量，重新下载所有）
    python src/fetch_data/fetch_fund_info.py --stock-nav --full

    # 测试模式（只处理前 N 只）
    python src/fetch_data/fetch_fund_info.py --stock-nav --test 10
"""
import sys
import os
import re
import time
import signal
import threading
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional, List, Tuple

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import akshare as ak
import pandas as pd
from src.utils import (
    format_fund_code,
    retry_decorator,
    get_cursor,
)
from src.config import get_logger

logger = get_logger(__name__)

# 接口字段 → 数据库字段映射
# fund_name_em 的基金类型为一级分类，fund_individual_basic_info_xq 的为二级分类
COLUMN_MAPPING = {
    '基金代码': 'fund_code',
    '基金名称': 'fund_name',
    '基金全称': 'fund_full_name',
    '成立时间': 'establish_date',
    '最新规模': 'latest_scale',
    '基金公司': 'fund_company',
    '基金经理': 'fund_manager',
    '托管银行': 'custodian_bank',
    '评级机构': 'rating_agency',
    '基金评级': 'fund_rating',
    '投资策略': 'investment_strategy',
    '投资目标': 'investment_objective',
    '业绩比较基准': 'performance_benchmark',
}

_INSERT_SQL = """
INSERT INTO fund_basic_info
    (fund_code, fund_name, fund_full_name, establish_date, latest_scale,
     fund_company, fund_manager, custodian_bank, fund_type, fund_type_second, fund_type_xq,
     rating_agency, fund_rating, investment_strategy,
     investment_objective, performance_benchmark)
VALUES
    (%(fund_code)s, %(fund_name)s, %(fund_full_name)s, %(establish_date)s,
     %(latest_scale)s, %(fund_company)s, %(fund_manager)s, %(custodian_bank)s,
     %(fund_type)s, %(fund_type_second)s, %(fund_type_xq)s, %(rating_agency)s, %(fund_rating)s,
     %(investment_strategy)s, %(investment_objective)s, %(performance_benchmark)s)
ON DUPLICATE KEY UPDATE
    fund_name=VALUES(fund_name), fund_full_name=VALUES(fund_full_name),
    establish_date=VALUES(establish_date), latest_scale=VALUES(latest_scale),
    fund_company=VALUES(fund_company), fund_manager=VALUES(fund_manager),
    custodian_bank=VALUES(custodian_bank), fund_type=IFNULL(VALUES(fund_type), fund_type),
    fund_type_second=IFNULL(VALUES(fund_type_second), fund_type_second),
    fund_type_xq=IFNULL(VALUES(fund_type_xq), fund_type_xq),
    rating_agency=VALUES(rating_agency), fund_rating=VALUES(fund_rating),
    investment_strategy=VALUES(investment_strategy),
    investment_objective=VALUES(investment_objective),
    performance_benchmark=VALUES(performance_benchmark),
    updated_at = NOW()
"""

_DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')

# 全局停止信号
_stop_event = threading.Event()


def normalize_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    if _DATE_PATTERN.match(value):
        return value.replace('-', '')
    return value


def ensure_table() -> None:
    """确保 fund_basic_info 表存在"""
    sql_path = os.path.join(os.path.dirname(__file__), '..', '..', 'sql', 'fund_basic_info.sql')
    if os.path.exists(sql_path):
        with open(sql_path, 'r', encoding='utf-8') as f:
            ddl = f.read()
        with get_cursor() as cursor:
            cursor.execute(ddl)
        logger.info("数据库表 fund_basic_info 已就绪")


def delete_table_data() -> int:
    """删除 fund_basic_info 表中的所有数据

    Returns:
        删除的行数
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("DELETE FROM fund_basic_info")
            affected = cursor.rowcount
        logger.info("已删除 fund_basic_info 表中的 %d 条记录", affected)
        return affected
    except Exception as e:
        logger.error("删除表数据失败：%s", e)
        return 0




def get_fund_codes_missing_info() -> List[str]:
    """从数据库获取缺少详细信息（establish_date 为空）的基金代码列表

    Returns:
        基金代码列表
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT fund_code FROM fund_basic_info
                WHERE establish_date IS NULL OR establish_date = ''
            """)
            rows = cursor.fetchall()
        codes = [row['fund_code'] for row in rows]
        logger.info("获取到 %d 只缺少详细信息的基金代码", len(codes))
        return codes
    except Exception as e:
        logger.error("获取缺少详细信息的基金代码失败：%s", e)
        return []


@retry_decorator(max_retries=3, delay=5)
def get_all_fund_codes() -> list:
    """获取所有基金代码"""
    import pandas as pd

    cache_file = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'fund_codes_cache.csv')

    try:
        logger.info("尝试从网络获取基金代码...")
        df = ak.fund_name_em()
        fund_codes = df['基金代码'].tolist()
        logger.info("成功获取 %d 只基金代码", len(fund_codes))

        try:
            os.makedirs(os.path.dirname(cache_file), exist_ok=True)
            df.to_csv(cache_file, index=False, encoding='utf-8-sig')
            logger.info("基金代码已保存到本地缓存：%s", cache_file)
        except Exception as e:
            logger.warning("保存缓存失败：%s", e)

        return fund_codes
    except Exception as e:
        logger.warning("网络获取失败，尝试从本地缓存加载...")
        if os.path.exists(cache_file):
            try:
                df = pd.read_csv(cache_file, encoding='utf-8-sig')
                fund_codes = df['基金代码'].tolist()
                logger.info("从本地缓存成功加载 %d 只基金代码", len(fund_codes))
                return fund_codes
            except Exception as cache_e:
                logger.error("加载缓存失败：%s", cache_e)
        return []


def fetch_and_save_basic_info_from_em() -> int:
    """从 fund_name_em 接口获取全量基金基础信息并保存到数据库

    Returns:
        处理的基金数量
    """
    import pandas as pd

    try:
        logger.info("从 fund_name_em 获取全量基金基础信息...")
        df = ak.fund_name_em()

        # 确保必要的列存在
        required_columns = ['基金代码', '基金简称', '基金类型']
        missing_cols = [col for col in required_columns if col not in df.columns]
        if missing_cols:
            logger.warning("数据中缺少列 %s", missing_cols)
            # 尝试使用可能的别名
            if '基金代码' not in df.columns and '代码' in df.columns:
                df['基金代码'] = df['代码']
            if '基金简称' not in df.columns and '简称' in df.columns:
                df['基金简称'] = df['简称']
            if '基金类型' not in df.columns and '类型' in df.columns:
                df['基金类型'] = df['类型']

            # 重新检查
            missing_cols = [col for col in required_columns if col not in df.columns]
            if missing_cols:
                logger.error("无法找到必要的列 %s", missing_cols)
                return 0

        # 提取并格式化数据
        rows = []
        for _, row in df.iterrows():
            fund_code = format_fund_code(row['基金代码']) if pd.notna(row['基金代码']) else None
            fund_name = str(row['基金简称']).strip() if pd.notna(row['基金简称']) else None
            fund_type = str(row['基金类型']).strip() if pd.notna(row['基金类型']) else None

            if not fund_code:
                continue

            rows.append({
                'fund_code': fund_code,
                'fund_name': fund_name,
                'fund_type': fund_type,
                'fund_type_ttjj': fund_type,
            })

        if not rows:
            logger.warning("未提取到有效的基金数据")
            return 0

        # 批量插入数据库，保存一级基金类型和天天基金类型
        insert_sql = """
        INSERT INTO fund_basic_info
            (fund_code, fund_name, fund_type, fund_type_ttjj)
        VALUES
            (%(fund_code)s, %(fund_name)s, %(fund_type)s, %(fund_type_ttjj)s)
        ON DUPLICATE KEY UPDATE
            fund_name = VALUES(fund_name),
            fund_type = IFNULL(VALUES(fund_type), fund_type),
            fund_type_ttjj = IFNULL(VALUES(fund_type_ttjj), fund_type_ttjj),
            updated_at = NOW()
        """

        with get_cursor() as cursor:
            cursor.executemany(insert_sql, rows)
            affected = cursor.rowcount

        # 保存一份为CSV文件到data目录下
        try:
            csv_output_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'fund_basic_info_em.csv')
            os.makedirs(os.path.dirname(csv_output_path), exist_ok=True)
            df.to_csv(csv_output_path, index=False, encoding='utf-8-sig')
            logger.info("基金基础信息已保存为CSV文件：%s", csv_output_path)
        except Exception as e:
            logger.warning("保存CSV文件失败：%s", e)

        logger.info("基金基础信息保存完成，共处理 %d 条记录，影响 %d 行", len(rows), affected)
        return len(rows)

    except Exception as e:
        logger.error("保存基金基础信息失败：%s", e)
        return 0


def fetch_fund_basic_info(fund_code: str) -> Optional[dict]:
    """获取单只基金的基本信息

    调用 fund_individual_basic_info_xq 接口获取详细信息，不重试。
    其中 fund_type 字段作为二级分类（fund_type_second）保存。

    Returns:
        基金详细信息字典，包含 COLUMN_MAPPING 中的所有字段 + fund_type_second
    """
    try:
        df = ak.fund_individual_basic_info_xq(symbol=fund_code)
        raw = dict(zip(df['item'], df['value']))

        row: dict = {}
        for cn_key, en_key in COLUMN_MAPPING.items():
            row[en_key] = raw.get(cn_key)

        # 保存雪球原始基金类型
        row['fund_type_xq'] = raw.get('基金类型')
        
        # 从fund_type_xq分离fund_type和fund_type_second
        fund_type_xq = raw.get('基金类型')
        if fund_type_xq:
            fund_type, fund_type_second = normalize_fund_type(fund_type_xq)
            row['fund_type'] = fund_type
            row['fund_type_second'] = fund_type_second
        else:
            # 一级类型由 fund_name_em 提供，此处仅保证 INSERT 不报错
            row.setdefault('fund_type', None)
            row.setdefault('fund_type_second', None)

        if row.get('fund_code'):
            row['fund_code'] = format_fund_code(row['fund_code'])

        row['establish_date'] = normalize_date(row.get('establish_date'))
        return row
    except KeyError:
        return None
    except Exception as e:
        logger.debug("获取基金 %s 详细信息失败：%s", fund_code, e)
        return None


def save_batch_to_db(rows: list) -> int:
    """批量写入数据库"""
    if not rows:
        return 0
    with get_cursor() as cursor:
        cursor.executemany(_INSERT_SQL, rows)
        return cursor.rowcount


def fetch_all_fund_basic_info(
    batch_size: int = 100,
    max_workers: int = 10,
    request_delay: float = 0.1,
    incremental: bool = True,
    test: int = 0,
) -> None:
    """获取所有基金基本信息并批量写入 MySQL

    流程：
    1. 确保表存在
    2. 从 fund_name_em 获取全量基金基础信息（代码、简称、类型）并保存
    3. 根据 incremental 参数决定获取哪些基金的详细信息：
       - incremental=True: 只获取 establish_date 为空的基金
       - incremental=False: 获取所有基金的详细信息
    4. 对每个基金代码调用 fund_individual_basic_info_xq 获取详细信息并更新

    Args:
        batch_size: 批量写入大小
        max_workers: 最大并发线程数
        request_delay: 每次 API 请求后的延迟 (秒)
        incremental: 是否只更新缺少详细信息的基金
        test: 测试模式，只处理前 N 只基金（0 表示关闭）
    """
    ensure_table()

    # 全量模式先清空表数据
    if not incremental:
        delete_table_data()

    # 1. 从 fund_name_em 获取全量基金基础信息并保存
    saved_count = fetch_and_save_basic_info_from_em()
    if saved_count == 0:
        logger.warning("未保存基金基础信息，流程终止")
        return

    # 2. 根据 incremental 参数决定获取哪些基金的详细信息
    if incremental:
        logger.info("增量模式：只获取缺少详细信息的基金...")
        fund_codes = get_fund_codes_missing_info()
    else:
        logger.info("全量模式：获取所有基金的详细信息...")
        # 全量模式下表已清空，需从网络/缓存获取基金代码
        fund_codes = get_all_fund_codes()

    if not fund_codes:
        if incremental:
            logger.info("所有基金已有详细信息，无需更新")
        else:
            logger.warning("未获取到基金代码列表")
        return

    # 测试模式：只取前 N 只
    if test > 0:
        fund_codes = fund_codes[:test]
        logger.info("测试模式：仅处理前 %d 只基金", test)

    total = len(fund_codes)
    logger.info("共 %d 只基金待更新详细信息", total)

    # 3. 并发获取基金详细信息并更新数据库
    semaphore = threading.Semaphore(max_workers)
    lock = threading.Lock()
    batch_buffer: List[dict] = []
    success_count = 0
    fail_count = 0
    start_time = time.time()

    def _signal_handler(sig, frame):
        logger.warning("收到中断信号，正在保存已获取数据...")
        _stop_event.set()

    signal.signal(signal.SIGINT, _signal_handler)

    def _fetch_one(code: str) -> Tuple[Optional[dict], Optional[str]]:
        if _stop_event.is_set():
            return None, None
        semaphore.acquire()
        try:
            if _stop_event.is_set():
                return None, None
            result = fetch_fund_basic_info(code)
            time.sleep(request_delay)
            return result, None
        except Exception as e:
            return None, str(e)
        finally:
            semaphore.release()

    def _flush_buffer():
        nonlocal batch_buffer, success_count
        if batch_buffer:
            affected = save_batch_to_db(batch_buffer)
            success_count += len(batch_buffer)
            elapsed = time.time() - start_time
            speed = success_count / elapsed if elapsed > 0 else 0
            remaining = (total - success_count - fail_count) / speed if speed > 0 else 0
            logger.info(
                "写入 %d 条 | 进度 %d/%d | 成功 %d 失败 %d | %.1f 只/秒 | 预计剩余 %.0f秒",
                affected, success_count + fail_count, total,
                success_count, fail_count, speed, remaining,
            )
            batch_buffer = []

    logger.info("开始获取基金详细信息，并发数=%d，请求间隔=%.1f秒", max_workers, request_delay)

    # 分批提交任务，避免一次性创建过多 future 导致内存压力
    chunk_size = max_workers * 10
    for chunk_start in range(0, total, chunk_size):
        if _stop_event.is_set():
            break

        chunk = fund_codes[chunk_start:chunk_start + chunk_size]
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {executor.submit(_fetch_one, code): code for code in chunk}

            for future in as_completed(futures):
                if _stop_event.is_set():
                    break

                code = futures[future]
                try:
                    info, error = future.result()
                except Exception as e:
                    info = None
                    error = str(e)

                with lock:
                    if info:
                        batch_buffer.append(info)
                        if len(batch_buffer) >= batch_size:
                            _flush_buffer()
                    else:
                        fail_count += 1
                        if fail_count <= 20:
                            logger.warning("失败 %s: %s", code, error)

    # 写入剩余数据
    with lock:
        _flush_buffer()

    elapsed = time.time() - start_time
    logger.info("完成！成功更新 %d 只基金详细信息，失败 %d 只，耗时 %.1f秒", success_count, fail_count, elapsed)

    # 4. 标准化基金类型和基金规模
    update_fund_types()
    update_fund_scales()


def normalize_fund_type(fund_type: str) -> tuple:
    """标准化基金类型，分离短横线前后部分
    
    Args:
        fund_type: 原始基金类型字符串
    
    Returns:
        tuple: (fund_type, fund_type_second)，分别为短横线前和短横线后部分
    """
    if fund_type and '-' in fund_type:
        parts = fund_type.split('-', 1)  # 只分割一次
        return parts[0].strip(), parts[1].strip() if len(parts) > 1 else None
    return fund_type, None


def normalize_fund_scale(scale_str: str) -> float:
    """标准化基金规模，统一单位为万
    
    Args:
        scale_str: 原始基金规模字符串
    
    Returns:
        float: 标准化后的基金规模（单位：万，保留两位小数）
    """
    if not scale_str:
        return None
    
    try:
        # 移除逗号并去除首尾空格
        scale_str = scale_str.replace(',', '').strip()
        
        # 处理不同单位
        if '亿' in scale_str:
            # 移除"亿"单位并转换为数字，再乘以10000转换为万
            scale = float(scale_str.replace('亿', '')) * 10000
        elif '万' in scale_str:
            # 移除"万"单位并转换为数字
            scale = float(scale_str.replace('万', ''))
        else:
            # 没有单位，直接转换为数字
            scale = float(scale_str)
        
        # 保留两位小数
        return round(scale, 2)
    except Exception as e:
        logger.debug("解析基金规模失败：%s", e)
        return None


def update_fund_types(limit: int = 0) -> None:
    """更新基金类型，根据 fund_type_ttjj 字段按短横线-分割更新 fund_type 和 fund_type_second

    fund_type_ttjj 短横线前面部分 → fund_type
    fund_type_ttjj 短横线后面部分 → fund_type_second

    Args:
        limit: 限制处理的记录数，0 表示不限制
    """
    try:
        logger.info("开始更新基金类型...")

        # 获取所有基金记录（以 fund_type_ttjj 为源）
        limit_clause = f"LIMIT {limit}" if limit > 0 else ""
        with get_cursor() as cursor:
            cursor.execute(f"SELECT fund_code, fund_type_ttjj FROM fund_basic_info WHERE fund_type_ttjj IS NOT NULL AND fund_type_ttjj != '' {limit_clause}")
            rows = cursor.fetchall()

        logger.info("共获取到 %d 条基金记录", len(rows))

        # 准备更新数据
        update_data = []
        for row in rows:
            fund_code = row['fund_code']
            fund_type_ttjj = row['fund_type_ttjj']

            new_type, new_second_type = normalize_fund_type(fund_type_ttjj)

            update_data.append({
                'fund_code': fund_code,
                'fund_type': new_type,
                'fund_type_second': new_second_type
            })

        if not update_data:
            logger.info("所有基金均无 fund_type_ttjj，无需更新")
            return

        logger.info("需要更新 %d 条基金类型", len(update_data))

        # 批量更新
        update_sql = """
        UPDATE fund_basic_info
        SET fund_type = %(fund_type)s, fund_type_second = %(fund_type_second)s, updated_at = NOW()
        WHERE fund_code = %(fund_code)s
        """

        with get_cursor() as cursor:
            cursor.executemany(update_sql, update_data)
            affected = cursor.rowcount

        logger.info("基金类型更新完成，共影响 %d 条记录", affected)

    except Exception as e:
        logger.error("更新基金类型失败：%s", e)


def update_fund_themes(limit: int = 0) -> None:
    """更新基金主题字段

    根据基金名称匹配关键词，匹配则设为对应主题，否则为空。
    主题列表：原油、黄金、煤炭、电力、天然气、算力、存储、芯片、光模块、储能

    Args:
        limit: 限制处理的记录数，0 表示不限制
    """
    THEMES = ['原油', '黄金', '煤炭', '电力', '天然气', '算力', '存储', '芯片', '光模块', '储能']

    try:
        logger.info("开始更新基金主题...")

        limit_clause = f"LIMIT {limit}" if limit > 0 else ""
        with get_cursor() as cursor:
            cursor.execute(f"SELECT fund_code, fund_name FROM fund_basic_info WHERE fund_name IS NOT NULL AND fund_name != '' {limit_clause}")
            rows = cursor.fetchall()

        logger.info("共获取到 %d 条基金记录", len(rows))

        update_data = []
        for row in rows:
            fund_code = row['fund_code']
            fund_name = row['fund_name']

            matched_theme = None
            for theme in THEMES:
                if theme in fund_name:
                    matched_theme = theme
                    break

            update_data.append({
                'fund_code': fund_code,
                'fund_theme': matched_theme,
            })

        if not update_data:
            logger.info("无需要更新的记录")
            return

        # 统计有主题和无主题的基金
        with_theme = sum(1 for d in update_data if d['fund_theme'])
        without_theme = len(update_data) - with_theme
        logger.info("匹配到主题: %d 只，无主题: %d 只", with_theme, without_theme)

        # 批量更新
        update_sql = """
        UPDATE fund_basic_info
        SET fund_theme = %(fund_theme)s, updated_at = NOW()
        WHERE fund_code = %(fund_code)s
        """

        with get_cursor() as cursor:
            cursor.executemany(update_sql, update_data)
            affected = cursor.rowcount

        logger.info("基金主题更新完成，共影响 %d 条记录", affected)

    except Exception as e:
        logger.error("更新基金主题失败：%s", e)


def update_fund_scales(limit: int = 0) -> None:
    """更新基金规模，将latest_scale字段单位统一为万，并去掉单位只保留数字

    Args:
        limit: 限制处理的记录数，0 表示不限制
    """
    try:
        logger.info("开始更新基金规模...")
        
        # 获取所有基金记录
        limit_clause = f"LIMIT {limit}" if limit > 0 else ""
        with get_cursor() as cursor:
            cursor.execute(f"SELECT fund_code, latest_scale FROM fund_basic_info {limit_clause}")
            rows = cursor.fetchall()
        
        logger.info("共获取到 %d 条基金记录", len(rows))
        
        # 准备更新数据
        update_data = []
        for row in rows:
            fund_code = row['fund_code']
            original_scale = row['latest_scale']
            
            # 跳过空值
            if not original_scale:
                continue
            
            normalized_scale = normalize_fund_scale(original_scale)
            
            # 只有当规模发生变化时才更新
            if normalized_scale is not None and normalized_scale != original_scale:
                update_data.append({
                    'fund_code': fund_code,
                    'latest_scale': normalized_scale
                })
        
        if not update_data:
            logger.info("所有基金规模已经是标准化格式，无需更新")
            return
        
        logger.info("需要更新 %d 条基金规模", len(update_data))
        
        # 批量更新
        update_sql = """
        UPDATE fund_basic_info
        SET latest_scale = %(latest_scale)s, updated_at = NOW()
        WHERE fund_code = %(fund_code)s
        """
        
        with get_cursor() as cursor:
            cursor.executemany(update_sql, update_data)
            affected = cursor.rowcount
        
        logger.info("基金规模更新完成，共影响 %d 条记录", affected)
        
    except Exception as e:
        logger.error("更新基金规模失败：%s", e)


# ──────────────────────────────────────────────────────────────
# 股票型基金净值下载
# ──────────────────────────────────────────────────────────────

_NAV_INSERT_SQL = """
INSERT INTO fund_nav (fund_code, nav_date, accumulated_nav, daily_growth)
VALUES (%(fund_code)s, %(nav_date)s, %(accumulated_nav)s, %(daily_growth)s)
ON DUPLICATE KEY UPDATE
    accumulated_nav=VALUES(accumulated_nav),
    daily_growth=VALUES(daily_growth)
"""

_NAV_DELETE_SQL = "DELETE FROM fund_nav WHERE fund_code = %s"

_NAV_API_INTERVAL = 0.5


def load_stock_fund_codes() -> List[str]:
    """从 fund_basic_info 加载股票型基金代码

    筛选条件：fund_type = '股票型' 且 establish_date 不为空
    """
    try:
        with get_cursor() as cursor:
            cursor.execute("""
                SELECT fund_code FROM fund_basic_info
                WHERE fund_type = '股票型'
                  AND establish_date IS NOT NULL AND LENGTH(establish_date) > 0
                ORDER BY fund_code
            """)
            return [row['fund_code'] for row in cursor.fetchall()]
    except Exception as e:
        logger.error("加载股票型基金代码失败：%s", e)
        return []


def get_processed_nav_fund_codes() -> set:
    """从 fund_nav 表获取已有净值数据的基金代码集合"""
    try:
        with get_cursor() as cursor:
            cursor.execute("SELECT DISTINCT fund_code FROM fund_nav")
            return {row['fund_code'] for row in cursor.fetchall()}
    except Exception as e:
        logger.error("获取已有净值基金代码失败：%s", e)
        return set()


@retry_decorator(max_retries=3, delay=2)
def fetch_single_fund_nav(fund_code: str) -> Optional[pd.DataFrame]:
    """获取单只基金的累计净值走势"""
    df = ak.fund_open_fund_info_em(symbol=fund_code, indicator="累计净值走势")
    if df is None or df.empty:
        return None
    return df


def parse_nav_df(df: pd.DataFrame, fund_code: str) -> list:
    """将净值接口返回的 DataFrame 转为数据库记录列表

    日期从 yyyy-MM-dd 转为 yyyyMMdd
    日增长率通过累计净值计算: (今日 - 昨日) / 昨日 * 100
    """
    records = []
    prev_nav = None
    for _, row in df.iterrows():
        nav_date_raw = str(row.get('净值日期', ''))
        nav_date = nav_date_raw.replace('-', '') if nav_date_raw else None
        if not nav_date or len(nav_date) != 8:
            continue
        accumulated_nav = row.get('累计净值')
        if accumulated_nav is None or (isinstance(accumulated_nav, float) and math.isnan(accumulated_nav)):
            continue
        accumulated_nav = float(accumulated_nav)
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


def delete_fund_nav(fund_code: str) -> int:
    """删除某只基金的已有净值数据"""
    with get_cursor() as cursor:
        cursor.execute(_NAV_DELETE_SQL, (fund_code,))
        return cursor.rowcount


def save_nav_batch(rows: list, batch_size: int = 1000) -> int:
    """净值数据批量写入数据库"""
    if not rows:
        return 0
    total = 0
    with get_cursor() as cursor:
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            cursor.executemany(_NAV_INSERT_SQL, batch)
            total += cursor.rowcount
    return total


def fetch_stock_fund_nav(force: bool = False, test: int = 0) -> None:
    """下载股票型基金的净值数据

    Args:
        force: 全量模式，忽略已有数据重新获取（先删后写）
        test: 测试模式，只处理前 N 只基金（0 表示关闭）
    """
    # 1. 加载股票型基金代码
    fund_codes = load_stock_fund_codes()
    if not fund_codes:
        logger.warning("未找到股票型基金，请确认 fund_basic_info 表中有 fund_type='股票型' 的记录")
        return

    # 2. 增量模式：获取已有净值的基金集合
    processed = set()
    if not force:
        processed = get_processed_nav_fund_codes()
        if processed:
            logger.info("增量模式：%d 只股票型基金已有净值数据，将跳过", len(processed))

    # 3. 测试模式
    if test > 0:
        fund_codes = fund_codes[:test]
        logger.info("测试模式：仅处理前 %d 只股票型基金", test)

    total = len(fund_codes)
    logger.info("共 %d 只股票型基金待处理", total)

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

        # 全量/测试模式：先删后写
        if force or test > 0:
            delete_fund_nav(code)

        df = fetch_single_fund_nav(code)
        if df is None:
            fail_count += 1
            continue

        records = parse_nav_df(df, code)
        if records:
            affected = save_nav_batch(records)
            success_count += 1
            if (i + 1) % 10 == 0 or test > 0:
                logger.info("基金 %s: %d 条净值，写入 %d 行", code, len(records), affected)
        else:
            fail_count += 1

        time.sleep(_NAV_API_INTERVAL)

    logger.info(
        "股票型基金净值下载完成！成功 %d 只，跳过 %d 只，失败 %d 只",
        success_count, skip_count, fail_count,
    )


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description='获取基金基本信息并保存到 MySQL')
    parser.add_argument('--full', action='store_true',
                        help='全量模式：更新所有基金的详细信息（默认增量模式，只更新缺少详细信息的基金）')
    parser.add_argument('--test', type=int, default=0, metavar='N',
                        help='验证模式：只处理前 N 只基金（如 --test 5），便于验证程序正确性')
    parser.add_argument('--update-types', action='store_true',
                        help='更新基金类型模式：根据 fund_type_ttjj 按短横线-分割更新 fund_type 和 fund_type_second')
    parser.add_argument('--update-scales', action='store_true',
                        help='更新基金规模模式：将latest_scale字段单位统一为万，并去掉单位只保留数字')
    parser.add_argument('--update-themes', action='store_true',
                        help='更新基金主题模式：根据基金名称匹配关键词（原油/黄金/煤炭/电力/天然气/算力/存储/芯片/光模块/储能）')
    parser.add_argument('--stock-nav', action='store_true',
                        help='股票型基金净值下载模式：只下载股票型基金的净值数据（默认增量，可搭配 --full 全量）')
    args = parser.parse_args()

    if args.update_types:
        logger.info("=" * 60)
        logger.info("基金类型更新模式")
        logger.info("=" * 60)
        update_fund_types(limit=args.test if args.test > 0 else 0)
        logger.info("处理完成！")
    elif args.update_scales:
        logger.info("=" * 60)
        logger.info("基金规模更新模式")
        logger.info("=" * 60)
        update_fund_scales(limit=args.test if args.test > 0 else 0)
        logger.info("处理完成！")
    elif args.update_themes:
        logger.info("=" * 60)
        logger.info("基金主题更新模式")
        logger.info("=" * 60)
        update_fund_themes(limit=args.test if args.test > 0 else 0)
        logger.info("处理完成！")
    elif args.stock_nav:
        force = args.full
        mode_str = '全量' if force else '增量'
        test_str = f'，仅处理前 {args.test} 只（验证模式）' if args.test > 0 else ''
        logger.info("=" * 60)
        logger.info("股票型基金净值下载（%s模式%s)", mode_str, test_str)
        logger.info("=" * 60)
        fetch_stock_fund_nav(force=force, test=args.test)
        logger.info("处理完成！")
    else:
        incremental = not args.full
        mode_str = '增量' if incremental else '全量'
        test_str = f'，仅处理前 {args.test} 只（验证模式）' if args.test > 0 else ''

        logger.info("=" * 60)
        logger.info("基金基本信息下载（%s模式%s)", mode_str, test_str)
        logger.info("=" * 60)
        fetch_all_fund_basic_info(incremental=incremental, test=args.test)
        logger.info("处理完成！")


if __name__ == "__main__":
    main()
