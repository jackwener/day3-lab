# 09 — API 接口规格（功能升级版）

---

| 项 | 值 |
|---|---|
| 模块编号 | M2-RPT |
| 模块名称 | 研报分析增强 |
| 文档版本 | v1.0 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1/agent` |

---

> **本文是升级功能全部新增/变更 API 端点的契约真源**。基线端点沿用 `spec_init/09`。

## 1. 端点变更总览

| # | 端点 | 方法 | 功能 | 成功码 | 变更类型 |
|---|------|------|------|--------|----------|
| 11 | `/api/v1/agent/stock/<code>/detail` | GET | 股票 Mock 详情 | 200 | **新增** |
| 12 | `/api/v1/agent/reports/<id>` | DELETE | 删除研报 | 200 | **新增** |
| 10 | `/api/v1/agent/reports/compare` | POST | 研报对比（含共同/差异观点） | 200 | **变更** |
| 9 | `/api/v1/agent/reports/<id>` | GET | 研报详情（含股票代码+观点定位） | 200 | **变更** |
| 8 | `/api/v1/agent/reports` | GET | 研报列表（支持知识库全局查询） | 200 | **变更** |
| 7 | `/api/v1/agent/reports/upload` | POST | 研报上传（扩展提取字段） | 200 | **变更** |

## 2. 新增错误码

| HTTP | error.code | 触发条件 | details |
|------|-----------|----------|---------|
| 400 | `INVALID_STOCK_CODE` | 股票代码格式非法 | `{"code": "..."}` |
| 404 | `STOCK_NOT_FOUND` | 股票代码在 Mock 数据中不存在 | `{"code": "..."}` |
| 404 | `REPORT_NOT_FOUND` | 删除/查询的研报不存在 | `{"report_id": "..."}` |

## 3. GET /stock/<code>/detail — 股票 Mock 详情（新增）

> 根据股票代码返回 Mock 股票详情数据，包含股价走势、财报摘要、关键时点。

**路径参数**：

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `code` | string | 标准化后的代码如 `SH600519` | 股票代码 |

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `code` | string | 是 | 标准化股票代码 |
| `name` | string | 是 | 公司名称 |
| `current_price` | number | 是 | 当前价格（Mock） |
| `change_percent` | number | 是 | 涨跌幅百分比（Mock） |
| `price_history` | array | 是 | 近 30 日价格数据 |
| `price_history[].date` | string | 是 | 日期（YYYY-MM-DD） |
| `price_history[].close` | number | 是 | 收盘价 |
| `financial_summary` | object | 是 | 最近财报摘要 |
| `financial_summary.period` | string | 是 | 报告期（如 2025Q4） |
| `financial_summary.revenue` | string | 是 | 营收 |
| `financial_summary.net_profit` | string | 是 | 净利润 |
| `financial_summary.yoy_growth` | string | 是 | 同比增速 |
| `key_events` | array | 是 | 关键时点列表 |
| `key_events[].date` | string | 是 | 事件日期 |
| `key_events[].event` | string | 是 | 事件描述 |

**响应示例**：

```json
{
  "traceId": "tr_stock001...",
  "code": "SH600519",
  "name": "贵州茅台",
  "current_price": 1856.00,
  "change_percent": 2.3,
  "price_history": [
    {"date": "2026-03-17", "close": 1780.00},
    {"date": "2026-03-18", "close": 1795.50}
  ],
  "financial_summary": {
    "period": "2025Q4",
    "revenue": "1505亿",
    "net_profit": "862亿",
    "yoy_growth": "+15.2%"
  },
  "key_events": [
    {"date": "2026-03-28", "event": "年报发布"},
    {"date": "2026-04-10", "event": "股东大会"}
  ]
}
```

## 4. DELETE /reports/<id> — 删除研报（新增）

> 根据 report_id 删除指定研报及其原始文件。

**路径参数**：`report_id`（UUID 格式）

**成功响应**（200）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `traceId` | string | 是 | 链路追踪 ID |
| `message` | string | 是 | 删除确认消息 |
| `deleted_report_id` | string (UUID) | 是 | 被删除的研报 ID |

**响应示例**：

```json
{
  "traceId": "tr_del001...",
  "message": "研报已删除",
  "deleted_report_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**错误响应**：

| HTTP | error.code | 说明 |
|------|-----------|------|
| 400 | `INVALID_REPORT_ID` | report_id 格式非法 |
| 404 | `REPORT_NOT_FOUND` | 研报不存在 |

## 5. POST /reports/upload — 研报上传（变更）

> 响应体 `extracted_data` 新增字段。

**新增响应字段**：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `extracted_data.stock_codes` | `string[]` | 是 | 提取的股票代码列表（标准化格式） |
| `extracted_data.core_opinions` | `object[]` | 是 | **变更**：从 `string[]` 改为对象数组 |
| `extracted_data.core_opinions[].text` | string | 是 | 观点文本 |
| `extracted_data.core_opinions[].source_text` | string | 是 | 原文片段（前后各 200 字符） |
| `extracted_data.core_opinions[].position` | integer\|null | 是 | 在 raw_text 中的字符偏移位置 |

**响应示例（变更部分）**：

```json
{
  "extracted_data": {
    "rating": "买入",
    "target_price": "2100.00",
    "stock_codes": ["SH600519"],
    "core_opinions": [
      {
        "text": "公司业绩超预期，营收同比增长15%",
        "source_text": "……根据最新财报显示，公司业绩超预期，营收同比增长15%，净利润……",
        "position": 1256
      }
    ],
    "institution": "中信证券",
    "publish_date": "2026-04-10"
  }
}
```

## 6. GET /reports/<id> — 研报详情（变更）

> 响应体中 `extracted_data` 字段结构同 §5 变更。

## 7. GET /reports — 研报列表（变更）

> 支持知识库全局查询：不传 `session_id` 时返回全部研报。

**新增请求参数**（Query）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search` | string | 否 | 按文件名模糊搜索 |
| `institution` | string | 否 | 按发布机构筛选 |
| `stock_code` | string | 否 | 按股票代码筛选 |

**响应体**中 reports 数组元素的 `extracted_data` 同 §5 变更。

## 8. POST /reports/compare — 研报对比（变更）

> 响应体新增共同观点和差异观点。

**成功响应新增字段**：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `common_opinions` | array | 是 | 共同观点列表 |
| `common_opinions[].text` | string | 是 | 共同观点文本 |
| `common_opinions[].reports` | array | 是 | 涉及的研报列表 |
| `common_opinions[].reports[].report_id` | string | 是 | 研报 ID |
| `common_opinions[].reports[].file_name` | string | 是 | 文件名 |
| `common_opinions[].reports[].institution` | string | 是 | 机构名 |
| `diff_opinions` | array | 是 | 差异观点列表 |
| `diff_opinions[].report_id` | string | 是 | 研报 ID |
| `diff_opinions[].file_name` | string | 是 | 文件名 |
| `diff_opinions[].institution` | string | 是 | 机构名 |
| `diff_opinions[].opinions` | string[] | 是 | 该研报独有的观点 |

**响应示例（新增部分）**：

```json
{
  "traceId": "tr_cmp001...",
  "comparison": { "...": "同基线" },
  "common_opinions": [
    {
      "text": "业绩超预期，营收增速保持双位数",
      "reports": [
        {"report_id": "r1", "file_name": "茅台-中信.pdf", "institution": "中信证券"},
        {"report_id": "r2", "file_name": "茅台-国泰.pdf", "institution": "国泰君安"}
      ]
    }
  ],
  "diff_opinions": [
    {
      "report_id": "r1",
      "file_name": "茅台-中信.pdf",
      "institution": "中信证券",
      "opinions": ["新产品线拓展顺利，市场份额持续提升"]
    },
    {
      "report_id": "r2",
      "file_name": "茅台-国泰.pdf",
      "institution": "国泰君安",
      "opinions": ["估值偏高，建议等待回调"]
    }
  ]
}
```

## 9. 参数校验规则汇总（新增）

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| GET /stock/{code}/detail | `code` | 匹配 `^(SH\|SZ)\d{6}$` | 400 | `INVALID_STOCK_CODE` |
| GET /stock/{code}/detail | `code` | Mock 数据中存在 | 404 | `STOCK_NOT_FOUND` |
| DELETE /reports/{id} | `report_id` | 合法 UUID | 400 | `INVALID_REPORT_ID` |
| DELETE /reports/{id} | `report_id` | 研报存在 | 404 | `REPORT_NOT_FOUND` |
| GET /reports | `search` | ≤50 字符 | 400 | `INVALID_QUERY` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-15 | 功能升级首版 |
