# 09-API接口规格

## 1. 端点总览

| 端点路径 | HTTP 方法 | 功能 | 对应 US |
|----------|-----------|------|---------|
| /api/timeline | GET | 获取局势时间轴数据 | US-001 |
| /api/timeline/{week} | GET | 获取指定周的详细数据 | US-004 |
| /api/funds/thematic | GET | 获取主题基金列表 | US-002 |
| /api/funds/small-scale | GET | 获取精选小规模基金列表 | US-003 |
| /api/situation/score | GET | 获取当前局势分值 | US-001 |

← 05 §1 用户故事清单

## 2. 统一响应规范

### 成功响应

```json
{
  "traceId": "string",
  "data": { },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

### 错误响应

```json
{
  "traceId": "string",
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": { }
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

## 3. 错误码清单

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| SUCCESS | 200 | 请求成功 |
| PARAM_INVALID | 400 | 参数校验失败 |
| DATA_NOT_FOUND | 404 | 数据不存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| DATA_SOURCE_ERROR | 503 | 数据源获取失败 |

## 4. 端点详情

### 4.1 获取局势时间轴数据

**端点：** `GET /api/timeline`

**功能：** 获取 3 月初至今的所有周节点数据

**请求参数：** 无

**成功响应：**

```json
{
  "traceId": "tl-20250415-001",
  "data": {
    "weeks": [
      {
        "weekNumber": 1,
        "startDate": "2026-03-01",
        "endDate": "2026-03-07",
        "situationScore": 65,
        "summary": "美伊冲突升级，双方互相指责"
      },
      {
        "weekNumber": 2,
        "startDate": "2026-03-08",
        "endDate": "2026-03-14",
        "situationScore": 58,
        "summary": "国际社会介入调停"
      }
    ]
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

**错误响应：**

```json
{
  "traceId": "tl-20250415-001",
  "error": {
    "code": "DATA_SOURCE_ERROR",
    "message": "无法获取局势数据",
    "details": {}
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

← 05 §2 US-001 验收标准

### 4.2 获取指定周详细数据

**端点：** `GET /api/timeline/{week}`

**功能：** 获取指定周的主题基金和小规模基金数据

**路径参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| week | integer | 是 | 周编号（从 1 开始） |

**成功响应：**

```json
{
  "traceId": "tl-20250415-002",
  "data": {
    "weekNumber": 1,
    "startDate": "2026-03-01",
    "endDate": "2026-03-07",
    "situationScore": 65,
    "summary": "美伊冲突升级，双方互相指责",
    "thematicFunds": [
      { "theme": "原油", "fundName": "南方原油A", "returnRate": 5.2 },
      { "theme": "黄金", "fundName": "易方达黄金ETF", "returnRate": 3.1 }
    ],
    "smallScaleFunds": [
      { "fundName": "广发精选A", "scale": 4.5, "returnRate": 6.8 },
      { "fundName": "富国成长A", "scale": 3.2, "returnRate": 5.5 }
    ]
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

**错误响应：**

```json
{
  "traceId": "tl-20250415-002",
  "error": {
    "code": "DATA_NOT_FOUND",
    "message": "指定周数据不存在",
    "details": { "week": 100 }
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

← 05 §2 US-004 验收标准

### 4.3 获取主题基金列表

**端点：** `GET /api/funds/thematic`

**功能：** 获取当前周各主题表现最优基金

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| week | integer | 否 | 周编号，不传则返回最新周数据 |

**成功响应：**

```json
{
  "traceId": "tf-20250415-001",
  "data": {
    "weekNumber": 1,
    "funds": [
      { "theme": "原油", "fundName": "南方原油A", "returnRate": 5.2 },
      { "theme": "黄金", "fundName": "易方达黄金ETF", "returnRate": 3.1 },
      { "theme": "煤炭", "fundName": "富国煤炭A", "returnRate": 2.8 },
      { "theme": "电力", "fundName": "华夏电力A", "returnRate": 1.5 },
      { "theme": "天然气", "fundName": "广发能源A", "returnRate": 2.1 }
    ]
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

← 05 §2 US-002 验收标准

### 4.4 获取精选小规模基金列表

**端点：** `GET /api/funds/small-scale`

**功能：** 获取精选小规模基金推荐

**查询参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| week | integer | 否 | 周编号，不传则返回最新周数据 |
| limit | integer | 否 | 返回数量限制，默认 5 |

**成功响应：**

```json
{
  "traceId": "sf-20250415-001",
  "data": {
    "weekNumber": 1,
    "funds": [
      { "fundName": "广发精选A", "company": "广发", "scale": 4.5, "returnRate": 6.8 },
      { "fundName": "富国成长A", "company": "富国", "scale": 3.2, "returnRate": 5.5 },
      { "fundName": "易方达优势A", "company": "易方达", "scale": 4.8, "returnRate": 5.2 },
      { "fundName": "南方价值A", "company": "南方", "scale": 2.5, "returnRate": 4.8 },
      { "fundName": "华夏稳健A", "company": "华夏", "scale": 3.8, "returnRate": 4.5 }
    ]
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

← 05 §2 US-003 验收标准

### 4.5 获取当前局势分值

**端点：** `GET /api/situation/score`

**功能：** 获取当前最新局势分值（从 Polymarket 获取）

**请求参数：** 无

**成功响应：**

```json
{
  "traceId": "ss-20250415-001",
  "data": {
    "score": 65,
    "source": "Polymarket",
    "updatedAt": "2026-04-15T08:00:00Z"
  },
  "timestamp": "2026-04-15T10:00:00Z"
}
```

← 05 §2 US-001 验收标准

## 5. 参数校验规则

| 参数 | 规则 | 失败 HTTP | 错误码 |
|------|------|-----------|--------|
| week | 整数，≥ 1 | 400 | PARAM_INVALID |
| limit | 整数，1-20 | 400 | PARAM_INVALID |

## 6. US 映射关系

| US 编号 | 对应 API 端点 |
|---------|---------------|
| US-001 | GET /api/timeline, GET /api/situation/score |
| US-002 | GET /api/funds/thematic |
| US-003 | GET /api/funds/small-scale |
| US-004 | GET /api/timeline/{week} |

→ 14 需求追踪矩阵

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-15 | 基于 03 提案、04 PRD、05 用户故事首版生成 |
