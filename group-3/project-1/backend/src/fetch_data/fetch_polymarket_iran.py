"""从 Polymarket 获取美伊停战概率历史数据

使用 Polymarket CLOB API 获取 US x Iran ceasefire 相关市场的历史概率数据，
保存为 CSV 文件。

Usage:
    python src/fetch_data/fetch_polymarket_iran.py
"""
import json
import os
import sys
import requests
import pandas as pd
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.config import get_logger

logger = get_logger(__name__)

# Polymarket CLOB API 端点
CLOB_BASE = "https://clob.polymarket.com"

# 美伊停战相关市场（从 polymarket.com/event/us-x-iran-ceasefire-by 提取）
# 每个市场有多个结果（Yes/No token），我们需要 Yes token 的价格作为停战概率
CEASEFIRE_MARKETS = [
    {
        "name": "US x Iran ceasefire by April?",
        "question": "Will the US and Iran agree to a ceasefire by April 2026?",
        # 这些 condition_id 需要从市场页面或 Gamma API 获取
        "condition_id": "0x3bae6e4e8c7e3e1e8f7d3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1",
    },
]


def get_market_data_from_gamma(slug: str) -> list:
    """从 Gamma Markets API 获取市场详情（包含 condition_id 和 token_id）

    Args:
        slug: 市场 slug，如 "us-x-iran-ceasefire-by"

    Returns:
        市场数据列表
    """
    url = f"https://gamma-api.polymarket.com/markets?slug={slug}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data if isinstance(data, list) else [data]


def get_market_data_by_condition(condition_id: str) -> dict:
    """从 Gamma API 获取单个市场详情"""
    url = f"https://gamma-api.polymarket.com/markets/{condition_id}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def search_gamma_markets(query: str, limit: int = 20) -> list:
    """搜索 Gamma Markets API"""
    url = f"https://gamma-api.polymarket.com/markets?limit={limit}&active=true&closed=false&order=newest"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    # 过滤包含关键词的市场
    results = []
    for item in data:
        title = item.get("question", "").lower()
        desc = item.get("description", "").lower()
        if query.lower() in title or query.lower() in desc:
            results.append(item)
    return results


def get_prices_history(token_id: str, interval: str = "1d", fidelity: int = 120) -> list:
    """获取代币历史价格（即概率）

    Args:
        token_id: 代币 ID
        interval: 时间间隔 (1m, 5m, 15m, 1h, 6h, 1d, 1w, 1M)
        fidelity: 返回数据点数量

    Returns:
        历史价格列表，每个元素包含 timestamp 和 price
    """
    url = f"{CLOB_BASE}/prices-history"
    params = {
        "market": token_id,
        "interval": interval,
        "fidelity": fidelity,
    }
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("history", [])


def fetch_iran_ceasefire_data() -> pd.DataFrame:
    """获取美伊停战概率历史数据

    流程：
    1. 从 Gamma API 搜索 Iran ceasefire 相关市场
    2. 提取 Yes outcome 的 token_id
    3. 获取历史价格数据
    4. 合并为统一 DataFrame

    Returns:
        包含日期、停战概率等列的 DataFrame
    """
    logger.info("正在从 Polymarket 获取美伊停战相关市场...")

    # 步骤 1: 搜索 Iran ceasefire 市场
    markets = search_gamma_markets("iran ceasefire", limit=50)
    logger.info(f"找到 {len(markets)} 个 Iran ceasefire 相关市场")

    if not markets:
        logger.warning("未找到 Iran ceasefire 市场，尝试更广泛搜索...")
        markets = search_gamma_markets("iran", limit=100)

    all_records = []

    for market in markets:
        question = market.get("question", "")
        condition_id = market.get("condition_id", "")
        outcomes = market.get("outcomes", [])
        tokens = market.get("tokens", [])

        logger.info(f"处理市场: {question}")

        # 找到 Yes outcome 的 token
        yes_token = None
        for token in tokens:
            if token.get("name", "").lower() == "yes" or token.get("outcome", "").lower() == "yes":
                yes_token = token
                break

        # 如果没有明确 Yes token，取第一个 token（通常 Yes 是第一个）
        if not yes_token and tokens:
            yes_token = tokens[0]
            logger.info(f"  未找到明确 Yes token，使用第一个: {yes_token.get('name', '')}")

        if not yes_token:
            logger.warning(f"  跳过（无可用 token）: {question}")
            continue

        token_id = yes_token.get("token_id", "")
        if not token_id:
            logger.warning(f"  跳过（无 token_id）: {question}")
            continue

        logger.info(f"  Token ID: {token_id[:16]}...")

        # 获取历史价格
        try:
            history = get_prices_history(token_id, interval="1d", fidelity=120)
            if not history:
                # 尝试更低粒度
                history = get_prices_history(token_id, interval="6h", fidelity=200)

            if not history:
                logger.warning(f"  无历史数据: {question}")
                continue

            for point in history:
                ts = point.get("timestamp", "")
                price = point.get("price")
                if ts and price is not None:
                    try:
                        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                        all_records.append({
                            "date": dt.strftime("%Y-%m-%d"),
                            "datetime": dt.strftime("%Y-%m-%d %H:%M:%S"),
                            "market_question": question,
                            "ceasefire_probability": float(price),
                        })
                    except (ValueError, TypeError):
                        continue

            logger.info(f"  获取 {len(history)} 条历史价格记录")

        except Exception as e:
            logger.error(f"  获取历史数据失败: {e}")
            continue

    if not all_records:
        logger.error("未能获取任何停战概率数据")
        return pd.DataFrame()

    df = pd.DataFrame(all_records)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["market_question", "date"]).reset_index(drop=True)

    logger.info(f"总共获取 {len(df)} 条记录，覆盖 {df['market_question'].nunique()} 个市场")
    return df


def save_to_csv(df: pd.DataFrame, output_path: str) -> None:
    """保存为 CSV 文件"""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    logger.info(f"数据已保存到: {output_path}")


def main():
    logger.info("=" * 60)
    logger.info("Polymarket 美伊停战概率数据抓取")
    logger.info("=" * 60)

    output_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "data", "iran_ceasefire_probability.csv"
    )

    df = fetch_iran_ceasefire_data()

    if df.empty:
        logger.error("未能获取数据，程序退出")
        return

    # 过滤 2026年2月至今的数据
    cutoff = pd.Timestamp("2026-02-01")
    df_filtered = df[df["date"] >= cutoff].copy()
    logger.info(f"过滤 2026年2月至今数据: {len(df_filtered)} 条（原始 {len(df)} 条）")

    if df_filtered.empty:
        logger.error("过滤后无数据")
        return

    save_to_csv(df_filtered, output_path)

    # 打印摘要
    logger.info("\n数据摘要:")
    for market in df_filtered["market_question"].unique():
        market_df = df_filtered[df_filtered["market_question"] == market]
        latest = market_df.iloc[-1]
        logger.info(f"  市场: {market}")
        logger.info(f"    最新概率: {latest['ceasefire_probability']:.1%} ({latest['date'].strftime('%Y-%m-%d')})")
        logger.info(f"    数据范围: {market_df['date'].min().strftime('%Y-%m-%d')} ~ {market_df['date'].max().strftime('%Y-%m-%d')}")
        logger.info(f"    数据点数: {len(market_df)}")

    logger.info("\n完成！")


if __name__ == "__main__":
    main()
