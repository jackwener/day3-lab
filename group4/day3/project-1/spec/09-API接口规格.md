# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-QA-v2 |
| 模块名称 | 投研问答助手 v2.0 — 智能体增强版 |
| 文档版本 | v1.0 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1/agent` |
| Swagger | `http://localhost:5003/api/v1/swagger` |

---

> **本文是全部 API 端点的契约真源，直接对齐 `agent_bp.py` 代码实现**。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 | 对齐 US |
|---|------|------|------|--------|---------|
| 1 | `/api/v1/agent/ask` | POST | 问答提交（三级降级） | 200 | US-002 |
| 2 | `/api/v1/agent/sessions` | GET | 获取会话列表 | 200 | US-001 |
| 3 | `/api/v1/agent/sessions` | POST | 创建会话 | 201 | US-001 |
| 4 | `/api/v1/agent/sessions/<id>` | DELETE | 删除会话（软删除） | 200 | US-001 |
| 5 | `/api/v1/agent/sessions/<id>/records` | GET | 获取问答记录 | 200 | US-001 |
| 6 | `/api/v1/agent/capabilities` | GET | 能力探测 | 200 | US-008 |
| 7 | `/api/v1/agent/parse-report` | POST | 研报解析 | 200 | US-003 |
| 8 | `/api/v1/agent/compare-reports` | POST | 研报对比 | 200 | US-004 |
| 9 | `/api/v1/agent/market-data` | GET | 实时行情查询 | 200 | US-005 |
| 10 | `/api/v1/agent/custom-agents` | GET | 自定义智能体列表 | 200 | US-006 |
| 11 | `/api/v1/agent/custom-agents` | POST | 创建自定义智能体 | 201 | US-006 |
| 12 | `/api/v1/agent/custom-agents/<id>` | PUT | 更新自定义智能体 | 200 | US-006 |
| 13 | `/api/v1/agent/custom-agents/<id>` | DELETE | 删除自定义智能体 | 200 | US-006 |

## 2. 统一响应规范

### 成功响应
```json
{ "traceId": "tr_abc123def456...", /* 业务字段 */ }
```

### 错误响应
```json
{ "error": { "code": "EMPTY_QUERY", "message": "请输入问题", "details": {}, "traceId": "tr_..." } }
```

## 3. POST /ask — 问答提交

**请求体**（`application/json`）：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `query` | string | **是** | 1–500 字符 | 用户提问原文 |
| `session_id` | string | **是** | UUID, active | 目标会话 |
| `system_prompt` | string | 否 | — | 自定义智能体提示词 |
| `context` | string | 否 | — | 研报解析后的追问上下文 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `answer` | string | 是 | 答案文本 |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识（copaw/qwen-turbo/null） |
| `response_time_ms` | integer | 是 | 响应耗时（ms） |
| `answer_source` | string | 是 | copaw / bailian / demo |
| `cited_passages` | array\|null | 是 | CoPaw 引用段落 |

## 4. GET/POST/DELETE /sessions — 会话管理

### POST /sessions（201）
**请求**：`{ "title": "新会话" }` — title 可选，≤100 字符
**响应**：`{ traceId, session_id, title, created_at, updated_at, query_count: 0, status: "active" }`

### GET /sessions（200）
**响应**：`{ traceId, sessions: [...] }` — 仅 status=active，按 created_at 倒序

### DELETE /sessions/<id>（200）
**响应**：`{ traceId, session_id, status: "deleted", deleted_at }` — 软删除

### GET /sessions/<id>/records（200）
**响应**：`{ traceId, records: [...] }` — 按 created_at 正序

## 5. GET /capabilities — 能力探测

**响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | 链路追踪 |
| `copaw_configured` | boolean | IRA_COPAW_ASK_URL 是否配置 |
| `bailian_configured` | boolean | DASHSCOPE_API_KEY 是否配置 |
| `model` | string | 当前模型名 |

## 6. POST /parse-report — 研报解析

**请求体**（`multipart/form-data`）：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `file` | File | **是** | PDF/Word/HTML, ≤ 50MB | 研报文件 |
| `session_id` | string | 否 | UUID | 关联会话 |

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `filename` | string | 原始文件名 |
| `text_preview` | string | 提取文本预览（前 500 字符） |
| `parsed` | ParsedReport | 结构化解析结果 |

**ParsedReport 对象**：title, institution, publish_date, target_company, stock_code, rating, target_price, current_price, summary, financial_forecasts{}, risks[]

## 7. POST /compare-reports — 研报对比

**请求体**（`multipart/form-data`）：files（2~5 份），session_id（可选）

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `comparison` | object | reports[], rating_summary, price_summary, most_bullish, most_bearish |
| `file_count` | integer | 文件数量 |

## 8. GET /market-data — 实时行情

**请求参数**：`?query=贵州茅台今日股价`

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 原始查询 |
| `stocks` | Stock[] | 股票数据数组 |
| `demo` | boolean | 是否为 Demo 数据 |

**Stock 对象**：code, name, current, change, change_pct, open, high, low, volume, amount, date, time

## 9. GET/POST/PUT/DELETE /custom-agents — 自定义智能体

### POST（201）
**请求**：`{ name(≤20), description(≤200), icon(≤10), system_prompt(≤5000) }`
**响应**：完整 agent 对象 + traceId

### GET（200）
**响应**：`{ traceId, agents: [...] }`

### PUT /<id>（200） / DELETE /<id>（200）

## 10. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败码 | error.code |
|------|------|------|--------|-----------|
| POST /ask | query | 非空/非空白 | 400 | EMPTY_QUERY |
| POST /ask | query | ≤ 500 字符 | 400 | INVALID_QUERY |
| POST /ask | session_id | 非空 + active | 404 | SESSION_NOT_FOUND |
| POST /sessions | title | ≤ 100 字符 | 400 | MISSING_FIELD |
| POST /parse-report | file | PDF/Word/HTML | 400 | 错误提示 |
| POST /compare-reports | files | 2~5 份 | 400 | 错误提示 |
| POST /custom-agents | name | ≤ 20 字符 | 400 | MISSING_FIELD |
| POST /custom-agents | system_prompt | ≤ 5000 字符 | 400 | MISSING_FIELD |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-15 | 基于 agent_bp.py 真实代码重写，13 个端点完整契约 |
