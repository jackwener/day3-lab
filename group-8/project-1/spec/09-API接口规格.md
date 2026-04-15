# 09 — API 接口规格

---

| 项       | 值                       |
| -------- | ------------------------ |
| 模块编号 | M2-Review                |
| 模块名称 | 研报审核助手             |
| 文档版本 | v0.1                     |
| 阶段     | Design（How — 契约真源） |
| Base URL | `/api/v1`                |

---

> **本文是全部 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端必须返回什么"**，`13` 的测试断言以本文为准。

## 1. 端点总览

| #   | 端点                                 | 方法  | 功能           | 成功码 | 所属模块  |
| --- | ------------------------------------ | ----- | -------------- | ------ | --------- |
| 1   | `/api/v1/dashboard/stats`            | GET   | 仪表盘概览统计 | 200    | Dashboard |
| 2   | `/api/v1/dashboard/trend`            | GET   | 近7日审核趋势  | 200    | Dashboard |
| 3   | `/api/v1/dashboard/top-issues`       | GET   | 常见问题TOP5   | 200    | Dashboard |
| 4   | `/api/v1/reviews`                    | POST  | 提交审核       | 201    | Reviews   |
| 5   | `/api/v1/reviews`                    | GET   | 审核历史列表   | 200    | Reviews   |
| 6   | `/api/v1/reviews/<review_id>`        | GET   | 审核报告详情   | 200    | Reviews   |
| 7   | `/api/v1/reviews/<review_id>/status` | GET   | 审核状态查询   | 200    | Reviews   |
| 8   | `/api/v1/reviews/<review_id>/export` | GET   | 导出审核报告   | 200    | Reviews   |
| 9   | `/api/v1/rules`                      | GET   | 规则列表       | 200    | Rules     |
| 10  | `/api/v1/rules/<rule_id>`            | PATCH | 更新规则状态   | 200    | Rules     |

## 2. 统一响应规范

### 2.1 成功响应

```json
{
  "traceId": "tr_abc123def456",
  "data": {
    /* 业务字段 */
  }
}
```

### 2.2 分页响应

```json
{
  "traceId": "tr_abc123def456",
  "data": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "list": [
      /* 数据列表 */
    ]
  }
}
```

### 2.3 错误响应

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "具体错误描述",
    "details": {},
    "traceId": "tr_abc123def456"
  }
}
```

### 2.4 错误码清单

| HTTP | error.code               | 触发条件                                     | details                 |
| ---- | ------------------------ | -------------------------------------------- | ----------------------- |
| 400  | `INVALID_REQUEST`        | 通用参数校验失败（缺少必填字段、格式错误等） | `{}`                    |
| 400  | `FILE_TOO_LARGE`         | 上传文件大小 > 50MB                          | `{}`                    |
| 400  | `UNSUPPORTED_FILE_TYPE`  | 文件格式非 PDF/DOCX/DOC                      | `{}`                    |
| 404  | `REVIEW_NOT_FOUND`       | 审核记录不存在                               | `{"id": "<review_id>"}` |
| 404  | `RULE_NOT_FOUND`         | 规则不存在                                   | `{"id": "<rule_id>"}`   |
| 409  | `REVIEW_IN_PROGRESS`     | 审核正在进行中，不可重复提交                 | `{}`                    |
| 500  | `INTERNAL_ERROR`         | 服务器内部异常                               | `{}`                    |
| 503  | `AI_SERVICE_UNAVAILABLE` | AI 审核服务不可用                            | `{}`                    |

## 3. 端点详细规格

---

### 3.1 GET /api/v1/dashboard/stats — 仪表盘概览统计

> 返回审核系统的核心概览指标。

**请求参数**：无

**成功响应**（200）：

| 字段                         | 类型    | 必有 | 说明                        |
| ---------------------------- | ------- | ---- | --------------------------- |
| `traceId`                    | string  | 是   | 链路追踪 ID                 |
| `data.totalReviews`          | integer | 是   | 审核总数                    |
| `data.passRate`              | number  | 是   | 通过率（0-100）             |
| `data.avgScore`              | number  | 是   | 平均评分（0-100）           |
| `data.avgDuration`           | string  | 是   | 平均审核耗时（如"2分30秒"） |
| `data.todayCount`            | integer | 是   | 今日审核数                  |
| `data.pendingCount`          | integer | 是   | 待处理数                    |
| `data.complianceIssuesTotal` | integer | 是   | 合规问题累计总数            |
| `data.contentIssuesTotal`    | integer | 是   | 内容问题累计总数            |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "totalReviews": 156,
    "passRate": 72.4,
    "avgScore": 81.3,
    "avgDuration": "2分30秒",
    "todayCount": 8,
    "pendingCount": 3,
    "complianceIssuesTotal": 42,
    "contentIssuesTotal": 89
  }
}
```

---

### 3.2 GET /api/v1/dashboard/trend — 近7日审核趋势

> 返回近 7 日每天的审核数量与通过/未通过统计。

**请求参数**：无

**成功响应**（200）：

| 字段                  | 类型    | 必有 | 说明                     |
| --------------------- | ------- | ---- | ------------------------ |
| `traceId`             | string  | 是   | 链路追踪 ID              |
| `data.trend`          | array   | 是   | 趋势数据数组（7 个元素） |
| `data.trend[].day`    | string  | 是   | 日期（如"04-15"）        |
| `data.trend[].total`  | integer | 是   | 当日审核总数             |
| `data.trend[].passed` | integer | 是   | 当日通过数               |
| `data.trend[].failed` | integer | 是   | 当日未通过数             |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "trend": [
      { "day": "04-09", "total": 12, "passed": 9, "failed": 3 },
      { "day": "04-10", "total": 15, "passed": 11, "failed": 4 },
      { "day": "04-11", "total": 10, "passed": 8, "failed": 2 },
      { "day": "04-12", "total": 14, "passed": 10, "failed": 4 },
      { "day": "04-13", "total": 11, "passed": 9, "failed": 2 },
      { "day": "04-14", "total": 13, "passed": 10, "failed": 3 },
      { "day": "04-15", "total": 8, "passed": 6, "failed": 2 }
    ]
  }
}
```

---

### 3.3 GET /api/v1/dashboard/top-issues — 常见问题TOP5

> 返回出现频率最高的 5 类审核问题。

**请求参数**：无

**成功响应**（200）：

| 字段                  | 类型    | 必有 | 说明                      |
| --------------------- | ------- | ---- | ------------------------- |
| `traceId`             | string  | 是   | 链路追踪 ID               |
| `data.issues`         | array   | 是   | 问题统计数组（最多 5 个） |
| `data.issues[].name`  | string  | 是   | 问题名称                  |
| `data.issues[].count` | integer | 是   | 出现次数                  |
| `data.issues[].pct`   | integer | 是   | 占比百分比                |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "issues": [
      { "name": "数据来源标注缺失", "count": 35, "pct": 27 },
      { "name": "风险提示不完整", "count": 28, "pct": 21 },
      { "name": "敏感信息泄露", "count": 22, "pct": 17 },
      { "name": "投资评级不一致", "count": 18, "pct": 14 },
      { "name": "政治敏感词", "count": 12, "pct": 9 }
    ]
  }
}
```

---

### 3.4 POST /api/v1/reviews — 提交审核

> 上传研报文件并启动审核流程。

**请求体**（multipart/form-data）：

| 字段         | 类型   | 必填   | 约束                       | 说明     |
| ------------ | ------ | ------ | -------------------------- | -------- |
| `file`       | File   | **是** | PDF/DOCX/DOC, ≤50MB        | 研报文件 |
| `reportType` | string | **是** | 枚举值（见 §4）            | 研报类型 |
| `mode`       | string | **是** | `rule` / `ai` / `combined` | 审核模式 |

**成功响应**（201）：

| 字段           | 类型   | 必有 | 说明                             |
| -------------- | ------ | ---- | -------------------------------- |
| `traceId`      | string | 是   | 链路追踪 ID                      |
| `data.id`      | string | 是   | 审核记录 ID（如 `RV-2026-0001`） |
| `data.status`  | string | 是   | 审核状态（初始为 `pending`）     |
| `data.message` | string | 是   | 提示信息                         |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "id": "RV-2026-0042",
    "status": "pending",
    "message": "审核已提交，正在处理中"
  }
}
```

**错误场景**：

| 条件            | HTTP | error.code              |
| --------------- | ---- | ----------------------- |
| 未提供文件      | 400  | `INVALID_REQUEST`       |
| 文件为空        | 400  | `INVALID_REQUEST`       |
| 文件格式不支持  | 400  | `UNSUPPORTED_FILE_TYPE` |
| 文件超过 50MB   | 400  | `FILE_TOO_LARGE`        |
| reportType 无效 | 400  | `INVALID_REQUEST`       |
| mode 无效       | 400  | `INVALID_REQUEST`       |

---

### 3.5 GET /api/v1/reviews — 审核历史列表

> 分页查询审核历史记录，支持多维度筛选。

**请求参数**（Query）：

| 字段        | 类型    | 必填 | 默认值 | 说明                               |
| ----------- | ------- | ---- | ------ | ---------------------------------- |
| `page`      | integer | 否   | 1      | 页码（≥1）                         |
| `pageSize`  | integer | 否   | 20     | 每页数量（1-100）                  |
| `search`    | string  | 否   | —      | 搜索关键词（匹配标题/作者）        |
| `status`    | string  | 否   | —      | 状态筛选（枚举值见 §4）            |
| `mode`      | string  | 否   | —      | 模式筛选（`rule`/`ai`/`combined`） |
| `startDate` | string  | 否   | —      | 开始日期（`YYYY-MM-DD`）           |
| `endDate`   | string  | 否   | —      | 结束日期（`YYYY-MM-DD`）           |

**成功响应**（200）：

| 字段                           | 类型          | 必有 | 说明                 |
| ------------------------------ | ------------- | ---- | -------------------- |
| `traceId`                      | string        | 是   | 链路追踪 ID          |
| `data.total`                   | integer       | 是   | 总记录数             |
| `data.page`                    | integer       | 是   | 当前页码             |
| `data.pageSize`                | integer       | 是   | 每页数量             |
| `data.list`                    | array         | 是   | 审核记录列表         |
| `data.list[].id`               | string        | 是   | 审核 ID              |
| `data.list[].title`            | string\|null  | 是   | 研报标题             |
| `data.list[].author`           | string\|null  | 是   | 作者                 |
| `data.list[].reportType`       | string        | 是   | 研报类型             |
| `data.list[].mode`             | string        | 是   | 审核模式             |
| `data.list[].status`           | string        | 是   | 审核状态             |
| `data.list[].score`            | integer\|null | 是   | 审核评分             |
| `data.list[].fileName`         | string\|null  | 是   | 原始文件名           |
| `data.list[].complianceIssues` | integer       | 是   | 合规问题数           |
| `data.list[].contentIssues`    | integer       | 是   | 内容问题数           |
| `data.list[].submittedAt`      | string\|null  | 是   | 提交时间（ISO-8601） |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "total": 56,
    "page": 1,
    "pageSize": 20,
    "list": [
      {
        "id": "RV-2026-0042",
        "title": "XX行业2026年中期策略报告",
        "author": "张研究员",
        "reportType": "深度研究",
        "mode": "combined",
        "status": "failed",
        "score": 65,
        "fileName": "XX行业中期策略.pdf",
        "complianceIssues": 1,
        "contentIssues": 2,
        "submittedAt": "2026-04-15T10:30:00+08:00"
      }
    ]
  }
}
```

---

### 3.6 GET /api/v1/reviews/<review_id> — 审核报告详情

> 获取单条审核记录的完整报告，含问题列表。

**路径参数**：

| 字段        | 类型   | 说明        |
| ----------- | ------ | ----------- |
| `review_id` | string | 审核记录 ID |

**成功响应**（200）：

| 字段                       | 类型          | 必有 | 说明                               |
| -------------------------- | ------------- | ---- | ---------------------------------- |
| `traceId`                  | string        | 是   | 链路追踪 ID                        |
| `data.id`                  | string        | 是   | 审核 ID                            |
| `data.title`               | string\|null  | 是   | 研报标题                           |
| `data.author`              | string\|null  | 是   | 作者                               |
| `data.reportType`          | string        | 是   | 研报类型                           |
| `data.mode`                | string        | 是   | 审核模式                           |
| `data.status`              | string        | 是   | 审核状态                           |
| `data.score`               | integer\|null | 是   | 审核评分（0-100）                  |
| `data.filePath`            | string\|null  | 是   | 文件存储路径                       |
| `data.fileName`            | string\|null  | 是   | 原始文件名                         |
| `data.progress`            | integer       | 是   | 审核进度（0-100）                  |
| `data.currentStep`         | string\|null  | 是   | 当前步骤描述                       |
| `data.complianceIssues`    | integer       | 是   | 合规问题数                         |
| `data.contentIssues`       | integer       | 是   | 内容问题数                         |
| `data.submittedAt`         | string\|null  | 是   | 提交时间（ISO-8601）               |
| `data.completedAt`         | string\|null  | 是   | 完成时间（ISO-8601）               |
| `data.issues`              | array         | 是   | 问题列表                           |
| `data.issues[].id`         | string        | 是   | 问题 ID（如 `ISS-001`）            |
| `data.issues[].ruleId`     | string        | 是   | 触发的规则 ID                      |
| `data.issues[].ruleName`   | string        | 是   | 规则名称                           |
| `data.issues[].category`   | string        | 是   | 问题类别（`compliance`/`content`） |
| `data.issues[].severity`   | string        | 是   | 严重程度（`P0`/`P1`/`P2`）         |
| `data.issues[].location`   | string\|null  | 是   | 问题位置描述                       |
| `data.issues[].excerpt`    | string\|null  | 是   | 问题内容摘录                       |
| `data.issues[].suggestion` | string\|null  | 是   | 修改建议                           |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "id": "RV-2026-0042",
    "title": "XX行业2026年中期策略报告",
    "author": "张研究员",
    "reportType": "深度研究",
    "mode": "combined",
    "status": "failed",
    "score": 65,
    "filePath": "uploads/2026/04/xxx.pdf",
    "fileName": "XX行业中期策略.pdf",
    "progress": 100,
    "currentStep": "审核完成",
    "complianceIssues": 1,
    "contentIssues": 2,
    "submittedAt": "2026-04-15T10:30:00+08:00",
    "completedAt": "2026-04-15T10:31:15+08:00",
    "issues": [
      {
        "id": "ISS-001",
        "ruleId": "R-C-01",
        "ruleName": "敏感信息泄露检测",
        "category": "compliance",
        "severity": "P0",
        "location": "第3页第2段",
        "excerpt": "据悉该公司即将发布重大资产重组方案...",
        "suggestion": "删除未公开的重大事项相关内容，或等待信息正式披露后再引用"
      }
    ]
  }
}
```

**错误场景**：

| 条件             | HTTP | error.code         |
| ---------------- | ---- | ------------------ |
| review_id 不存在 | 404  | `REVIEW_NOT_FOUND` |

---

### 3.7 GET /api/v1/reviews/<review_id>/status — 审核状态查询

> 查询审核任务的实时进度与状态。

**路径参数**：

| 字段        | 类型   | 说明        |
| ----------- | ------ | ----------- |
| `review_id` | string | 审核记录 ID |

**成功响应**（200）：

| 字段                      | 类型         | 必有 | 说明                |
| ------------------------- | ------------ | ---- | ------------------- |
| `traceId`                 | string       | 是   | 链路追踪 ID         |
| `data.id`                 | string       | 是   | 审核 ID             |
| `data.status`             | string       | 是   | 审核状态            |
| `data.progress`           | integer      | 是   | 进度百分比（0-100） |
| `data.currentStep`        | string\|null | 是   | 当前步骤描述        |
| `data.steps`              | array        | 是   | 审核步骤列表        |
| `data.estimatedRemaining` | string\|null | 是   | 预估剩余时间        |

---

### 3.8 GET /api/v1/reviews/<review_id>/export — 导出审核报告

> 将审核报告导出为 PDF 或 DOCX 文件。

**路径参数**：

| 字段        | 类型   | 说明        |
| ----------- | ------ | ----------- |
| `review_id` | string | 审核记录 ID |

**请求参数**（Query）：

| 字段     | 类型   | 必填 | 默认值 | 说明                     |
| -------- | ------ | ---- | ------ | ------------------------ |
| `format` | string | 否   | `pdf`  | 导出格式（`pdf`/`docx`） |

**成功响应**（200）：

> 返回二进制文件流，Content-Type 根据格式：
>
> - PDF：`application/pdf`
> - DOCX：`application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**响应头**：

| Header                | 值                                                                 |
| --------------------- | ------------------------------------------------------------------ |
| `Content-Type`        | `application/pdf` 或 `application/vnd...wordprocessingml.document` |
| `Content-Disposition` | `attachment; filename="审核报告_RV-2026-0042.pdf"`                 |

---

### 3.9 GET /api/v1/rules — 规则列表

> 获取审核规则列表，支持按类别和启用状态筛选。

**请求参数**（Query）：

| 字段       | 类型   | 必填 | 说明                               |
| ---------- | ------ | ---- | ---------------------------------- |
| `category` | string | 否   | 类别筛选（`compliance`/`content`） |
| `enabled`  | string | 否   | 启用状态筛选（`true`/`false`）     |

**成功响应**（200）：

| 字段                       | 类型         | 必有 | 说明                               |
| -------------------------- | ------------ | ---- | ---------------------------------- |
| `traceId`                  | string       | 是   | 链路追踪 ID                        |
| `data.rules`               | array        | 是   | 规则列表                           |
| `data.rules[].id`          | string       | 是   | 规则 ID（如 `R-C-01`）             |
| `data.rules[].name`        | string       | 是   | 规则名称                           |
| `data.rules[].category`    | string       | 是   | 规则类别（`compliance`/`content`） |
| `data.rules[].severity`    | string       | 是   | 严重程度（`P0`/`P1`/`P2`）         |
| `data.rules[].mode`        | array        | 是   | 适用审核模式列表                   |
| `data.rules[].description` | string\|null | 是   | 规则描述                           |
| `data.rules[].example`     | string\|null | 是   | 示例违规内容                       |
| `data.rules[].enabled`     | boolean      | 是   | 是否启用                           |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "rules": [
      {
        "id": "R-C-01",
        "name": "敏感信息泄露检测",
        "category": "compliance",
        "severity": "P0",
        "mode": ["ai", "combined"],
        "description": "检测研报中是否包含未公开的内幕信息、客户持仓明细等敏感内容",
        "example": "据悉该公司即将发布重大资产重组方案",
        "enabled": true
      }
    ]
  }
}
```

---

### 3.10 PATCH /api/v1/rules/<rule_id> — 更新规则状态

> 启用或禁用指定审核规则。

**路径参数**：

| 字段      | 类型   | 说明    |
| --------- | ------ | ------- |
| `rule_id` | string | 规则 ID |

**请求体**（application/json）：

| 字段      | 类型    | 必填   | 说明     |
| --------- | ------- | ------ | -------- |
| `enabled` | boolean | **是** | 是否启用 |

**成功响应**（200）：

| 字段             | 类型    | 必有 | 说明                 |
| ---------------- | ------- | ---- | -------------------- |
| `traceId`        | string  | 是   | 链路追踪 ID          |
| `data.id`        | string  | 是   | 规则 ID              |
| `data.name`      | string  | 是   | 规则名称             |
| `data.enabled`   | boolean | 是   | 更新后的启用状态     |
| `data.updatedAt` | string  | 是   | 更新时间（ISO-8601） |

**响应示例**：

```json
{
  "traceId": "tr_a1b2c3d4e5f6",
  "data": {
    "id": "R-C-01",
    "name": "敏感信息泄露检测",
    "enabled": false,
    "updatedAt": "2026-04-15T14:30:00+08:00"
  }
}
```

**错误场景**：

| 条件              | HTTP | error.code        |
| ----------------- | ---- | ----------------- |
| 缺少 enabled 参数 | 400  | `INVALID_REQUEST` |
| enabled 非布尔值  | 400  | `INVALID_REQUEST` |
| rule_id 不存在    | 404  | `RULE_NOT_FOUND`  |

## 4. 枚举类型定义

### 4.1 审核模式（mode）

| 值         | 说明                                |
| ---------- | ----------------------------------- |
| `rule`     | 规则审核 — 基于预设规则的自动化检查 |
| `ai`       | AI 审核 — 基于大模型的智能内容审核  |
| `combined` | 联合审核 — 规则与 AI 双重校验       |

### 4.2 审核状态（status）

| 值          | 说明                            |
| ----------- | ------------------------------- |
| `pending`   | 待审核 — 已提交，等待处理       |
| `reviewing` | 审核中 — 正在执行审核           |
| `passed`    | 已通过 — 无问题或仅有低级问题   |
| `failed`    | 未通过 — 存在 P0 级问题         |
| `warning`   | 警告 — 存在 P1/P2 级问题，无 P0 |

### 4.3 研报类型（reportType）

| 值         | 说明                   |
| ---------- | ---------------------- |
| `日报`     | 每日市场简报           |
| `周报`     | 每周市场回顾           |
| `深度研究` | 深度行业/公司研究报告  |
| `首次覆盖` | 首次覆盖公司的研究报告 |
| `行业报告` | 行业分析报告           |

### 4.4 问题类别（category）

| 值           | 说明     |
| ------------ | -------- |
| `compliance` | 合规问题 |
| `content`    | 内容问题 |

### 4.5 严重程度（severity）

| 值   | 说明            | 影响                 |
| ---- | --------------- | -------------------- |
| `P0` | 严重 — 必须修复 | 审核结果 → `failed`  |
| `P1` | 重要 — 应当修复 | 审核结果 → `warning` |
| `P2` | 一般 — 建议修复 | 审核结果 → `warning` |

## 5. 参数校验规则

| 端点              | 字段                  | 规则                           | 失败 HTTP | error.code              |
| ----------------- | --------------------- | ------------------------------ | --------- | ----------------------- |
| POST /reviews     | `file`                | 必须提供且非空                 | 400       | `INVALID_REQUEST`       |
| POST /reviews     | `file`                | 格式 MUST 为 PDF/DOCX/DOC      | 400       | `UNSUPPORTED_FILE_TYPE` |
| POST /reviews     | `file`                | 大小 MUST ≤ 50MB               | 400       | `FILE_TOO_LARGE`        |
| POST /reviews     | `reportType`          | MUST 为枚举值之一              | 400       | `INVALID_REQUEST`       |
| POST /reviews     | `mode`                | MUST 为 `rule`/`ai`/`combined` | 400       | `INVALID_REQUEST`       |
| GET /reviews      | `page`                | 正整数，默认 1                 | 400       | `INVALID_REQUEST`       |
| GET /reviews      | `pageSize`            | 1-100，默认 20                 | 400       | `INVALID_REQUEST`       |
| GET /reviews      | `startDate`/`endDate` | `YYYY-MM-DD` 格式              | 400       | `INVALID_REQUEST`       |
| PATCH /rules/<id> | `enabled`             | MUST 为布尔值                  | 400       | `INVALID_REQUEST`       |

## 6. 变更记录

| 版本 | 日期       | 说明                     |
| ---- | ---------- | ------------------------ |
| v0.1 | 2026-04-15 | 首版，覆盖全部 10 个端点 |

## 7. 关联文档索引

| 文档                    | 关联说明                               |
| ----------------------- | -------------------------------------- |
| `02` 需求来源与采集记录 | 审核模式、审核规则的需求来源           |
| `04` 产品需求说明       | 功能清单与业务规则定义                 |
| `05` 用户故事与验收标准 | 每条 US 的 AC 以本文端点为验证基准     |
| `10` 数据模型与存储规格 | Review / Issue / Rule 三实体的字段定义 |
| `13` 测试策略与质量门禁 | 测试断言以本文响应规范为准             |
