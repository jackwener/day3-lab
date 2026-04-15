"""测试 RSS 新闻抓取

从 doc/rss_sources.json 读取 RSS 源配置，运行抓取并输出结果。

Usage:
    python src/fetch_data/test_rss.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.fetch_data.rss_fetcher import RSSFetcher, save_news_to_situation_week
from src.config import get_logger

logger = get_logger(__name__)


def main():
    # 读取 RSS 源配置
    sources_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "doc", "rss_sources.json"
    )
    with open(sources_path, "r", encoding="utf-8") as f:
        sources = json.load(f)

    logger.info(f"加载 {len(sources)} 个 RSS 源")

    # 打印源列表
    for s in sources:
        logger.info(f"  - {s['name']} ({s['category']})")

    # 抓取配置
    fetcher_config = {
        "request_timeout": 30,
        "retry_times": 2,
        "max_news_per_source": 10,
        "anti_bot": {"enabled": False},
    }

    fetcher = RSSFetcher(fetcher_config)
    news_items = fetcher.fetch_all(sources)

    # 落库
    news_dicts = [item.to_dict() for item in news_items]
    save_news_to_situation_week(news_dicts)

    # 输出结果
    logger.info(f"\n共抓取 {len(news_items)} 条新闻\n")

    # 按来源统计
    from collections import Counter
    source_counts = Counter(item.source for item in news_items)
    for source, count in source_counts.most_common():
        logger.info(f"  {source}: {count} 条")

    # 打印前5条新闻
    logger.info("\n最近5条新闻:")
    for item in news_items[:5]:
        logger.info(f"  [{item.source}] {item.title}")
        if item.published:
            logger.info(f"    发布时间: {item.published.strftime('%Y-%m-%d %H:%M')}")
        logger.info(f"    链接: {item.link}")


if __name__ == "__main__":
    main()
