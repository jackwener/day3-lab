# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | M2-HUB |
| 模块名称 | Skill Hub |
| 文档版本 | v0.2 |
| 阶段 | Design（契约真源） |
| Base URL | `/api/v1/hub` |

---

> 所有字段名、类型、错误码**以本文为准**。

## 1. 端点总览

| # | 端点 | 方法 | 功能 | 成功码 | 关联 REQ |
|---|------|------|------|--------|----------|
| 1 | `/skills` | GET | 列表（筛选/排序/分页/关键词） | 200 | 005/006/008 |
| 2 | `/skills/<id>` | GET | 详情（含 skill_md_html） | 200 | 003 |
| 3 | `/skills` | POST | 在线创建 | 201 | 002 |
| 4 | `/skills/draft` | POST | LLM 生成 skill.md 草稿 | 200 | 002a |
| 5 | `/skills/upload` | POST | ZIP 上传发布 | 201 | 001 |
| 6 | `/skills/<id>/download` | GET | 下载 ZIP（含下载计数） | 200 | 003 |
| 7 | `/skills/smart-search` | POST | LLM 智能搜索（≥5 条） | 200 | 007 |
| 8 | `/skills/tags` | GET | 标签 Top 20 | 200 | 005 |
| 9 | `/categories` | GET | 分类白名单 | 200 | 006 |
| 10 | `/skills/<id>/like` | POST/DELETE | 点赞/取消 | 200 | 009 |
| 11 | `/skills/<id>/favorite` | POST/DELETE | 收藏/取消 | 200 | 010 |
| 12 | `/skills/<id>/rate` | POST | 评分 | 200 | 011 |
| 13 | `/me/favorites` | GET | 当前访客的收藏列表 | 200 | 010 |

## 2. 统一响应规范

### 2.1 成功

```json
{ "traceId": "tr_abc...", "...业务字段": "..." }
```

### 2.2 错误

```json
{
  "error": {
    "code": "UNSAFE_ZIP",
    "message": "压缩包包含不安全路径",
    "details": { "entry": "../etc/passwd" },
    "traceId": "tr_..."
  }
}
```

### 2.3 错误码清单

| HTTP | code | 触发 | details |
|------|------|------|---------|
| 400 | `EMPTY_FIELD` | 必填缺失 | `{field}` |
| 400 | `INVALID_CATEGORY` | 非枚举 | `{field,allowed}` |
| 400 | `INVALID_TAG` | 超 6 或单项超限 | `{field}` |
| 400 | `INVALID_QUERY` | q/intent 超长 | `{field,max}` |
| 400 | `INVALID_RATING` | 非 1-5 整数 | `{field}` |
| 400 | `INVALID_PAGE` | page_size 超限 | `{field}` |
| 400 | `MISSING_SKILL_MD` | zip 根无 skill.md | `{}` |
| 400 | `BUNDLE_LIMIT_EXCEEDED` | 解压超限 | `{max_size/max_files}` |
| 400 | `UNSAFE_ZIP` | zip 含 `..`/绝对路径 | `{entry}` |
| 404 | `SKILL_NOT_FOUND` | id 不存在 | `{}` |
| 413 | `FILE_TOO_LARGE` | zip > 10MB | `{max_mb:10}` |
| 429 | `RATE_LIMITED` | 限速 | `{retry_after}` |
| 500 | `UPSTREAM_ERROR` | 未预期 | `{}` |

## 3. GET /skills — 列表 / 筛选 / 排序

### 3.1 Query 参数

| 字段 | 类型 | 必填 | 默认 | 约束 |
|------|------|------|------|------|
| `q` | string | 否 | "" | 0–200 |
| `category` | string | 否 | — | 枚举白名单 |
| `tags` | string | 否 | — | 逗号分隔；AND 过滤 |
| `sort` | string | 否 | `hot` | `hot / downloads / rating / latest` |
| `page` | int | 否 | 1 | ≥1 |
| `page_size` | int | 否 | 12 | 1–50 |

### 3.2 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `items` | array<SkillSummary> | 列表项 |
| `total` | int | 过滤后总数 |
| `page` | int | — |
| `page_size` | int | — |

### 3.3 SkillSummary DTO

| 字段 | 类型 |
|------|------|
| `skill_id` | string |
| `name` | string |
| `description` | string |
| `category` | string |
| `tags` | array<string> |
| `rating_avg` | float (2 位小数) |
| `rating_count` | int |
| `view_count` | int |
| `download_count` | int |
| `like_count` | int |
| `favorite_count` | int |
| `hot_score` | float |
| `has_bundle` | bool（是否有 ZIP 下载包） |
| `updated_at` | string (ISO-8601) |

### 3.4 示例

```
GET /api/v1/hub/skills?category=frontend&tags=react,test&sort=hot&page=1&page_size=12
```

```json
{
  "traceId": "tr_9c...",
  "items": [
    {
      "skill_id": "sk_01HX...",
      "name": "React Test Generator",
      "description": "为 React 组件生成 Jest 测试",
      "category": "frontend",
      "tags": ["react","test","jest"],
      "rating_avg": 4.50,
      "rating_count": 18,
      "view_count": 320,
      "download_count": 87,
      "like_count": 42,
      "favorite_count": 15,
      "hot_score": 0.71,
      "has_bundle": true,
      "updated_at": "2026-04-12T10:00:00Z"
    }
  ],
  "total": 1, "page": 1, "page_size": 12
}
```

## 4. GET /skills/<id> — 详情

### 4.1 响应字段（在 SkillSummary 基础上追加）

| 字段 | 类型 | 说明 |
|------|------|------|
| `skill_md` | string | 原始 Markdown |
| `skill_md_html` | string | 消毒后 HTML |
| `created_at` | string | ISO-8601 |
| `bundle_size` | int \| null | ZIP 大小（字节），无则 null |
| `file_count` | int \| null | ZIP 内文件数 |

**副作用**：`view_count` 原子 +1 并重算 `hot_score`。

## 5. POST /skills — 在线创建

### 5.1 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `name` | string | 是 | 1–80 |
| `category` | string | 是 | 枚举 |
| `description` | string | 是 | 1–200 |
| `skill_md` | string | 是 | 1–10000 |
| `tags` | array<string> | 否 | 0–6 |

### 5.2 响应（201）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `skill_id` | string |
| `created_at` | string |

## 6. POST /skills/draft — LLM 生成草稿

### 6.1 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `intent` | string | 是 | 10–200 字符 |
| `category` | string | 否 | 枚举（提示 LLM） |

### 6.2 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_md_draft` | string | ≥100 字符，含 H1 + 至少 1 个 code fence |
| `fallback` | bool | true 表示使用模板兜底 |
| `upstream_latency_ms` | int | LLM 耗时（fallback 时为 0） |

## 7. POST /skills/upload — ZIP 上传

### 7.1 请求

- Content-Type: `multipart/form-data`
- 字段 `file`（必填）：zip 文件，`Content-Length ≤ 10MB`
- 可选字段 `override_name`：覆盖 frontmatter 解析的 name

### 7.2 成功响应（201）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `name` | string | 解析/覆盖后的名称 |
| `file_count` | int | ZIP 内文件数 |
| `bundle_size` | int | 压缩包原始字节 |

### 7.3 错误

| code | 说明 |
|------|------|
| `FILE_TOO_LARGE` | > 10MB |
| `MISSING_SKILL_MD` | 根目录无 skill.md |
| `UNSAFE_ZIP` | 含 `..`/绝对路径/符号链接 |
| `BUNDLE_LIMIT_EXCEEDED` | 解压 > 50MB 或 > 200 文件 |

## 8. GET /skills/<id>/download — 下载 ZIP

### 8.1 响应

- `200` + `Content-Type: application/zip` + `Content-Disposition: attachment; filename="<name>.zip"` + 二进制
- `download_count` 原子 +1 并重算 `hot_score`
- 无 bundle → 404 `SKILL_NOT_FOUND`（或专门 `BUNDLE_NOT_FOUND`）

## 9. POST /skills/smart-search — LLM 智能搜索

### 9.1 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `query` | string | 是 | 1–200 |
| `limit` | int | 否 | 默认 10，5–20 |

### 9.2 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `items` | array<SkillSummary & {match_reason}> | **长度保证 ≥ 5** |
| `keywords` | array<string> | LLM 提取的关键词（fallback 时为 query 分词） |
| `fallback` | bool | true 表示 LLM 不可用，使用关键词兜底 |
| `upstream_latency_ms` | int | — |

### 9.3 硬约束

| 规则 | 说明 |
|------|------|
| **MUST** | `items.length >= 5`（数据总数 ≥ 5 时；否则返回全部） |
| **MUST** | 超时 8s 或异常 → 自动 fallback |
| **MUST NOT** | 返回 5xx（所有失败均通过 fallback 转 200） |

## 10. GET /skills/tags — 标签频率

### 10.1 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array<{tag: string, count: int}>（Top 20，按 count 倒序） |

## 11. GET /categories — 分类白名单

### 11.1 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array<Category> |

**Category DTO**：`{ key, label, count }`

**白名单**：`frontend / backend / security / bigdata / coding / ppt / writing / other`

## 12. POST `/skills/<id>/like` · DELETE `/skills/<id>/like` — 点赞

### 12.1 行为

- POST：若当前 `visitor_id` 未点赞 → 新增，`like_count +1`；若已点赞 → 幂等（不变）
- DELETE：若已点赞 → 移除，`like_count -1`；否则幂等
- `visitor_id` 从请求 cookie `hub_visitor` 读取；缺失 → 后端生成并 `Set-Cookie`

### 12.2 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `liked` | bool | 操作后状态 |
| `like_count` | int | 最新计数 |

## 13. POST `/skills/<id>/favorite` · DELETE — 收藏

同 §12 结构，字段 `favorited / favorite_count`。

## 14. POST `/skills/<id>/rate` — 评分

### 14.1 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `score` | int | 是 | 1–5 |

### 14.2 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `rating_avg` | float | 更新后（2 位小数） |
| `rating_count` | int | 若该 visitor 首次评分则 +1；否则不变 |
| `my_score` | int | 本次保存的分数 |

## 15. GET /me/favorites — 当前访客收藏

### 15.1 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array<SkillSummary>（按收藏时间倒序） |
| `total` | int |

> 身份来自 cookie `hub_visitor`；未设置时返回空数组。

## 16. 参数校验规则汇总

| 端点 | 字段 | 规则 | HTTP | code |
|------|------|------|------|------|
| `GET /skills` | `q` | ≤ 200 | 400 | `INVALID_QUERY` |
| `GET /skills` | `category` | 枚举 | 400 | `INVALID_CATEGORY` |
| `GET /skills` | `sort` | 枚举 4 | 400 | `INVALID_QUERY` |
| `GET /skills` | `page_size` | 1-50 | 400 | `INVALID_PAGE` |
| `POST /skills` | 必填 4 项 | 非空 | 400 | `EMPTY_FIELD` |
| `POST /skills` | `category` | 枚举 | 400 | `INVALID_CATEGORY` |
| `POST /skills` | `tags` | 0-6 | 400 | `INVALID_TAG` |
| `POST /skills/draft` | `intent` | 10-200 | 400 | `INVALID_QUERY` |
| `POST /skills/draft` | 频率 | 1/5s | 429 | `RATE_LIMITED` |
| `POST /skills/upload` | `file` | ≤10MB | 413 | `FILE_TOO_LARGE` |
| `POST /skills/upload` | 解压 | ≤50MB/200 | 400 | `BUNDLE_LIMIT_EXCEEDED` |
| `POST /skills/upload` | 路径 | 安全 | 400 | `UNSAFE_ZIP` |
| `POST /skills/smart-search` | `query` | 1-200 | 400 | `INVALID_QUERY` |
| `POST /skills/<id>/rate` | `score` | 1-5 整数 | 400 | `INVALID_RATING` |
| 任意 `<id>` | 存在性 | skills.json 中有 | 404 | `SKILL_NOT_FOUND` |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-15 | 初稿 |
| v0.2 | 2026-04-15 | **重写**：新增 upload / draft / smart-search / like / favorite / rate / tags |
