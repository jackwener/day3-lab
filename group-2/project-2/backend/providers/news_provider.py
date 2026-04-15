"""资讯数据 Provider — AkShare 真实数据 + 降级策略"""
import time
import traceback
import akshare as ak
import pandas as pd
from repositories.mock_data import ARTICLES_DB, HOT_TAGS

# ============ 简易内存缓存 ============
_cache = {}
CACHE_TTL = 300  # 5 分钟


def _get_cached(key, fetcher):
    """带 TTL 的缓存包装"""
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < CACHE_TTL:
        return _cache[key]["data"]
    try:
        data = fetcher()
        _cache[key] = {"data": data, "ts": now}
        return data
    except Exception as e:
        print(f"[news_provider] {key} fetch error: {e}")
        traceback.print_exc()
        # 如果缓存里有旧数据，返回旧数据
        if key in _cache:
            return _cache[key]["data"]
        return None


def get_fund_news(category=None, keyword=None, page=1, page_size=10):
    """
    获取基金相关资讯（真实数据 + Mock 降级）
    
    Args:
        category: 分类（市场展望、行业动态、投资策略、产品分析）
        keyword: 搜索关键词
        page: 页码
        page_size: 每页数量
    
    Returns:
        dict: 包含文章列表、总数、热门标签
    """
    def fetch_real_news():
        """从 AkShare 获取真实财经新闻"""
        # 根据关键词或分类确定搜索词
        search_sym = keyword or category or "基金"
        
        # 使用 AkShare 获取东方财富财经新闻
        df = ak.stock_news_em(symbol=search_sym)
        
        if df is None or df.empty:
            return None
        
        # 数据清洗和转换
        articles = []
        for _, row in df.iterrows():
            # 解析时间
            published_at = row.get("发布时间", "")
            if published_at and isinstance(published_at, str):
                # 确保时间格式正确
                try:
                    if len(published_at) == 14:  # 格式: 20250415103000
                        published_at = f"{published_at[:4]}-{published_at[4:6]}-{published_at[6:8]}T{published_at[8:10]}:{published_at[10:12]}:{published_at[12:14]}Z"
                except:
                    pass
            
            # 内容摘要（截取前200字）
            content = row.get("新闻内容", "")
            summary = content[:200] if content else row.get("新闻标题", "")
            
            articles.append({
                "id": f"news_{row.get('关键词', '')}_{row.get('发布时间', '')}",
                "title": row.get("新闻标题", ""),
                "summary": summary,
                "category": category or "市场资讯",
                "author": row.get("新闻媒体", ""),
                "author_avatar": None,
                "cover_image": None,
                "tags": [keyword] if keyword else ["基金", "市场资讯"],
                "views": 0,
                "likes": 0,
                "published_at": published_at,
                "original_url": row.get("新闻链接", ""),  # 添加原文链接
            })
        
        return articles
    
    # 尝试获取真实数据
    search_symbol = keyword or category or "基金"
    real_articles = _get_cached(f"fund_news_{search_symbol}", fetch_real_news)
    
    # 降级策略：真实数据失败时使用 Mock 数据
    if not real_articles:
        print("[news_provider] 使用 Mock 数据降级")
        articles = ARTICLES_DB[:]
    else:
        articles = real_articles
    
    # 过滤和分页
    if category and category != "全部":
        articles = [a for a in articles if a.get("category") == category]
    
    if keyword:
        kw = keyword.lower()
        articles = [a for a in articles if kw in a.get("title", "").lower() or kw in a.get("summary", "").lower()]
    
    total = len(articles)
    start = (page - 1) * page_size
    end = start + page_size
    
    return {
        "list": articles[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "hot_tags": HOT_TAGS,
    }
