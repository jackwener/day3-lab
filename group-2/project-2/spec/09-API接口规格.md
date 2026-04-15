# 09 — API 接口规格（引导版模板）

---

| 项 | 值 |
|---|---|
| 模块编号 | M-FundHub |
| 模块名称 | 基金管家（FundHub） |
| 文档版本 | v0.1 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api` |

---

> **本文是全部 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端必须返回什么"**，`13` 的测试断言以本文为准。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 | 关联 US |
|---|------|------|------|--------|---------|
| 1 | `/api/fund/diagnosis` | GET | 基金诊断（综合评级 + 5维评分） | 200 | US-001 |
| 2 | `/api/fund/returns` | GET | 基金历史收益 | 200 | US-002 |
| 3 | `/api/fund/holdings-news` | GET | 持仓股近期资讯 | 200 | US-003 |
| 4 | `/api/market/indices` | GET | 大盘指数概览 | 200 | US-004 |
| 5 | `/api/market/funds` | GET | 基金列表（筛选/排序/搜索） | 200 | US-004 |
| 6 | `/api/insights/articles` | GET | 基金视点资讯列表 | 200 | US-005 |
| 7 | `/api/chat/ask` | POST | AI 基金问答 | 200 | US-006 |
| 8 | `/api/watchlist` | GET | 获取自选基金列表 | 200 | US-007 |
| 9 | `/api/watchlist` | POST | 添加自选基金 | 201 | US-007 |
| 10 | `/api/watchlist/{fund_code}` | DELETE | 删除自选基金 | 200 | US-007 |

## 2. 统一响应规范

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { /* 业务字段 */ },
  "traceId": "tr_abc123..."
}
```

### 错误响应

```json
{
  "code": -1,
  "error": {
    "code": "INVALID_FUND_CODE",
    "message": "基金代码格式不正确",
    "details": {},
    "traceId": "tr_..."
  }
}
```

### 错误码清单

| HTTP | error.code | 触发条件 | details |
|------|-----------|----------|---------|
| 400 | `EMPTY_QUERY` | query 为空/null | `{}` |
| 400 | `INVALID_QUERY` | query 超 500 字符 | `{"max_length":500}` |
| 400 | `INVALID_FUND_CODE` | 基金代码格式不合法 | `{"pattern":"^\\d{6}$"}` |
| 404 | `FUND_NOT_FOUND` | 基金代码不存在 | `{"fund_code":"..."}` |
| 409 | `DUPLICATE_WATCHLIST` | 自选基金已存在 | `{"fund_code":"..."}` |
| 404 | `WATCHLIST_NOT_FOUND` | 自选基金不存在 | `{"fund_code":"..."}` |
| 500 | `LLM_ERROR` | LLM 服务异常 | `{"provider":"..."}` |
| 500 | `UPSTREAM_ERROR` | 上游数据服务异常 | `{"service":"..."}` |

## 3. GET /api/fund/diagnosis — 基金诊断

**查询参数**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `fund_code` | string | **是** | 6位数字 | 基金代码 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `fund_code` | string | 是 | 基金代码 |
| `fund_name` | string | 是 | 基金名称 |
| `fund_type` | string | 是 | 基金类型（混合型/指数型等） |
| `manager` | string | 是 | 基金经理 |
| `company` | string | 是 | 基金公司 |
| `scale` | string | 是 | 基金规模 |
| `nav` | number | 是 | 最新净值 |
| `nav_change` | number | 是 | 日涨跌幅（%） |
| `rating` | integer | 是 | 综合评级（1-5） |
| `rating_label` | string | 是 | 评级标签（优秀/良好/一般） |
| `scores` | object | 是 | 5维评分对象 |
| `scores.returns` | integer | 是 | 收益能力（0-100） |
| `scores.risk_control` | integer | 是 | 风控能力（0-100） |
| `scores.stability` | integer | 是 | 稳定性（0-100） |
| `scores.timing` | integer | 是 | 择时能力（0-100） |
| `scores.stock_picking` | integer | 是 | 选股能力（0-100） |

## 4. GET /api/fund/returns — 基金历史收益

**查询参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fund_code` | string | **是** | 基金代码 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `returns` | object | 是 | 各时段收益率（%） |
| `returns.month_1` | number | 是 | 近1月 |
| `returns.month_3` | number | 是 | 近3月 |
| `returns.month_6` | number | 是 | 近6月 |
| `returns.year_1` | number | 是 | 近1年 |
| `returns.year_3` | number | 是 | 近3年 |
| `returns.since_inception` | number | 是 | 成立以来 |
| `holdings` | array | 是 | 前十大持仓 |
| `holdings[].stock_name` | string | 是 | 股票名称 |
| `holdings[].stock_code` | string | 是 | 股票代码 |
| `holdings[].industry` | string | 是 | 行业标签 |
| `holdings[].weight` | number | 是 | 占比（%） |
| `advice` | object | 是 | 投资建议 |
| `advice.conclusion` | string | 是 | 诊断结论 |
| `advice.suggestions` | array | 是 | 建议列表（string[]） |

## 5. GET /api/fund/holdings-news — 持仓股资讯

**查询参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fund_code` | string | **是** | 基金代码 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `news` | array | 是 | 资讯列表 |
| `news[].id` | string | 是 | 资讯 ID |
| `news[].sentiment` | string | 是 | 情感标签：`positive` / `negative` / `neutral` |
| `news[].stock_name` | string | 是 | 相关股票名称 |
| `news[].stock_code` | string | 是 | 股票代码 |
| `news[].title` | string | 是 | 新闻标题 |
| `news[].source` | string | 是 | 新闻来源 |
| `news[].published_at` | string | 是 | 发布时间（ISO-8601） |

## 6. GET /api/market/indices — 大盘指数

**无查询参数**

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `indices` | array | 是 | 指数列表 |
| `indices[].name` | string | 是 | 指数名称 |
| `indices[].value` | number | 是 | 当前点位 |
| `indices[].change` | number | 是 | 涨跌幅（%） |
| `indices[].volume` | string | 是 | 成交量 |

## 7. GET /api/market/funds — 基金列表

**查询参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `type` | string | 否 | `all` | 基金类型筛选 |
| `keyword` | string | 否 | — | 名称/代码搜索 |
| `sort_by` | string | 否 | `day_change` | 排序字段 |
| `sort_order` | string | 否 | `desc` | `asc` / `desc` |
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页条数（≤100） |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `total` | integer | 是 | 总条数 |
| `funds` | array | 是 | 基金列表 |
| `funds[].fund_code` | string | 是 | 基金代码 |
| `funds[].fund_name` | string | 是 | 基金名称 |
| `funds[].fund_type` | string | 是 | 类型 |
| `funds[].nav` | number | 是 | 最新净值 |
| `funds[].day_change` | number | 是 | 日涨跌（%） |
| `funds[].week_change` | number | 是 | 近1周（%） |
| `funds[].month_change` | number | 是 | 近1月（%） |
| `funds[].year_change` | number | 是 | 近1年（%） |
| `funds[].scale` | string | 是 | 规模 |
| `funds[].risk_level` | string | 是 | 风险等级 |

## 8. GET /api/insights/articles — 资讯列表

**查询参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `category` | string | 否 | `all` | 分类筛选 |
| `keyword` | string | 否 | — | 关键词搜索 |
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 10 | 每页条数 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `total` | integer | 是 | 总条数 |
| `articles` | array | 是 | 文章列表 |
| `articles[].id` | string | 是 | 文章 ID |
| `articles[].title` | string | 是 | 标题 |
| `articles[].summary` | string | 是 | 摘要 |
| `articles[].category` | string | 是 | 分类 |
| `articles[].author` | string | 是 | 作者 |
| `articles[].author_avatar` | string | 否 | 作者头像 URL |
| `articles[].cover_image` | string | 否 | 封面图 URL |
| `articles[].tags` | array | 是 | 标签列表（string[]） |
| `articles[].views` | integer | 是 | 阅读量 |
| `articles[].likes` | integer | 是 | 点赞数 |
| `articles[].published_at` | string | 是 | 发布时间（ISO-8601） |
| `hot_articles` | array | 是 | 热门文章排行 |
| `hot_tags` | array | 是 | 热门标签（string[]） |

## 9. POST /api/chat/ask — AI 基金问答

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `query` | string | **是** | 1–500 字符 | 用户提问原文 |
| `session_id` | string | 否 | UUID | 会话 ID（多轮上下文） |
| `fund_code` | string | 否 | 6位数字 | 关联基金代码 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `answer` | string | 是 | LLM 回复文本 |
| `session_id` | string | 是 | 会话 ID（新建或复用） |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识 |
| `response_time_ms` | integer | 是 | 响应耗时（毫秒） |
| `suggestions` | array | 否 | 推荐追问列表（string[]） |

## 10. GET /api/watchlist — 获取自选基金

**无查询参数**

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `summary` | object | 是 | 持仓汇总 |
| `summary.total_value` | number | 是 | 总市值（元） |
| `summary.total_cost` | number | 是 | 总成本（元） |
| `summary.total_profit` | number | 是 | 总收益（元） |
| `summary.total_profit_rate` | number | 是 | 总收益率（%） |
| `funds` | array | 是 | 自选基金列表 |
| `funds[].fund_code` | string | 是 | 基金代码 |
| `funds[].fund_name` | string | 是 | 基金名称 |
| `funds[].fund_type` | string | 是 | 类型 |
| `funds[].nav` | number | 是 | 最新净值 |
| `funds[].day_change` | number | 是 | 日涨跌（%） |
| `funds[].week_change` | number | 是 | 近1周（%） |
| `funds[].month_change` | number | 是 | 近1月（%） |
| `funds[].profit` | number | 是 | 持有收益（元） |
| `funds[].added_at` | string | 是 | 添加时间（ISO-8601） |

## 11. POST /api/watchlist — 添加自选基金

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `fund_code` | string | **是** | 基金代码 |
| `fund_name` | string | **是** | 基金名称 |
| `cost` | number | 否 | 持仓成本 |
| `shares` | number | 否 | 持有份额 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `fund_code` | string | 是 | 基金代码 |
| `message` | string | 是 | "添加成功" |

## 12. DELETE /api/watchlist/{fund_code} — 删除自选

**路径参数**：`fund_code`（基金代码）

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `fund_code` | string | 是 | 已删除的基金代码 |
| `message` | string | 是 | "删除成功" |

## 13. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| GET /fund/diagnosis | `fund_code` | 非空，6位数字 | 400 | `INVALID_FUND_CODE` |
| GET /fund/returns | `fund_code` | 非空，6位数字 | 400 | `INVALID_FUND_CODE` |
| GET /fund/holdings-news | `fund_code` | 非空，6位数字 | 400 | `INVALID_FUND_CODE` |
| GET /market/funds | `page_size` | 1–100 | 400 | `INVALID_QUERY` |
| POST /chat/ask | `query` | 非空/非空白 | 400 | `EMPTY_QUERY` |
| POST /chat/ask | `query` | ≤ 500 字符 | 400 | `INVALID_QUERY` |
| POST /watchlist | `fund_code` | 非空，6位数字 | 400 | `INVALID_FUND_CODE` |
| POST /watchlist | `fund_code` | 不可重复添加 | 409 | `DUPLICATE_WATCHLIST` |
| DELETE /watchlist/{fund_code} | `fund_code` | 必须存在于自选 | 404 | `WATCHLIST_NOT_FOUND` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2025-04-15 | 首版填写，覆盖 10 个 API 端点 |
