# 基金视点真实数据接入说明

## 改动概述

将基金视点（资讯/文章）模块从纯 Mock 数据升级为 **AkShare 真实数据 + Mock 降级** 的混合模式。

## 实现架构

### 新增文件

#### `providers/news_provider.py`
- **功能**：资讯数据 Provider，负责从 AkShare 获取真实财经新闻
- **核心函数**：`get_fund_news(category, keyword, page, page_size)`
- **数据源**：`ak.stock_news_em()` - 东方财富财经新闻
- **降级策略**：真实 API 失败时自动回退到 Mock 数据（`ARTICLES_DB`）
- **缓存机制**：5 分钟内存缓存，避免频繁请求

### 修改文件

#### `services/insights_service.py`
- **改动前**：直接从 `repositories.mock_data.ARTICLES_DB` 读取 Mock 数据
- **改动后**：调用 `providers.news_provider.get_fund_news()` 获取数据
- **保留功能**：支持分类过滤、标签过滤、关键词搜索、分页

## 数据流程

```
客户端请求
    ↓
routes/insights.py (/api/insights/articles)
    ↓
services/insights_service.py
    ↓
providers/news_provider.py
    ├─ 尝试获取 AkShare 真实数据
    │   └─ ak.stock_news_em(symbol="基金")
    └─ 失败降级 → repositories/mock_data.py (ARTICLES_DB)
```

## API 接口

### GET `/api/insights/articles`

**请求参数**：
- `category` (可选): 分类过滤（市场展望、行业动态、投资策略、产品分析）
- `tag` (可选): 标签过滤
- `keyword` (可选): 关键词搜索
- `page` (可选): 页码，默认 1
- `page_size` (可选): 每页数量，默认 10

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": "news_xxx",
        "title": "基金回报榜：72只基金昨日回报超3%",
        "summary": "...",
        "category": "市场资讯",
        "author": "东方财富",
        "tags": ["基金", "市场资讯"],
        "views": 0,
        "likes": 0,
        "published_at": "2026-04-14 09:44:00"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 10,
    "hot_tags": ["A股", "宏观", "量化投资", "AI", "ESG"]
  }
}
```

## 降级策略

### 触发条件
1. AkShare API 请求失败（网络错误、限流等）
2. 返回数据为空
3. 缓存中有旧数据时优先返回旧数据

### 降级行为
```python
if not real_articles:
    print("[news_provider] 使用 Mock 数据降级")
    articles = ARTICLES_DB[:]  # 使用预定义的 Mock 数据
else:
    articles = real_articles   # 使用真实数据
```

## 缓存机制

- **缓存时长**：5 分钟（300 秒）
- **缓存键**：`fund_news_{搜索关键词}`
- **缓存策略**：
  - 5 分钟内相同请求直接返回缓存
  - API 失败时如有缓存则返回旧数据
  - 超时后自动刷新

## 测试验证

已测试以下场景：
- ✅ 默认数据获取（成功获取真实新闻）
- ✅ 关键词搜索（AI）
- ✅ 分类过滤（市场资讯）
- ✅ 分页功能

## 优势

1. **真实数据优先**：优先展示最新真实财经资讯
2. **高可用性**：API 失败自动降级，不影响用户体验
3. **性能优化**：5 分钟缓存减少 API 调用频率
4. **向后兼容**：API 接口保持不变，前端无需改动
5. **易于维护**：Provider 模式清晰，方便后续扩展其他数据源

## 后续优化方向

1. 支持更多数据源（新浪财经、同花顺等）
2. 添加数据源优先级配置
3. 实现资讯分类智能映射
4. 增加阅读量和点赞数统计
5. 支持封面图片抓取
