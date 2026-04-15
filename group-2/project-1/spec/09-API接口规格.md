# 09 — API 接口规格（引导版模板）

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-QA |
| 模块名称 | 投研问答助手 |
| 文档版本 | v0.2 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1/agent` |

---

> **本文是全部 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端必须返回什么"**，`13` 的测试断言以本文为准。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 对应 US | 成功码 |
|---|------|------|------|---------|--------|
| 1 | `/api/v1/agent/capabilities` | GET | 能力探测 | US-005 | 200 |
| 2 | `/api/v1/agent/ask` | POST | 问答提交 | US-002 | 200 |
| 3 | `/api/v1/agent/sessions` | GET | 会话列表 | US-001 | 200 |
| 4 | `/api/v1/agent/sessions` | POST | 新建会话 | US-001 | 201 |
| 5 | `/api/v1/agent/sessions/<id>` | DELETE | 删除会话 | US-001 | 200 |
| 6 | `/api/v1/agent/sessions/<id>/records` | GET | 问答记录 | US-004 | 200 |
| 7 | `/api/v1/agent/health` | GET | 健康检查 | US-005 | 200 |
| 8 | `/api/v1/agent/doc/chunks` | GET | 原文溯源 | US-003 | 200 |
| 9 | `/reports` | GET | 研报列表 | US-006 | 200 |
| 10 | `/reports/compare` | POST | 研报对比 | US-006 | 200 |
| 11 | `/news` | GET | 舆情监控 | US-007 | 200 |

## 2. 统一响应规范

### 成功响应

```json
{ "traceId": "tr_abc123...", /* 业务字段 */ }
```

### 错误响应

```json
{ "error": { "code": "EMPTY_QUERY", "message": "请输入问题", "details": {}, "traceId": "tr_..." } }
```

### 错误码清单

| HTTP | error.code | 触发条件 | details |
|------|-----------|----------|---------|
| 400 | `EMPTY_QUERY` | query 为空/null | `{}` |
| 400 | `INVALID_QUERY` | query 超 500 字符 | `{"max_length":500}` |
| 400 | `MISSING_SESSION_ID` | session_id 缺失或为空 | `{}` |
| 404 | `SESSION_NOT_FOUND` | 指定 session_id 不存在 | `{"session_id":"<id>"}` |
| 404 | `DOC_CHUNK_NOT_FOUND` | 指定引用文档块不存在 | `{"chunk_id":"<id>"}` |
| 500 | `LLM_SERVICE_ERROR` | 外部 LLM 调用失败（三级降级均失败） | `{"fallback_chain":"copaw→bailian→demo"}` |
| 503 | `SERVICE_DEGRADED` | 后端核心服务异常 | `{"component":"<组件名>"}` |

## 3. ★ POST /ask — 问答提交

> 对应 US-002（P0）：投研分析师提交研报问题，获取大模型结构化回答。

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `query` | string | **是** | 1–500 字符，非空白 | 用户提问原文 |
| `session_id` | string | **是** | UUID | 目标会话 ID |

**成功响应**（200，SSE 流式）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `answer` | string | 是 | 答案文本（Markdown 格式，含引用标记如 `[1]`） |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识，如 `"copaw"` / `"bailian"` / `null` |
| `response_time_ms` | integer | 是 | 响应耗时（毫秒） |
| `answer_source` | string | 是 | `copaw` / `bailian` / `demo` |
| `references` | array | 否 | 引用出处列表，每项含 `chunk_id`、`doc_title`、`page`、`highlight_text` |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3",
  "answer": "根据研报分析，该股票目标价为 35 元[1]，维持"买入"评级[2]。",
  "llm_used": true,
  "model": "copaw",
  "response_time_ms": 2150,
  "answer_source": "copaw",
  "references": [
    { "chunk_id": "chk_001", "doc_title": "XX证券-个股深度报告.pdf", "page": 5, "highlight_text": "目标价 35 元" },
    { "chunk_id": "chk_002", "doc_title": "XX证券-个股深度报告.pdf", "page": 8, "highlight_text": "维持买入评级" }
  ]
}
```

## 4. POST /sessions — 新建会话

> 对应 US-001（P0）AC-001-01：点击"新建会话"时创建空会话。

**请求体**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | `"新会话"` | 会话标题，最大 100 字符 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 新建会话唯一标识（UUID） |
| `title` | string | 是 | 会话标题 |
| `created_at` | string | 是 | 创建时间（ISO 8601） |
| `query_count` | integer | 是 | 问答条数，新建时为 `0` |

**响应示例**：

```json
{
  "traceId": "tr_d4e5f6",
  "session_id": "sess_8a2b3c4d",
  "title": "新会话",
  "created_at": "2026-04-14T10:30:00Z",
  "query_count": 0
}
```

## 5. GET /sessions — 会话列表

> 对应 US-001（P0）AC-001-02：左侧边栏按时间倒序展示历史会话列表。

**请求参数**：无。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `sessions` | array | 是 | 会话列表，按 `created_at` 倒序排列 |
| `sessions[].session_id` | string | 是 | 会话唯一标识 |
| `sessions[].title` | string | 是 | 会话标题 |
| `sessions[].created_at` | string | 是 | 创建时间（ISO 8601） |
| `sessions[].query_count` | integer | 是 | 该会话下问答条数 |

**响应示例**：

```json
{
  "traceId": "tr_g7h8i9",
  "sessions": [
    { "session_id": "sess_8a2b3c4d", "title": "贵州茅台深度分析", "created_at": "2026-04-14T10:30:00Z", "query_count": 5 },
    { "session_id": "sess_1x2y3z4w", "title": "新能源板块对比", "created_at": "2026-04-13T15:20:00Z", "query_count": 12 }
  ]
}
```

## 6. DELETE /sessions/<id> — 删除会话

> 对应 US-001（P0）AC-001-03：确认后列表即时刷新，被删除项消失。

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | **是** | 目标会话 ID（UUID） |

**请求体**：无。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `message` | string | 是 | 确认消息，如 `"会话已删除"` |
| `deleted_session_id` | string | 是 | 被删除的会话 ID |
| `deleted_records_count` | integer | 是 | 级联删除的关联问答记录条数 |

**副作用说明**：

- 删除 `session_info` 表中对应会话记录
- **级联删除** `message_log` 表中该会话下所有问答记录
- 删除操作不可逆，前端需在调用前完成二次确认弹框

**响应示例**：

```json
{
  "traceId": "tr_j1k2l3",
  "message": "会话已删除",
  "deleted_session_id": "sess_8a2b3c4d",
  "deleted_records_count": 5
}
```

## 7. GET /sessions/<id>/records — 问答记录

> 对应 US-004（P0）：点击历史会话时完整还原聊天上下文，支持接续多轮追问。

**路径参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | **是** | 目标会话 ID（UUID） |

**请求体**：无。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 当前会话 ID |
| `records` | array | 是 | 问答记录列表，按 `timestamp` **正序**排列 |
| `records[].record_id` | string | 是 | 记录唯一标识 |
| `records[].query` | string | 是 | 用户提问原文 |
| `records[].answer` | string | 是 | AI 回答文本（Markdown 格式） |
| `records[].timestamp` | string | 是 | 提问时间（ISO 8601） |
| `records[].answer_source` | string | 是 | `copaw` / `bailian` / `demo` |
| `records[].references` | array | 否 | 引用出处列表 |

**响应示例**：

```json
{
  "traceId": "tr_m4n5o6",
  "session_id": "sess_8a2b3c4d",
  "records": [
    {
      "record_id": "rec_001",
      "query": "贵州茅台最新目标价是多少？",
      "answer": "根据最新研报，目标价为 2150 元[1]。",
      "timestamp": "2026-04-14T10:31:00Z",
      "answer_source": "copaw",
      "references": [{ "chunk_id": "chk_010", "doc_title": "XX证券-茅台深度.pdf", "page": 3, "highlight_text": "目标价 2150 元" }]
    },
    {
      "record_id": "rec_002",
      "query": "与去年相比增长了多少？",
      "answer": "相较去年目标价 1800 元，上调约 19.4%。",
      "timestamp": "2026-04-14T10:32:00Z",
      "answer_source": "copaw",
      "references": []
    }
  ]
}
```

## 8. GET /health — 健康检查

> 对应 US-005（P1）AC-005-01：访问 `/health` 接口返回系统状态。

**请求参数**：无。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `status` | string | 是 | `"UP"` 或 `"DEGRADED"` |
| `components` | object | 是 | 各组件状态 |
| `components.storage` | string | 是 | JSON 文件存储状态：`"UP"` / `"DOWN"` |
| `components.llm_copaw` | string | 是 | CoPaw 模型服务状态：`"UP"` / `"DOWN"` |
| `components.llm_bailian` | string | 是 | 百炼模型服务状态：`"UP"` / `"DOWN"` |

**响应示例**：

```json
{
  "status": "UP",
  "components": {
    "storage": "UP",
    "llm_copaw": "UP",
    "llm_bailian": "UP"
  }
}
```

**降级逻辑**：当 `llm_copaw` 与 `llm_bailian` 均为 `"DOWN"` 时，`status` 返回 `"DEGRADED"`，前端据此展示"当前为 Demo 模式/服务受限"提示（AC-005-02）。

## 9. GET /doc/chunks — 原文溯源

> 对应 US-003（P1）：点击引用标记查看研报原文，支持 PDF 预览定位。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `chunk_id` | string | **是** | 文档块唯一标识 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `chunk_id` | string | 是 | 文档块 ID |
| `doc_title` | string | 是 | 源文档标题 |
| `doc_url` | string | 是 | 源 PDF 文件访问路径 |
| `page` | integer | 是 | 所在页码 |
| `highlight_text` | string | 是 | 需高亮的原文段落 |
| `bbox` | object | 否 | 定位坐标 `{x, y, width, height}`，用于精确滚动定位 |

**响应示例**：

```json
{
  "traceId": "tr_p7q8r9",
  "chunk_id": "chk_001",
  "doc_title": "XX证券-个股深度报告.pdf",
  "doc_url": "/docs/reports/xx_stock_deep_202604.pdf",
  "page": 5,
  "highlight_text": "我们预计公司2026年实现营收约580亿元，目标价35元。",
  "bbox": { "x": 72, "y": 340, "width": 468, "height": 60 }
}
```

## 10. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| POST /ask | `query` | 非空/非空白 | 400 | `EMPTY_QUERY` |
| POST /ask | `query` | ≤ 500 字符 | 400 | `INVALID_QUERY` |
| POST /ask | `session_id` | 非空且为有效 UUID | 400 | `MISSING_SESSION_ID` |
| POST /ask | `session_id` | 对应会话必须存在 | 404 | `SESSION_NOT_FOUND` |
| POST /sessions | `title` | ≤ 100 字符（可选） | 400 | `INVALID_QUERY` |
| DELETE /sessions/<id> | `id` | 非空且为有效 UUID | 400 | `MISSING_SESSION_ID` |
| DELETE /sessions/<id> | `id` | 对应会话必须存在 | 404 | `SESSION_NOT_FOUND` |
| GET /sessions/<id>/records | `id` | 非空且为有效 UUID | 400 | `MISSING_SESSION_ID` |
| GET /sessions/<id>/records | `id` | 对应会话必须存在 | 404 | `SESSION_NOT_FOUND` |
| GET /doc/chunks | `chunk_id` | 非空 | 400 | `MISSING_SESSION_ID` |
| GET /doc/chunks | `chunk_id` | 对应文档块必须存在 | 404 | `DOC_CHUNK_NOT_FOUND` |
| POST /reports/compare | `filenames` | 非空数组，2~5 个元素 | 400 | `INVALID_QUERY` |

## 11. GET /reports — 研报列表

> 对应 US-006（P1）AC-006-01：获取系统中所有可用的研报列表。

**请求参数**：无。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `reports` | array | 是 | 研报列表 |
| `reports[].filename` | string | 是 | 研报文件名 |
| `reports[].companyName` | string | 是 | 公司名称 |
| `reports[].stockCode` | string | 是 | 股票代码 |
| `reports[].title` | string | 是 | 研报标题 |
| `reports[].institution` | string | 是 | 发布机构 |
| `reports[].publishDate` | string | 是 | 发布日期 |
| `reports[].rating` | string | 是 | 投资评级（如"买入""增持"） |
| `reports[].targetPrice` | number | 是 | 目标价 |
| `reports[].currentPrice` | number | 是 | 当前价 |
| `reports[].upside` | number | 是 | 上涨空间（%） |

**响应示例**：

```json
{
  "reports": [
    {
      "filename": "华芯科技2025年度深度研究报告.md",
      "companyName": "华芯科技",
      "stockCode": "688001.SH",
      "title": "华芯科技2025年度深度研究报告",
      "institution": "中金证券研究所",
      "publishDate": "2025年12月15日",
      "rating": "买入",
      "targetPrice": 85.00,
      "currentPrice": 72.30,
      "upside": 17.5
    }
  ]
}
```

## 12. POST /reports/compare — 研报对比

> 对应 US-006（P1）AC-006-02/03：对比选中的多份研报，返回多维度对比数据。

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `filenames` | array | **是** | 2~5 个字符串元素 | 选中的研报文件名列表 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `reports` | array | 是 | 对比结果数组，每项为完整的研报解析数据 |
| `reports[].companyName` | string | 是 | 公司名称 |
| `reports[].rating` | string | 是 | 投资评级 |
| `reports[].targetPrice` | number | 是 | 目标价 |
| `reports[].currentPrice` | number | 是 | 当前价 |
| `reports[].upside` | number | 是 | 上涨空间（%） |
| `reports[].financials` | object | 是 | 财务预测（revenue/netProfit/eps/pe 按年份） |
| `reports[].coreViews` | array | 是 | 核心观点列表 |
| `reports[].risks` | array | 是 | 风险提示列表 |
| `reports[].rdStaff` | number | 否 | 研发人员数 |
| `reports[].patents` | number | 否 | 专利数 |

**响应示例**：

```json
{
  "reports": [
    {
      "companyName": "华芯科技",
      "rating": "买入",
      "targetPrice": 85.00,
      "currentPrice": 72.30,
      "upside": 17.5,
      "financials": {
        "revenue": { "2023A": "45.2", "2024A": "58.7", "2025E": "72.3" },
        "netProfit": { "2023A": "8.5", "2024A": "12.3", "2025E": "16.8" }
      },
      "coreViews": ["AI芯片业务爆发式增长", "国产替代加速"],
      "risks": ["技术风险", "市场竞争风险"],
      "rdStaff": 1820,
      "patents": 387
    }
  ]
}
```

## 13. GET /news — 舆情监控

> 对应 US-007（P1）：获取聚合的市场新闻资讯，支持优先级分级。

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `forceRefresh` | boolean | 否 | 传 `true` 时强制绕过缓存，重新拉取 RSS 源 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `news` | array | 是 | 新闻列表 |
| `news[].id` | string | 是 | 新闻唯一标识（MD5 哈希） |
| `news[].title` | string | 是 | 新闻标题 |
| `news[].summary` | string | 是 | 新闻摘要 |
| `news[].source` | string | 是 | 来源分类 |
| `news[].sourceName` | string | 是 | 来源名称（如"路透社·商业"） |
| `news[].url` | string | 是 | 原文链接 |
| `news[].publishedAt` | string | 是 | 发布时间（ISO 8601） |
| `news[].tags` | array | 是 | 标签列表 |
| `news[].priority` | object | 是 | 优先级信息 |
| `news[].priority.level` | string | 是 | 优先级等级：`urgent` / `high` / `medium` / `normal` |
| `news[].priority.label` | string | 是 | 中文标签：紧急预警 / 重要关注 / 值得关注 / 一般资讯 |
| `news[].priority.score` | number | 是 | 优先级基础分（0~100） |
| `news[].priority.heatScore` | number | 是 | 热度评分 |
| `sources` | array | 是 | 数据源状态列表 |
| `sources[].name` | string | 是 | 数据源名称 |
| `sources[].status` | string | 是 | 连接状态：`connected` / `error` |

**响应示例**：

```json
{
  "news": [
    {
      "id": "abc123def456",
      "title": "央行宣布降准50个基点",
      "summary": "中国人民银行宣布...",
      "source": "财经资讯",
      "sourceName": "路透社·商业",
      "url": "https://...",
      "publishedAt": "2026-04-15T03:00:00Z",
      "tags": ["央行", "货币政策"],
      "priority": {
        "level": "high",
        "label": "重要关注",
        "score": 70,
        "heatScore": 85
      }
    }
  ],
  "sources": [
    { "name": "路透社·商业", "status": "connected" },
    { "name": "CNBC", "status": "error" }
  ]
}
```

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-14 | 首版填写，覆盖会话管理、问答提交、历史记录、原文溯源、健康检查全部端点 |
| v0.2 | 2026-04-15 | 端点从 8 个扩展至 11 个：新增 GET /reports、POST /reports/compare、GET /news |
