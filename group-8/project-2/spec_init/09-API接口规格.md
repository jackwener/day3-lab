# 09 — API 接口规格（引导版模板）

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-QA |
| 模块名称 | 投研问答助手 |
| 文档版本 | v0.1 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1/agent` |

---

> **本文是全部 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端必须返回什么"**，`13` 的测试断言以本文为准。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 |
|---|------|------|------|--------|
| 1 | `/api/v1/agent/capabilities` | GET | 能力探测 | 200 |
| 2 | `/api/v1/agent/ask` | POST | 问答提交 | 200 |
| 3 | `/api/v1/agent/sessions` | GET | 会话列表 | 200 |
| 4 | `/api/v1/agent/sessions` | POST | 新建会话 | 201 |
| 5 | `/api/v1/agent/sessions/<id>` | DELETE | 删除会话 | 200 |
| 6 | `/api/v1/agent/sessions/<id>/records` | GET | 问答记录 | 200 |
| 7 | `/api/v1/agent/reports/upload` | POST | 研报上传与解析 | 200 |
| 8 | `/api/v1/agent/reports` | GET | 研报列表 | 200 |
| 9 | `/api/v1/agent/reports/<id>` | GET | 研报详情 | 200 |
| 10 | `/api/v1/agent/reports/compare` | POST | 研报对比 | 200 |

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
| 404 | `SESSION_NOT_FOUND` | session_id 不存在 | `{"session_id": "..."}` |
| 400 | `INVALID_SESSION_ID` | session_id 格式非法 | `{}` |

## 3. ★ 示例：POST /ask — 问答提交

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `query` | string | **是** | 1–500 字符 | 用户提问原文 |
| `session_id` | string | **是** | UUID | 目标会话 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `answer` | string | 是 | 答案文本 |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识 |
| `response_time_ms` | integer | 是 | 响应耗时（毫秒） |
| `answer_source` | string | 是 | copaw / bailian / demo |

## 4. POST /sessions — 新建会话

> 创建新的问答会话，可选指定会话标题。返回包含 session_id、标题、创建时间和初始问答次数的会话信息。

**请求体**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | "新会话" | 会话标题 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string (UUID) | 是 | 新建会话的唯一标识 |
| `title` | string | 是 | 会话标题，默认"新会话" |
| `created_at` | string (ISO-8601) | 是 | 创建时间（UTC+Z） |
| `query_count` | integer | 是 | 累计问答次数，新建时为 0 |

## 5. GET /sessions — 会话列表

> 获取当前用户的所有会话列表，按创建时间倒序排列。每个会话包含 id、title、created_at、query_count 等基本信息。

> 无请求体，返回 sessions 数组。每个 session 至少包含 id、title、created_at、query_count。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `sessions` | array | 是 | 会话列表 |

**sessions 数组元素**：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `session_id` | string (UUID) | 是 | 会话唯一标识 |
| `title` | string | 是 | 会话标题 |
| `created_at` | string (ISO-8601) | 是 | 创建时间（UTC+Z） |
| `query_count` | integer | 是 | 累计问答次数 |

**响应示例**：

```json
{
  "traceId": "tr_def456...",
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "贵州茅台研报分析",
      "created_at": "2026-04-14T08:30:00Z",
      "query_count": 3
    },
    {
      "session_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "title": "新会话",
      "created_at": "2026-04-14T09:15:00Z",
      "query_count": 0
    }
  ]
}
```

## 6. DELETE /sessions/<id> — 删除会话

> 根据 session_id 删除指定会话及其所有关联的问答记录。路径参数为会话唯一标识，无请求体。

> 路径参数 session_id，无请求体，返回确认消息。注意级联删除关联记录。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `message` | string | 是 | 删除确认消息 |
| `deleted_session_id` | string (UUID) | 是 | 被删除的会话 ID |

**副作用说明**：删除指定会话时，**级联删除**该会话下所有关联的 QARecord 记录（对应 `10` 数据模型中的级联删除逻辑）。

**响应示例**：

```json
{
  "traceId": "tr_ghi789...",
  "message": "会话已删除",
  "deleted_session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**错误响应**（404）：

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在",
    "details": {"session_id": "550e8400-e29b-41d4-a716-446655440000"},
    "traceId": "tr_..."
  }
}
```

## 7. GET /sessions/<id>/records — 问答记录

> 获取指定会话下的所有问答记录列表。路径参数为会话 ID，返回该会话的完整问答历史，每条记录包含问题、答案、时间戳等信息。

> 路径参数 session_id，返回 records 数组。每条记录含 query、answer、timestamp 等。

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `records` | array | 是 | 问答记录列表 |

**records 数组元素**：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 记录唯一标识 |
| `session_id` | string (UUID) | 是 | 所属会话 ID |
| `query` | string | 是 | 用户提问原文 |
| `answer` | string | 是 | LLM/Demo 返回的答案 |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识 |
| `response_time_ms` | integer | 是 | 响应耗时（毫秒） |
| `answer_source` | string | 是 | copaw / bailian / demo |
| `timestamp` | string (ISO-8601) | 是 | 问答时间（UTC+Z） |

**响应示例**：

```json
{
  "traceId": "tr_jkl012...",
  "records": [
    {
      "id": "rec_1713077400",
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "query": "贵州茅台最新评级和目标价是什么？",
      "answer": "根据最新研报，贵州茅台评级为买入，目标价 2100 元...",
      "llm_used": true,
      "model": "qwen-plus",
      "response_time_ms": 1250,
      "answer_source": "bailian",
      "timestamp": "2026-04-14T08:35:00Z"
    }
  ]
}
```

**错误响应**（404）：

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "会话不存在",
    "details": {"session_id": "550e8400-e29b-41d4-a716-446655440000"},
    "traceId": "tr_..."
  }
}
```

## 8. POST /reports/upload — 研报上传与解析

> 上传研报文件（PDF 或 HTML 格式）并自动解析提取关键信息，包括评级、目标价、核心观点、发布机构等。

**请求参数**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `file` | file | 是 | PDF/HTML，≤50MB | 研报文件 |
| `session_id` | string | 是 | UUID 格式 | 关联会话 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `report_id` | string (UUID) | 是 | 研报唯一标识 |
| `file_name` | string | 是 | 原始文件名 |
| `file_type` | string | 是 | pdf 或 html |
| `uploaded_at` | string (ISO-8601) | 是 | 上传时间（UTC+Z） |
| `extracted_data` | object | 是 | 提取结果 |
| `extracted_data.rating` | string\|null | 是 | 评级（买入/增持/中性/减持/卖出） |
| `extracted_data.target_price` | string\|null | 是 | 目标价 |
| `extracted_data.core_opinions` | string[] | 是 | 核心观点列表 |
| `extracted_data.institution` | string\|null | 是 | 发布机构 |
| `extracted_data.publish_date` | string\|null | 是 | 发布日期 |

**错误响应**：

| HTTP | error.code | 说明 |
|------|-----------|------|
| 400 | `INVALID_FILE_TYPE` | 文件格式不支持 |
| 400 | `INVALID_SESSION_ID` | session_id 格式错误 |
| 413 | `FILE_TOO_LARGE` | 文件超过 50MB |
| 404 | `SESSION_NOT_FOUND` | 会话不存在 |
| 422 | `PARSE_FAILED` | 解析失败 |

**响应示例**：

```json
{
  "traceId": "tr_abc123...",
  "report_id": "550e8400-e29b-41d4-a716-446655440001",
  "file_name": "贵州茅台-买入-中信证券.pdf",
  "file_type": "pdf",
  "uploaded_at": "2026-04-14T10:30:00Z",
  "extracted_data": {
    "rating": "买入",
    "target_price": "2100.00",
    "core_opinions": [
      "公司业绩超预期，营收同比增长15%",
      "高端白酒需求韧性强，提价空间充足",
      "渠道库存处于健康水平"
    ],
    "institution": "中信证券",
    "publish_date": "2026-04-10"
  }
}
```

## 9. GET /reports — 研报列表

> 获取研报列表，可按会话 ID 过滤。不传 session_id 时返回全部研报。

**请求参数**（Query）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 否 | 按会话过滤，不传则返回全部 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `reports` | array | 是 | 研报列表 |

**reports 数组元素**：字段同上传响应（含 `report_id`, `file_name`, `file_type`, `uploaded_at`, `extracted_data` 等）。

**响应示例**：

```json
{
  "traceId": "tr_xyz789...",
  "reports": [
    {
      "report_id": "550e8400-e29b-41d4-a716-446655440001",
      "file_name": "贵州茅台-买入-中信证券.pdf",
      "file_type": "pdf",
      "uploaded_at": "2026-04-14T10:30:00Z",
      "extracted_data": {
        "rating": "买入",
        "target_price": "2100.00",
        "core_opinions": ["..."],
        "institution": "中信证券",
        "publish_date": "2026-04-10"
      }
    }
  ]
}
```

## 10. GET /reports/<id> — 研报详情

> 根据 report_id 获取单篇研报的详细信息。

**路径参数**：`report_id`（UUID 格式）

**成功响应**（200）：字段同上传响应（含完整的 `extracted_data`）。

**错误响应**：

| HTTP | error.code | 说明 |
|------|-----------|------|
| 400 | `INVALID_REPORT_ID` | report_id 格式非法 |
| 404 | `REPORT_NOT_FOUND` | 研报不存在 |

## 11. POST /reports/compare — 研报对比

> 对比多篇研报的关键信息，支持 2~5 篇研报同时对比。

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `report_ids` | string[] | 是 | 2~5 个 UUID | 参与对比的研报 ID 列表 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `comparison` | object | 是 | 对比结果 |
| `comparison.columns` | string[] | 是 | 对比维度列表 |
| `comparison.reports` | array | 是 | 各研报对比数据 |

**响应示例**：

```json
{
  "traceId": "tr_def456...",
  "comparison": {
    "columns": ["rating", "target_price", "institution", "publish_date"],
    "reports": [
      {
        "report_id": "550e8400-e29b-41d4-a716-446655440001",
        "file_name": "贵州茅台-买入-中信证券.pdf",
        "rating": "买入",
        "target_price": "2100.00",
        "institution": "中信证券",
        "publish_date": "2026-04-10"
      },
      {
        "report_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "file_name": "贵州茅台-增持-国泰君安.pdf",
        "rating": "增持",
        "target_price": "1950.00",
        "institution": "国泰君安",
        "publish_date": "2026-04-08"
      }
    ]
  }
}
```

**错误响应**：

| HTTP | error.code | 说明 |
|------|-----------|------|
| 400 | `INSUFFICIENT_REPORTS` | report_ids 数量不足（<2 或 >5） |
| 404 | `REPORT_NOT_FOUND` | 任一研报不存在 |

## 12. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| POST /ask | `query` | 非空/非空白 | 400 | `EMPTY_QUERY` |
| POST /ask | `query` | ≤ 500 字符 | 400 | `INVALID_QUERY` |
| POST /ask | `session_id` | 非空 | 400 | `INVALID_QUERY` |
| POST /sessions | `title` | ≤23 字符 | 400 | `INVALID_QUERY` |
| DELETE /sessions/<id> | `session_id` | 合法 UUID | 400 | `INVALID_SESSION_ID` |
| DELETE /sessions/<id> | `session_id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| GET /sessions/<id>/records | `session_id` | 合法 UUID | 400 | `INVALID_SESSION_ID` |
| GET /sessions/<id>/records | `session_id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| POST /reports/upload | `file` | PDF/HTML 格式 | 400 | `INVALID_FILE_TYPE` |
| POST /reports/upload | `file` | ≤ 50MB | 413 | `FILE_TOO_LARGE` |
| POST /reports/upload | `session_id` | 合法 UUID | 400 | `INVALID_SESSION_ID` |
| POST /reports/upload | `session_id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| POST /reports/upload | `file` | 解析成功 | 422 | `PARSE_FAILED` |
| GET /reports | `session_id` | 合法 UUID（如有） | 400 | `INVALID_SESSION_ID` |
| GET /reports/<id> | `report_id` | 合法 UUID | 400 | `INVALID_REPORT_ID` |
| GET /reports/<id> | `report_id` | 研报存在 | 404 | `REPORT_NOT_FOUND` |
| POST /reports/compare | `report_ids` | 2~5 个 ID | 400 | `INSUFFICIENT_REPORTS` |
| POST /reports/compare | `report_ids` | 研报均存在 | 404 | `REPORT_NOT_FOUND` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-14 | 首版填写 |
