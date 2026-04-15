# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-QA |
| 模块名称 | 投研问答助手 |
| 文档版本 | v1.0 |
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
| 7 | `/api/v1/agent/sessions/<id>` | PUT | 更新会话标题 | 200 |
| 8 | `/api/v1/agent/reports` | POST | 上传研报 | 201 |
| 9 | `/api/v1/agent/reports` | GET | 研报列表 | 200 |
| 10 | `/api/v1/agent/reports/<id>` | GET | 获取研报详情 | 200 |
| 11 | `/api/v1/agent/reports/<id>` | DELETE | 删除研报 | 200 |
| 12 | `/api/v1/agent/reports/<id>/analyze` | POST | 分析研报 | 200 |
| 13 | `/api/v1/agent/health` | GET | 健康检查 | 200 |
| 14 | `/api/v1/agent/export` | POST | 导出问答记录 | 200 |

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
| 400 | `EMPTY_SESSION_ID` | session_id 为空/null | `{}` |
| 400 | `INVALID_SESSION_ID` | session_id 格式非法 | `{"format":"UUID"}` |
| 404 | `SESSION_NOT_FOUND` | 会话不存在 | `{"session_id":"xxx"}` |
| 400 | `EMPTY_FILE` | 上传文件为空 | `{}` |
| 400 | `INVALID_FILE_TYPE` | 文件类型不支持 | `{"supported":["pdf","doc","docx"]}` |
| 400 | `INVALID_TITLE` | 标题超 100 字符 | `{"max_length":100}` |
| 404 | `REPORT_NOT_FOUND` | 研报不存在 | `{"report_id":"xxx"}` |
| 500 | `LLM_UNAVAILABLE` | LLM服务不可用 | `{"fallback":"demo"}` |
| 500 | `ANALYSIS_FAILED` | 研报分析失败 | `{"report_id":"xxx"}` |
| 400 | `INVALID_REPORT_COUNT` | 导出时研报数量不足2个 | `{"min_count":2}` |
| 400 | `INVALID_FORMAT` | 导出格式不支持 | `{"supported":["json","txt"]}` |

## 3. GET /capabilities — 能力探测

> 获取系统当前配置的能力状态，用于Header区域展示LLM配置状态。

**请求体**：无

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `copaw_configured` | boolean | 是 | CoPaw LLM是否已配置 |
| `bailian_configured` | boolean | 是 | 百炼(DashScope)是否已配置 |
| `demo_available` | boolean | 是 | Demo离线兜底是否可用 |
| `version` | string | 是 | API版本号 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "copaw_configured": true,
  "bailian_configured": true,
  "demo_available": true,
  "version": "v1.0"
}
```

## 4. POST /ask — 问答提交

> 用户提交问题，系统返回AI回答。支持LLM三级降级：CoPaw → 百炼 → Demo离线兜底。

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
| `sources` | array | 否 | 回答引用来源列表 |
| `sources[].report_id` | string | 否 | 来源研报ID |
| `sources[].report_title` | string | 否 | 来源研报标题 |
| `sources[].institution` | string | 否 | 发布机构 |
| `sources[].date` | string | 否 | 发布日期 |
| `sources[].page` | string | 否 | 页码/段落位置 |
| `sources[].snippet` | string | 否 | 原文片段 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "answer": "宁德时代2024年营收同比增长15%，达到3500亿元。净利润增长20%至450亿元。",
  "llm_used": true,
  "model": "gpt-4",
  "response_time_ms": 1250,
  "answer_source": "copaw",
  "sources": [
    {
      "report_id": "rep_789xyz",
      "report_title": "宁德时代2024年深度研报",
      "institution": "中信证券",
      "date": "2024-12-15",
      "page": "第12页",
      "snippet": "2024年全年营收预计达3500亿元，同比增长15%..."
    }
  ]
}
```

## 5. POST /sessions — 新建会话

> 创建新会话，用于开启独立的AI对话任务。

**请求体**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | "新会话" | 会话标题，最大100字符 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 会话唯一标识（UUID） |
| `title` | string | 是 | 会话标题 |
| `created_at` | string | 是 | 创建时间（ISO 8601格式） |
| `query_count` | integer | 是 | 当前会话问答次数，初始为0 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "新会话",
  "created_at": "2025-04-15T10:30:00Z",
  "query_count": 0
}
```

## 6. GET /sessions — 会话列表

> 获取当前用户的所有会话列表，按时间倒序排列。

**查询参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码，从1开始 |
| `page_size` | integer | 否 | 20 | 每页数量，最大100 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `total` | integer | 是 | 总会话数 |
| `page` | integer | 是 | 当前页码 |
| `page_size` | integer | 是 | 每页数量 |
| `sessions` | array | 是 | 会话列表 |
| `sessions[].session_id` | string | 是 | 会话唯一标识 |
| `sessions[].title` | string | 是 | 会话标题 |
| `sessions[].created_at` | string | 是 | 创建时间 |
| `sessions[].updated_at` | string | 是 | 最后更新时间 |
| `sessions[].query_count` | integer | 是 | 问答次数 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "total": 15,
  "page": 1,
  "page_size": 20,
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "新能源行业分析",
      "created_at": "2025-04-15T10:30:00Z",
      "updated_at": "2025-04-15T11:00:00Z",
      "query_count": 5
    }
  ]
}
```

## 7. DELETE /sessions/<id> — 删除会话

> 删除指定会话，级联删除该会话下的所有问答记录。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话ID（UUID） |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `deleted` | boolean | 是 | 是否删除成功 |
| `session_id` | string | 是 | 被删除的会话ID |

**副作用**：级联删除该会话下的所有问答记录（records）。

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "deleted": true,
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## 8. PUT /sessions/<id> — 更新会话标题

> 更新会话标题，用于首次问答后自动命名。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话ID（UUID） |

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `title` | string | **是** | ≤ 100 字符 | 新的会话标题 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 会话ID |
| `title` | string | 是 | 更新后的标题 |
| `updated_at` | string | 是 | 更新时间 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "宁德时代2024年财报分析",
  "updated_at": "2025-04-15T11:05:00Z"
}
```

## 9. GET /sessions/<id>/records — 问答记录

> 获取指定会话的问答记录列表。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 会话ID（UUID） |

**查询参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 会话ID |
| `total` | integer | 是 | 总记录数 |
| `records` | array | 是 | 问答记录列表 |
| `records[].record_id` | string | 是 | 记录唯一标识 |
| `records[].query` | string | 是 | 用户提问 |
| `records[].answer` | string | 是 | 系统回答 |
| `records[].timestamp` | string | 是 | 回答时间 |
| `records[].llm_used` | boolean | 是 | 是否使用真实LLM |
| `records[].model` | string\|null | 是 | 模型标识 |
| `records[].answer_source` | string | 是 | copaw / bailian / demo |
| `records[].sources` | array | 否 | 引用来源列表 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "total": 5,
  "records": [
    {
      "record_id": "rec_123456789",
      "query": "分析宁德时代2024年财报",
      "answer": "宁德时代2024年营收同比增长15%...",
      "timestamp": "2025-04-15T10:35:00Z",
      "llm_used": true,
      "model": "gpt-4",
      "answer_source": "copaw",
      "sources": [
        {
          "report_id": "rep_789xyz",
          "report_title": "宁德时代2024年深度研报",
          "institution": "中信证券",
          "date": "2024-12-15",
          "page": "第12页",
          "snippet": "2024年全年营收预计达3500亿元..."
        }
      ]
    }
  ]
}
```

## 10. POST /reports — 上传研报

> 上传研报文件，支持PDF/Word格式。

**请求体**（multipart/form-data）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | file | **是** | 研报文件，支持pdf/doc/docx，最大50MB |
| `title` | string | 否 | 研报标题，默认使用文件名 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `report_id` | string | 是 | 研报唯一标识 |
| `title` | string | 是 | 研报标题 |
| `filename` | string | 是 | 原始文件名 |
| `file_size` | integer | 是 | 文件大小（字节） |
| `uploaded_at` | string | 是 | 上传时间 |
| `status` | string | 是 | pending / analyzing / analyzed / failed |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "report_id": "rep_789xyz",
  "title": "宁德时代2024年深度研报",
  "filename": "宁德时代2024研报.pdf",
  "file_size": 2048576,
  "uploaded_at": "2025-04-15T10:30:00Z",
  "status": "pending"
}
```

## 11. GET /reports — 研报列表

> 获取研报列表，支持分页和状态筛选。

**查询参数**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 20 | 每页数量 |
| `status` | string | 否 | - | 按状态筛选：pending/analyzing/analyzed/failed |
| `company` | string | 否 | - | 按公司名称筛选 |
| `industry` | string | 否 | - | 按行业标签筛选 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `total` | integer | 是 | 总研报数 |
| `page` | integer | 是 | 当前页码 |
| `page_size` | integer | 是 | 每页数量 |
| `reports` | array | 是 | 研报列表 |
| `reports[].report_id` | string | 是 | 研报ID |
| `reports[].title` | string | 是 | 研报标题 |
| `reports[].filename` | string | 是 | 文件名 |
| `reports[].company` | string | 否 | 公司名称 |
| `reports[].industry` | string | 否 | 行业标签 |
| `reports[].institution` | string | 否 | 发布机构 |
| `reports[].status` | string | 是 | 分析状态 |
| `reports[].uploaded_at` | string | 是 | 上传时间 |
| `reports[].analyzed_at` | string\|null | 是 | 分析完成时间 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "total": 10,
  "page": 1,
  "page_size": 20,
  "reports": [
    {
      "report_id": "rep_789xyz",
      "title": "宁德时代2024年深度研报",
      "filename": "宁德时代2024研报.pdf",
      "company": "宁德时代",
      "industry": "新能源",
      "institution": "中信证券",
      "status": "analyzed",
      "uploaded_at": "2025-04-15T10:30:00Z",
      "analyzed_at": "2025-04-15T10:35:00Z"
    }
  ]
}
```

## 12. GET /reports/<id> — 获取研报详情

> 获取指定研报的详细信息。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 研报ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `report` | object | 是 | 研报详情 |
| `report.report_id` | string | 是 | 研报ID |
| `report.title` | string | 是 | 研报标题 |
| `report.filename` | string | 是 | 原始文件名 |
| `report.file_type` | string | 是 | 文件类型（pdf/doc/docx） |
| `report.file_path` | string | 是 | 文件存储路径 |
| `report.status` | string | 是 | pending/analyzing/analyzed/failed |
| `report.company` | string\|null | 否 | 公司名称 |
| `report.industry` | string\|null | 否 | 行业标签 |
| `report.institution` | string\|null | 否 | 发布机构 |
| `report.uploaded_at` | string | 是 | 上传时间 |
| `report.analyzed_at` | string\|null | 是 | 分析完成时间 |
| `report.analysis_result` | object\|null | 否 | 分析结果 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "report": {
    "report_id": "rep_789xyz",
    "title": "宁德时代2024年深度研报",
    "filename": "宁德时代2024研报.pdf",
    "file_type": "pdf",
    "file_path": "/data/uploads/rep_789xyz.pdf",
    "status": "analyzed",
    "company": "宁德时代",
    "industry": "新能源",
    "institution": "中信证券",
    "uploaded_at": "2025-04-15T10:30:00Z",
    "analyzed_at": "2025-04-15T10:35:00Z",
    "analysis_result": {
      "extracted_entities": {
        "company": "宁德时代",
        "industry": "新能源",
        "institution": "中信证券"
      },
      "summary": "该研报为宁德时代的行业分析报告..."
    }
  }
}
```

## 13. DELETE /reports/<id> — 删除研报

> 删除指定研报。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 研报ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `deleted` | boolean | 是 | 是否删除成功 |
| `report_id` | string | 是 | 被删除的研报ID |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "deleted": true,
  "report_id": "rep_789xyz"
}
```

## 14. POST /reports/<id>/analyze — 分析研报

> 触发研报分析，提取关键指标和摘要。

**路径参数**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 研报ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `report_id` | string | 是 | 研报ID |
| `status` | string | 是 | analyzing / analyzed |
| `analysis` | object\|null | 是 | 分析结果（仅status=analyzed时有值） |
| `analysis.company` | string | 否 | 公司名称 |
| `analysis.institution` | string | 否 | 发布机构 |
| `analysis.publish_date` | string | 否 | 发布日期 |
| `analysis.industry` | string | 否 | 行业 |
| `analysis.researcher` | string | 否 | 研究员 |
| `summary` | string | 否 | 研报摘要 |
| `key_metrics` | array | 否 | 关键指标数组 |
| `key_metrics[].name` | string | 否 | 指标名称 |
| `key_metrics[].value` | string | 否 | 指标值 |
| `key_metrics[].unit` | string | 否 | 单位 |
| `investment_rating` | string | 否 | 投资评级 |
| `target_price` | string | 否 | 目标价 |
| `risk_factors` | array | 否 | 风险因素列表 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "report_id": "rep_789xyz",
  "status": "analyzed",
  "analysis": {
    "company": "宁德时代",
    "institution": "中信证券",
    "publish_date": "2024-12-15",
    "industry": "新能源",
    "researcher": "张三",
    "summary": "宁德时代2024年业绩稳健增长，全球动力电池龙头地位稳固...",
    "key_metrics": [
      {"name": "营收", "value": "3500", "unit": "亿元"},
      {"name": "营收增速", "value": "15", "unit": "%"},
      {"name": "净利润", "value": "450", "unit": "亿元"}
    ],
    "investment_rating": "买入",
    "target_price": "280元",
    "risk_factors": ["原材料价格波动", "市场竞争加剧"]
  }
}
```

## 15. GET /health — 健康检查

> 获取系统健康状态和运行指标。

**请求体**：无

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `status` | string | 是 | healthy / degraded / unhealthy |
| `timestamp` | string | 是 | 检查时间 |
| `services` | object | 是 | 各服务状态 |
| `services.llm` | object | 是 | LLM服务状态 |
| `services.llm.status` | string | 是 | available / unavailable |
| `services.llm.provider` | string | 否 | copaw / bailian / demo |
| `services.database` | string | 是 | ok / error |
| `metrics` | object | 是 | 运行指标 |
| `metrics.active_sessions` | integer | 是 | 活跃会话数 |
| `metrics.total_queries` | integer | 是 | 总查询次数 |
| `metrics.avg_response_time_ms` | integer | 是 | 平均响应时间 |
| `metrics.total_reports` | integer | 是 | 研报总数 |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "status": "healthy",
  "timestamp": "2025-04-15T10:30:00Z",
  "services": {
    "llm": {
      "status": "available",
      "provider": "copaw"
    },
    "database": "ok"
  },
  "metrics": {
    "active_sessions": 12,
    "total_queries": 156,
    "avg_response_time_ms": 1200,
    "total_reports": 25
  }
}
```

## 16. POST /export — 导出问答记录

> 导出会话的问答记录为JSON或TXT格式。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | **是** | 要导出的会话ID |
| `format` | string | **是** | 导出格式：json / txt |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `export_id` | string | 是 | 导出任务ID |
| `status` | string | 是 | processing / completed |
| `download_url` | string\|null | 是 | 下载链接（仅completed时有值） |
| `expires_at` | string\|null | 是 | 链接过期时间（5分钟后） |

**响应示例**：
```json
{
  "traceId": "tr_abc123def456",
  "export_id": "exp_123xyz",
  "status": "completed",
  "download_url": "/api/v1/agent/download/exp_123xyz",
  "expires_at": "2025-04-15T10:35:00Z"
}
```

## 17. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| POST /ask | `query` | 非空/非空白 | 400 | `EMPTY_QUERY` |
| POST /ask | `query` | ≤ 500 字符 | 400 | `INVALID_QUERY` |
| POST /ask | `session_id` | 非空 | 400 | `EMPTY_SESSION_ID` |
| POST /ask | `session_id` | UUID格式 | 400 | `INVALID_SESSION_ID` |
| POST /sessions | `title` | ≤ 100 字符 | 400 | `INVALID_TITLE` |
| PUT /sessions/<id> | `title` | ≤ 100 字符 | 400 | `INVALID_TITLE` |
| GET /sessions/<id>/records | `id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| DELETE /sessions/<id> | `id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| POST /reports | `file` | 非空 | 400 | `EMPTY_FILE` |
| POST /reports | `file` | 类型为pdf/doc/docx | 400 | `INVALID_FILE_TYPE` |
| GET /reports/<id> | `id` | 研报存在 | 404 | `REPORT_NOT_FOUND` |
| DELETE /reports/<id> | `id` | 研报存在 | 404 | `REPORT_NOT_FOUND` |
| POST /reports/<id>/analyze | `id` | 研报存在 | 404 | `REPORT_NOT_FOUND` |
| POST /export | `session_id` | 会话存在 | 404 | `SESSION_NOT_FOUND` |
| POST /export | `format` | 值为json/txt | 400 | `INVALID_FORMAT` |

## 18. 需求追溯矩阵

| 需求编号 | UserStory | 对应端点 |
|----------|-----------|----------|
| REQ-M1QA-001 | 新建会话并提问 | POST /sessions, POST /ask |
| REQ-M1QA-002 | 查看与切换历史会话 | GET /sessions, GET /sessions/<id>/records |
| REQ-M1QA-003 | 删除会话 | DELETE /sessions/<id> |
| REQ-M1QA-004 | 问答记录导出 | POST /export |
| REQ-M1QA-005 | 会话自动命名 | PUT /sessions/<id> |
| REQ-M1QA-006 | LLM三级降级兜底 | POST /ask |
| REQ-M1QA-007 | 研报信息抽取与对比 | POST /reports, GET /reports, DELETE /reports/<id>, POST /reports/<id>/analyze, POST /ask |
| REQ-M1QA-008 | 系统能力状态查看 | GET /capabilities, GET /health |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2025-04-15 | 基于03/04/05文档生成完整API规范 |
| v1.1 | 2025-04-15 | 新增 GET /reports/<id> 研报详情接口，更新端点编号 |
