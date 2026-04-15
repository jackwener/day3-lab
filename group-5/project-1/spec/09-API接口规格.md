# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M5-RA |
| 模块名称 | 研报智能分析助手 |
| 文档版本 | v0.1 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1` |

---

> **本文是全部 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端必须返回什么"**，`13` 的测试断言以本文为准。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 |
|---|------|------|------|--------|
| 1 | `/api/v1/capabilities` | GET | 能力探测 | 200 |
| 2 | `/api/v1/sessions` | GET | 会话列表 | 200 |
| 3 | `/api/v1/sessions` | POST | 新建会话 | 201 |
| 4 | `/api/v1/sessions/<id>` | DELETE | 删除会话 | 200 |
| 5 | `/api/v1/sessions/<id>/records` | GET | 问答记录 | 200 |
| 6 | `/api/v1/files/upload` | POST | 文件上传 | 201 |
| 7 | `/api/v1/files/<id>/status` | GET | 文件解析状态 | 200 |
| 8 | `/api/v1/ask` | POST | 问答提交 | 200 |
| 9 | `/api/v1/llm/providers` | GET | 可用模型列表 | 200 |
| 10 | `/api/v1/analyze` | POST | 触发深度分析 | 202 |
| 11 | `/api/v1/analyze/<id>/status` | GET | 深度分析状态 | 200 |

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
| 400 | `FILE_TOO_LARGE` | file_size > 100MB | `{"max_size":104857600}` |
| 400 | `FILE_TYPE_INVALID` | file_type 非 pdf/doc/docx | `{"allowed_types":["pdf","doc","docx"]}` |
| 400 | `PARSE_FAILED` | 文件解析异常 | `{"file_id":"..."}` |
| 400 | `SESSION_NOT_FOUND` | session_id 不存在 | `{"session_id":"..."}` |
| 500 | `UPSTREAM_ERROR` | Agent 编排内部异常 | `{}` |

## 3. GET /capabilities — 能力探测

**请求**：无

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `copaw_configured` | boolean | 是 | CoPaw 是否已配置 |
| `bailian_configured` | boolean | 是 | 百炼是否已配置 |
| `model` | string\|null | 是 | 当前使用的模型名 |

## 4. GET /sessions — 会话列表

**请求**：无

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `sessions` | array | 是 | 会话列表，按 updated_at 倒序 |

sessions 数组元素：

| 字段 | 类型 | 说明 |
|------|------|------|
| `session_id` | string | 会话唯一标识 |
| `title` | string | 会话标题 |
| `created_at` | string | 创建时间（ISO-8601） |
| `updated_at` | string | 最后更新时间（ISO-8601） |
| `query_count` | integer | 累计问答次数 |
| `status` | string | 状态：active/archived/deleted |

## 5. POST /sessions — 新建会话

**请求体**：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | string | 否 | "新会话" | 会话标题 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `session_id` | string | 是 | 会话唯一标识（UUID） |
| `title` | string | 是 | 会话标题 |
| `created_at` | string | 是 | 创建时间（ISO-8601） |
| `updated_at` | string | 是 | 最后更新时间（ISO-8601） |
| `query_count` | integer | 是 | 累计问答次数（初始为 0） |
| `status` | string | 是 | 状态：active |

## 6. DELETE /sessions/<id> — 删除会话

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 会话 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `deleted` | boolean | 是 | 是否删除成功 |
| `deleted_records` | integer | 是 | 级联删除的问答记录数量 |

**副作用**：级联删除该会话下的所有 QARecord 和 ReportFile

## 7. GET /sessions/<id>/records — 问答记录

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 会话 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `records` | array | 是 | 问答记录列表，按 timestamp 倒序 |

records 数组元素：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 记录唯一标识 |
| `session_id` | string | 所属会话 ID |
| `file_id` | string\|null | 关联文件 ID |
| `query` | string | 用户提问原文 |
| `answer` | string | AI 回答内容 |
| `llm_used` | boolean | 是否使用真实 LLM |
| `model` | string\|null | 模型标识 |
| `response_time_ms` | integer | 响应耗时（毫秒） |
| `answer_source` | string | copaw / bailian / demo |
| `timestamp` | string | 记录时间（ISO-8601） |

## 8. POST /files/upload — 文件上传

**请求体**（multipart/form-data）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 是 | 所属会话 ID |
| `file` | File | 是 | 上传文件（PDF/Word） |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `file_id` | string | 是 | 文件唯一标识（UUID） |
| `file_name` | string | 是 | 原始文件名 |
| `file_size` | integer | 是 | 文件大小（字节） |
| `file_type` | string | 是 | 文件类型：pdf/doc/docx |
| `parse_status` | string | 是 | 解析状态：pending |
| `created_at` | string | 是 | 上传时间（ISO-8601） |

## 9. GET /files/<id>/status — 文件解析状态

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 文件 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `file_id` | string | 是 | 文件唯一标识 |
| `parse_status` | string | 是 | 解析状态：pending/parsing/completed/failed |
| `parse_progress` | integer\|null | 否 | 解析进度 0-100 |
| `parse_result` | object\|null | 否 | 解析结果（标题、评级、核心观点等） |

## 10. POST /ask — 问答提交

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `query` | string | 是 | 1–500 字符 | 用户提问原文 |
| `session_id` | string | 是 | UUID | 目标会话 ID |
| `file_id` | string | 否 | UUID | 关联研报文件 ID |
| `provider` | string | 否 | — | 指定 LLM Provider ID（如 bailian/deepseek），缺省使用后端默认 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `answer` | string | 是 | 答案文本（结构化 JSON） |
| `llm_used` | boolean | 是 | 是否使用真实 LLM |
| `model` | string\|null | 是 | 模型标识 |
| `response_time_ms` | integer | 是 | 响应耗时（毫秒） |
| `answer_source` | string | 是 | copaw / bailian / demo |

## 11. GET /llm/providers — 可用模型列表

> 对齐 `04` §5.2 大模型切换。返回后端已配置的 LLM Provider 列表，不含 API Key。

**请求**：无

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `providers` | array | 是 | 可用模型列表 |
| `default` | string | 是 | 默认 Provider ID |

providers 数组元素：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Provider 唯一标识（如 bailian/deepseek） |
| `name` | string | 显示名称（如"阿里云百炼"） |
| `model` | string | 模型标识（如 qwen-max） |
| `available` | boolean | 是否可用（已配置 API Key 且连通） |

## 12. POST /analyze — 触发深度分析

> 对齐 `04` §5.4 阶段二。用户手动触发 Skill 深度分析工作流。

**请求体**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `session_id` | string | 是 | 会话 ID |
| `file_id` | string | 是 | 研报文件 ID |

**成功响应**（202 Accepted）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `analyze_id` | string | 是 | 分析任务唯一标识 |
| `status` | string | 是 | 初始状态：queued |

## 13. GET /analyze/<id>/status — 深度分析状态

**路径参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 分析任务 ID |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `analyze_id` | string | 是 | 分析任务 ID |
| `status` | string | 是 | queued / analyzing / completed / failed |
| `progress` | integer\|null | 否 | 分析进度 0-100 |
| `result` | string\|null | 否 | 分析报告（Markdown 格式），仅 completed 时有值 |
| `error` | string\|null | 否 | 错误信息，仅 failed 时有值 |

## 14. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| POST /ask | `query` | 非空/非空白 | 400 | `EMPTY_QUERY` |
| POST /ask | `query` | ≤ 500 字符 | 400 | `INVALID_QUERY` |
| POST /ask | `session_id` | 非空 | 400 | `INVALID_QUERY` |
| POST /files/upload | `file` | 非空 | 400 | `EMPTY_FILE` |
| POST /files/upload | `file.size` | ≤ 100MB | 400 | `FILE_TOO_LARGE` |
| POST /files/upload | `file.type` | pdf/doc/docx | 400 | `FILE_TYPE_INVALID` |
| GET/DELETE /sessions/<id> | `id` | 有效 UUID | 400 | `INVALID_SESSION_ID` |
| GET/DELETE /sessions/<id> | `id` | 存在 | 404 | `SESSION_NOT_FOUND` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-14 | 首版填写 |
| v0.2 | 2026-04-15 | 新增 §11 GET /llm/providers、§12 POST /analyze、§13 GET /analyze/<id>/status；POST /ask 新增 provider 参数 |
