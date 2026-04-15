# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-GOLD |
| 模块名称 | 黄金记账本 |
| 文档版本 | v0.1 |
| 阶段 | Design（How — 契约真源） |
| Base URL | `/api/v1/gold` |

---

> **本文是后端 API 端点的契约真源**。`05` 定义"用户要什么"，**09（本文）定义"后端服务必须返回什么"**，`13` 的测试断言以本文为准。
>
> **注意**：用户核心数据（账本、黄金记录）存储在前端 LocalStorage，不经过这些 API。后端 API 仅用于金价查询、OCR 识别等第三方服务代理。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 |
|---|------|------|------|--------|
| 1 | `/api/v1/gold/ledgers` | GET | 账本列表 | 200 |
| 2 | `/api/v1/gold/ledgers` | POST | 新建账本 | 201 |
| 3 | `/api/v1/gold/ledgers/<id>` | DELETE | 删除账本 | 200 |
| 4 | `/api/v1/gold/gold-records` | POST | 添加黄金记录 | 201 |
| 5 | `/api/v1/gold/gold-records` | GET | 黄金记录列表 | 200 |
| 6 | `/api/v1/gold/gold-records/<id>` | DELETE | 删除黄金记录 | 200 |
| 7 | `/api/v1/gold/gold-records/<id>` | PUT | 修改黄金记录 | 200 |
| 8 | `/api/v1/gold/summary` | GET | 资产总览 | 200 |
| 9 | `/api/v1/gold/market/price` | GET | 实时金价 | 200 |
| 10 | `/api/v1/gold/market/history` | GET | 金价历史 | 200 |
| 11 | `/api/v1/gold/ocr/recognize` | POST | AI 识图识别 | 200 |
| 12 | `/api/v1/gold/gift-sell-records` | POST | 添加赠卖记录 | 201 |
| 13 | `/api/v1/gold/gift-sell-records` | GET | 赠卖记录列表 | 200 |
| 14 | `/api/v1/gold/market/subscribe` | POST | 订阅金价提醒 | 201 |

## 2. 统一响应规范

### 成功响应

```json
{ "code": 0, "message": "success", "data": { /* 业务字段 */ } }
```

### 错误响应

```json
{ "code": 40001, "message": "参数校验失败", "error": { "field": "weight", "reason": "重量必须在 0.01~99999.99 之间" } }
```

### 错误码清单

| HTTP | error.code | 触发条件 | 说明 |
|------|-----------|----------|------|
| 400 | `40001` | 参数校验失败（字段缺失/类型错误/范围越界） | INVALID_PARAM |
| 400 | `40002` | 账本不存在 | LEDGER_NOT_FOUND |
| 400 | `40003` | 记录不存在 | RECORD_NOT_FOUND |
| 400 | `40004` | 默认账本不可删除 | DEFAULT_LEDGER_PROTECTED |
| 500 | `50001` | 金价 API 调用失败 | MARKET_API_ERROR |
| 500 | `50002` | AI 识图服务异常 | OCR_SERVICE_ERROR |
| 500 | `50003` | 服务器内部错误 | INTERNAL_ERROR |

## 3. POST /gold-records — 添加黄金记录

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `ledger_id` | string | **是** | UUID | 所属账本 ID |
| `weight` | number | **是** | 0.01~99999.99，精度 2 位 | 重量（克） |
| `total_price` | number | **是** | > 0，精度 2 位 | 成交总价（元） |
| `mode` | string | **是** | 枚举：`summary` \| `detail` | 录入模式 |
| `unit_price` | number | 明细模式必填 | > 0 | 单价（元/克），仅 detail 模式 |
| `channel` | string | 否 | ≤50 字符 | 购买渠道 |
| `note` | string | 否 | ≤200 字符 | 备注 |
| `purchase_date` | string | **是** | ISO-8601 日期 | 购买日期 |
| `photos` | string[] | 否 | 最多 3 张，每张 ≤2MB | 照片 URL 列表 |

**成功响应**（201）：

| 字段 | 类型 | 必有 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 记录唯一 ID |
| `ledger_id` | string | 是 | 所属账本 |
| `weight` | number | 是 | 重量（克） |
| `total_price` | number | 是 | 成交总价（元） |
| `unit_price` | number | 是 | 单价（元/克），汇总模式自动计算 |
| `mode` | string | 是 | 录入模式 |
| `channel` | string | 是 | 购买渠道，默认 "" |
| `note` | string | 是 | 备注，默认 "" |
| `purchase_date` | string | 是 | 购买日期 |
| `photos` | string[] | 是 | 照片 URL 列表 |
| `created_at` | string | 是 | 创建时间 ISO-8601 UTC |

## 4. GET /gold-records — 黄金记录列表

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ledger_id` | string | **是** | 账本 ID |
| `channel` | string | 否 | 按渠道筛选 |
| `sort_by` | string | 否 | 排序字段：`purchase_date` \| `weight` \| `total_price`，默认 `purchase_date` |
| `sort_order` | string | 否 | `asc` \| `desc`，默认 `desc` |

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `records` | GoldRecord[] | 黄金记录数组 |
| `total` | integer | 记录总数 |

## 5. GET /summary — 资产总览

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ledger_id` | string | **是** | 账本 ID |

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `total_weight` | number | 总重量（克） |
| `total_cost` | number | 购入总价（元） |
| `estimated_value` | number | 预估价值（元）= total_weight × current_price |
| `estimated_profit` | number | 预估收益（元）= estimated_value - total_cost |
| `current_price` | number | 当前金价（元/克） |
| `price_updated_at` | string | 金价更新时间 ISO-8601 UTC |
| `record_count` | integer | 记录总数 |

## 6. GET /market/price — 实时金价

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `price` | number | 当前金价（元/克） |
| `currency` | string | 固定 "CNY" |
| `updated_at` | string | 数据更新时间 ISO-8601 UTC |

## 7. GET /market/history — 金价历史

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `range` | string | **是** | `realtime` \| `1month` \| `3month` |

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `points` | PricePoint[] | 价格数据点数组 |
| `range` | string | 查询范围 |

PricePoint：

| 字段 | 类型 | 说明 |
|------|------|------|
| `timestamp` | string | 时间点 ISO-8601 |
| `price` | number | 金价（元/克） |

## 8. POST /ledgers — 新建账本

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `name` | string | **是** | 1~20 字符 | 账本名称 |

**成功响应**（201）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 账本 ID |
| `name` | string | 账本名称 |
| `is_default` | boolean | 是否为默认账本 |
| `created_at` | string | 创建时间 |

## 9. POST /ocr/recognize — AI 识图识别

**请求体**（multipart/form-data）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `image` | file | **是** | 照片文件，≤5MB，支持 jpg/png |

**成功响应**（200）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `weight` | number \| null | 识别出的重量（克），识别失败为 null |
| `confidence` | number | 置信度 0~1 |
| `raw_text` | string | OCR 原始文本 |

## 10. POST /gift-sell-records — 添加赠卖记录

**请求体**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `ledger_id` | string | **是** | UUID | 所属账本 |
| `type` | string | **是** | 枚举：`gift` \| `sell` | 类型 |
| `weight` | number | **是** | > 0 | 重量（克） |
| `amount` | number | sell 必填 | ≥ 0 | 出售金额（元），gift 类型为 0 |
| `date` | string | **是** | ISO-8601 | 日期 |
| `note` | string | 否 | ≤200 字符 | 备注 |

**成功响应**（201）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 记录 ID |
| `type` | string | 赠送/出售 |
| `weight` | number | 重量 |
| `amount` | number | 金额 |
| `date` | string | 日期 |

## 11. 参数校验规则汇总

| 端点 | 字段 | 规则 | 失败 HTTP | error.code |
|------|------|------|-----------|-----------|
| POST /gold-records | `weight` | 0.01~99999.99 | 400 | `40001` |
| POST /gold-records | `total_price` | > 0 | 400 | `40001` |
| POST /gold-records | `ledger_id` | 非空且存在 | 400 | `40002` |
| POST /gold-records | `mode` | `summary` \| `detail` | 400 | `40001` |
| POST /gold-records | `purchase_date` | 有效 ISO-8601 日期 | 400 | `40001` |
| POST /ledgers | `name` | 1~20 字符 | 400 | `40001` |
| DELETE /ledgers/<id> | `id` | 非默认账本 | 400 | `40004` |
| POST /gift-sell-records | `weight` | > 0 | 400 | `40001` |
| POST /gift-sell-records | `type` | `gift` \| `sell` | 400 | `40001` |
| POST /ocr/recognize | `image` | ≤5MB, jpg/png | 400 | `40001` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-15 | 首版填写 |
