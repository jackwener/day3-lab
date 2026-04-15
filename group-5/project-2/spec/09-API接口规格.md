# 命理测算工具 - API接口规格

> 文档编号: 09  
> 版本: V1.0  
> 日期: 2026-04-15  
> 作者: AI Spec Generator  
> 状态: 待审核

---

## 目录

- [1. API设计规范](#1-api设计规范)
- [2. 认证接口](#2-认证接口)
- [3. 用户接口](#3-用户接口)
- [4. 黄历接口](#4-黄历接口)
- [5. 运势问询接口](#5-运势问询接口)
- [6. 命格解析接口](#6-命格解析接口)
- [7. 错误码规范](#7-错误码规范)

---

## 1. API设计规范

### 1.1 基础规范

**Base URL**:
```
Production: https://api.xxx.com
Staging: https://staging-api.xxx.com
Development: http://localhost:3001
```

**请求格式**:
- Content-Type: application/json
- 字符编码: UTF-8
- 时间格式: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

**响应格式**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功",
  "timestamp": "2026-04-15T10:30:00.000Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "无效的访问令牌",
    "details": { ... }
  },
  "timestamp": "2026-04-15T10:30:00.000Z"
}
```

### 1.2 认证方式

**JWT Token认证**:
```
请求头:
Authorization: Bearer <token>

Cookie:
token=<jwt_token>; HttpOnly; Secure; SameSite=Strict
```

### 1.3 分页规范

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 2. 认证接口

### 2.1 用户注册

**POST** `/api/auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "phone": "13800138000",
  "password": "SecurePass123",
  "nickname": "张三"
}
```

**响应 (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "138****8000",
      "nickname": "张三",
      "createdAt": "2026-04-15T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "注册成功"
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_EMAIL | 邮箱格式无效 |
| 400 | INVALID_PHONE | 手机号格式无效 |
| 400 | WEAK_PASSWORD | 密码强度不足 |
| 409 | EMAIL_EXISTS | 邮箱已注册 |
| 409 | PHONE_EXISTS | 手机号已注册 |

---

### 2.2 用户登录

**POST** `/api/auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "nickname": "张三",
      "hasProfile": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "登录成功"
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | MISSING_FIELD | 缺少必填字段 |
| 401 | INVALID_CREDENTIALS | 账号或密码错误 |
| 429 | TOO_MANY_ATTEMPTS | 登录尝试次数过多,请15分钟后重试 |

---

### 2.3 刷新Token

**POST** `/api/auth/refresh`

**请求头**:
```
Cookie: refreshToken=<refresh_token>
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token刷新成功"
}
```

---

## 3. 用户接口

### 3.1 获取用户档案

**GET** `/api/user/profile`

**认证**: 需要JWT Token

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "张三",
    "gender": "male",
    "birthDate": "1990-05-15",
    "birthTime": 8,
    "bazi": {
      "yearPillar": "庚午",
      "monthPillar": "辛巳",
      "dayPillar": "壬辰",
      "hourPillar": "甲辰",
      "wuxing": {
        "metal": 30,
        "wood": 20,
        "water": 25,
        "fire": 15,
        "earth": 10
      }
    },
    "createdAt": "2026-04-15T10:30:00.000Z",
    "updatedAt": "2026-04-15T10:30:00.000Z"
  }
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 401 | UNAUTHORIZED | 未登录 |
| 404 | PROFILE_NOT_FOUND | 档案不存在 |

---

### 3.2 更新用户档案

**PUT** `/api/user/profile`

**认证**: 需要JWT Token

**请求体**:
```json
{
  "nickname": "张三",
  "gender": "male",
  "birthDate": "1990-05-15",
  "birthTime": 8
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "张三",
    "bazi": { ... }
  },
  "message": "档案更新成功"
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_DATE | 日期格式无效 |
| 400 | DATE_OUT_OF_RANGE | 日期超出范围(1900-2100) |

---

## 4. 黄历接口

### 4.1 获取今日黄历

**GET** `/api/calendar/today`

**认证**: 需要JWT Token

**查询参数**:
```
date: 2026-04-15 (可选,默认今日)
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "date": "2026-04-15",
    "lunarDate": "农历三月初八",
    "ganzhi": "丙午年 壬辰月 戊戌日",
    "suitable": [
      "签约合作",
      "出行拜访",
      "面试求职"
    ],
    "unsuitable": [
      "动土装修",
      "大额借贷"
    ],
    "luckyColor": ["红色", "黄色"],
    "luckyDirection": ["正东", "东南"],
    "cached": true
  }
}
```

---

### 4.2 获取指定日期黄历

**GET** `/api/calendar/:date`

**认证**: 需要JWT Token

**路径参数**:
```
date: 2026-04-15
```

**响应**: 同上

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_DATE | 日期格式无效 |
| 400 | DATE_OUT_OF_RANGE | 仅支持前后7天 |

---

## 5. 运势问询接口

### 5.1 奇门遁甲起卦

**POST** `/api/divination/qimen`

**认证**: 需要JWT Token

**请求体**:
```json
{
  "question": "今天下午的会议是否顺利?",
  "location": {
    "latitude": 39.9042,
    "longitude": 116.4074
  }
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "qimen",
    "question": "今天下午的会议是否顺利?",
    "result": {
      "ju": "阳遁三局",
      "zhifu": "天符",
      "zhishi": "景门",
      "palace": { ... },
      "advice": "适合",
      "successRate": 75,
      "analysis": "今日奇门卦象显示,用神落宫吉利,值符值使相助,会议开展顺利的可能性较大。建议把握机会,积极沟通..."
    },
    "createdAt": "2026-04-15T10:30:00.000Z"
  },
  "message": "起卦成功",
  "meta": {
    "remainingToday": 0
  }
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | MISSING_LOCATION | 缺少位置信息 |
| 429 | DAILY_LIMIT_EXCEEDED | 今日次数已用完 |

---

### 5.2 大小六壬起卦

**POST** `/api/divination/liuren`

**认证**: 需要JWT Token

**请求体**:
```json
{
  "question": "明天去签约是否合适?",
  "numbers": [5, 8, 2]
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "liuren",
    "question": "明天去签约是否合适?",
    "numbers": [5, 8, 2],
    "result": {
      "course": { ... },
      "advice": "适合",
      "successRate": 82,
      "analysis": "根据大小六壬卦象,三传吉利,四课无冲,签约事宜可以放心开展..."
    },
    "createdAt": "2026-04-15T10:30:00.000Z"
  },
  "message": "起卦成功",
  "meta": {
    "remainingToday": 4
  }
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_NUMBERS | 数字范围无效(必须1-12) |
| 429 | DAILY_LIMIT_EXCEEDED | 今日次数已用完(最多5次) |

---

### 5.3 获取问询历史

**GET** `/api/divination/history`

**认证**: 需要JWT Token

**查询参数**:
```
page: 1
pageSize: 20
type: qimen (可选)
```

**响应 (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "qimen",
      "question": "今天下午的会议是否顺利?",
      "advice": "适合",
      "successRate": 75,
      "createdAt": "2026-04-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

## 6. 命格解析接口

### 6.1 命格解析

**POST** `/api/destiny/analyze`

**认证**: 需要JWT Token

**请求体**:
```json
{
  "name": "张三",
  "gender": "male",
  "birthDate": "1990-05-15",
  "birthTime": 8,
  "noBirthTime": false
}
```

**响应 (200)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "张三",
    "keywords": ["高楼望月", "文昌入命"],
    "wuxing": {
      "metal": 30,
      "wood": 20,
      "water": 25,
      "fire": 15,
      "earth": 10,
      "analysis": "您的八字金旺水相..."
    },
    "personality": "根据您的命格分析...",
    "career": "事业财运方面...",
    "relationship": "感情婚姻方面...",
    "health": "健康方面...",
    "advice": "运势建议...",
    "noBirthTime": false,
    "createdAt": "2026-04-15T10:30:00.000Z"
  },
  "message": "解析完成"
}
```

**错误响应**:
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_DATE | 日期格式无效 |
| 400 | DATE_OUT_OF_RANGE | 日期超出范围 |

---

### 6.2 获取解析历史

**GET** `/api/destiny/history`

**认证**: 需要JWT Token

**响应**: 类似问询历史

---

## 7. 错误码规范

### 7.1 通用错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| INVALID_REQUEST | 400 | 请求参数无效 |
| UNAUTHORIZED | 401 | 未认证或Token过期 |
| FORBIDDEN | 403 | 无权限访问 |
| NOT_FOUND | 404 | 资源不存在 |
| TOO_MANY_REQUESTS | 429 | 请求频率超限 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |
| SERVICE_UNAVAILABLE | 503 | 服务不可用 |

### 7.2 业务错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| EMAIL_EXISTS | 409 | 邮箱已注册 |
| PHONE_EXISTS | 409 | 手机号已注册 |
| INVALID_CREDENTIALS | 401 | 账号或密码错误 |
| WEAK_PASSWORD | 400 | 密码强度不足 |
| PROFILE_NOT_FOUND | 404 | 用户档案不存在 |
| DAILY_LIMIT_EXCEEDED | 429 | 今日测算次数已用完 |
| MISSING_LOCATION | 400 | 缺少位置信息 |
| INVALID_NUMBERS | 400 | 数字范围无效 |
| INVALID_DATE | 400 | 日期格式无效 |
| DATE_OUT_OF_RANGE | 400 | 日期超出范围 |

---

## 文档审批

| 角色 | 姓名 | 签字 | 日期 |
|------|------|------|------|
| 技术负责人 | | | |
| 前端负责人 | | | |
| 后端负责人 | | | |

---

**文档结束**
