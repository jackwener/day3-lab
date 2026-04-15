"""资讯服务 — 文章列表（真实数据 + Mock 降级）"""
from providers import news_provider


def get_articles(category=None, tag=None, keyword=None, page=1, page_size=10):
    """
    获取文章列表
    
    Args:
        category: 分类过滤
        tag: 标签过滤
        keyword: 关键词搜索
        page: 页码
        page_size: 每页数量
    
    Returns:
        dict: 文章列表、总数、分页信息、热门标签
    """
    # 使用 Provider 获取数据（已包含真实数据 + Mock 降级逻辑）
    data = news_provider.get_fund_news(
        category=category,
        keyword=keyword,
        page=page,
        page_size=page_size
    )
    
    # 额外的标签过滤（如果需要）
    if tag:
        data["list"] = [a for a in data["list"] if tag in a.get("tags", [])]
        data["total"] = len(data["list"])
    
    return data
