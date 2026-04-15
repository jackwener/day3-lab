# SPEC-B1 — 查询与数据层

---

| 项 | 值 |
|---|---|
| 角色编号 | B1 |
| 角色名称 | 查询与数据层（Query & Data Layer） |
| 模块 | M2-HUB · Skill Hub |
| 文档版本 | v1.0 |
| 上游参考 | `spec-template/05` · `08` · `09` · `10` · `12` · `13` |

---

## 1. 角色定义与职责边界

### 1.1 职责

| 类别 | 说明 |
|------|------|
| **核心** | 提供技能列表查询、详情、标签频率、分类白名单 4 个 GET 端点 |
| **基础设施** | 搭建 Flask app factory、Storage 引擎、数据模型、种子数据、traceId、统一错误码 |
| **服务** | 过滤/排序/分页/关键词搜索、hot_score 热度计算 |

### 1.2 边界（不做）

- **不做** ZIP 上传/下载、在线创建（→ B2）
- **不做** 点赞/收藏/评分、LLM 相关（→ B3）
- **不做** 任何前端页面（→ F）

---

## 2. 拥有的文件清单

> 以下文件由 B1 **独占编写**，其他角色仅通过 import 引用，不得修改。

```
backend/
├── app.py                          # Flask app factory, 注册所有 Blueprint
├── config.py                       # 配置（端口、数据路径、LLM Key 等）
├── requirements.txt                # Python 依赖清单
├── models/
│   ├── __init__.py
│   ├── skill.py                    # Skill 数据模型
│   └── category.py                 # Category 数据模型
├── storage/
│   ├── __init__.py
│   └── json_storage.py             # JSON 存储引擎（文件锁 + 原子写）
├── services/
│   ├── __init__.py
│   ├── skill_service.py            # 过滤/排序/分页/计数/关键词搜索
│   └── ranking_service.py          # hot_score 计算与归一化
├── routes/
│   ├── __init__.py
│   └── query_bp.py                 # 4 个 GET 端点
├── utils/
│   ├── __init__.py
│   ├── trace.py                    # traceId 生成（tr_ + uuid4）
│   └── errors.py                   # 统一错误码 + api_error() 工厂
└── data/
    ├── skills.json                 # 种子数据（≥10 条 published）
    └── categories.json             # 分类白名单
```

---

## 3. API 端点规格

> Base URL: `/api/v1/hub`

### 3.1 GET /skills — 列表 / 筛选 / 排序

#### Query 参数

| 字段 | 类型 | 必填 | 默认 | 约束 |
|------|------|------|------|------|
| `q` | string | 否 | "" | 0–200 |
| `category` | string | 否 | — | 枚举白名单 |
| `tags` | string | 否 | — | 逗号分隔；AND 过滤 |
| `sort` | string | 否 | `hot` | `hot / downloads / rating / latest` |
| `page` | int | 否 | 1 | ≥1 |
| `page_size` | int | 否 | 12 | 1–50 |

#### 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `items` | array\<SkillSummary\> | 列表项 |
| `total` | int | 过滤后总数 |
| `page` | int | — |
| `page_size` | int | — |

#### SkillSummary DTO

| 字段 | 类型 |
|------|------|
| `skill_id` | string |
| `name` | string |
| `description` | string |
| `category` | string |
| `tags` | array\<string\> |
| `rating_avg` | float (2 位小数) |
| `rating_count` | int |
| `view_count` | int |
| `download_count` | int |
| `like_count` | int |
| `favorite_count` | int |
| `hot_score` | float |
| `has_bundle` | bool |
| `updated_at` | string (ISO-8601) |

#### 参数校验

| 字段 | 规则 | HTTP | code |
|------|------|------|------|
| `q` | ≤ 200 | 400 | `INVALID_QUERY` |
| `category` | 枚举 | 400 | `INVALID_CATEGORY` |
| `sort` | 枚举 4 | 400 | `INVALID_QUERY` |
| `page_size` | 1-50 | 400 | `INVALID_PAGE` |

### 3.2 GET /skills/\<id\> — 详情

#### 响应字段（在 SkillSummary 基础上追加）

| 字段 | 类型 | 说明 |
|------|------|------|
| `skill_md` | string | 原始 Markdown |
| `skill_md_html` | string | 消毒后 HTML |
| `created_at` | string | ISO-8601 |
| `bundle_size` | int \| null | ZIP 大小（字节） |
| `file_count` | int \| null | ZIP 内文件数 |

**副作用**：`view_count` 原子 +1 并重算 `hot_score`。

#### 错误

| code | 条件 |
|------|------|
| `SKILL_NOT_FOUND` | id 不存在 → 404 |

### 3.3 GET /skills/tags — 标签频率

#### 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array\<{tag: string, count: int}\>（Top 20，按 count 倒序） |

### 3.4 GET /categories — 分类白名单

#### 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array\<Category\> |

**Category DTO**：`{ key, label, count }`

**白名单**：`frontend / backend / security / bigdata / coding / ppt / writing / other`

---

## 4. 统一响应规范（B1 定义，全员遵守）

### 4.1 成功

```json
{ "traceId": "tr_abc...", "...业务字段": "..." }
```

### 4.2 错误

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

### 4.3 错误码清单（全量，供 B2/B3 引用）

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

---

## 5. 数据模型与存储规格

### 5.1 Skill 实体

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `skill_id` | string | 是 | PK，`sk_` + ULID | 唯一 ID |
| `name` | string | 是 | 1–80 | 名称 |
| `author` | string | 是 | 1–50 | 作者 |
| `category` | string | 是 | 白名单枚举 | 分类 |
| `description` | string | 是 | 1–200 | 简介 |
| `install_command` | string | 是 | 1–200 | CLI 命令 |
| `skill_md` | string | 是 | 1–10000 | 原始 Markdown |
| `skill_md_html` | string | 是 | — | 消毒后 HTML |
| `tags` | array\<string\> | 否 | 0–6 项 | 标签 |
| `status` | string | 是 | `pending/published/rejected` | 状态 |
| `view_count` | int | 是 | ≥ 0 | 浏览次数 |
| `download_count` | int | 是 | ≥ 0 | 下载次数 |
| `like_count` | int | 是 | ≥ 0 | 点赞数 |
| `favorite_count` | int | 是 | ≥ 0 | 收藏数 |
| `rating_avg` | float | 是 | 0–5 | 平均评分 |
| `rating_count` | int | 是 | ≥ 0 | 评分人数 |
| `hot_score` | float | 是 | 0–1 | 热度分 |
| `has_bundle` | bool | 是 | — | 是否有 ZIP |
| `bundle_size` | int\|null | 否 | — | ZIP 字节数 |
| `file_count` | int\|null | 否 | — | ZIP 文件数 |
| `featured_weight` | int | 否 | 默认 0 | 置顶权重 |
| `created_at` | string | 是 | ISO-8601 | — |
| `updated_at` | string | 是 | ISO-8601 | — |

### 5.2 Category 实体

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | string | PK，英文标识 |
| `label` | string | 展示名（≤20 字符） |
| `count` | int | 运行时聚合 |

### 5.3 存储引擎

| 项 | 说明 |
|----|------|
| 引擎 | JSON 文件（UTF-8，缩进 2 空格） |
| 读写 | RMW（全量读 → 修改 → 原子写） |
| 并发 | `fcntl.flock` 文件级排它锁 |
| 原子写 | 写临时文件 → `os.replace` 重命名 → `.bak` 备份 |
| 文件 | `./data/skills.json` · `./data/categories.json` |

### 5.4 Storage 方法清单

| 方法 | 签名 | 行为 |
|------|------|------|
| `list_skills` | `(filters, sort, page, page_size) → (items, total)` | 过滤+排序+分页 |
| `get_skill` | `(skill_id) → dict\|None` | 按 ID 取一条 |
| `create_skill` | `(payload) → dict` | 生成 skill_id，写入 |
| `increment_view` | `(skill_id) → int` | view_count 原子 +1 |
| `increment_download` | `(skill_id) → int` | download_count 原子 +1 |
| `update_skill` | `(skill_id, updates) → dict` | 更新字段 |
| `list_categories` | `() → list` | 返回白名单 + 动态 count |
| `get_tags_frequency` | `() → list` | 标签 Top 20 频次 |
| `_read_json` | `(path) → dict\|list` | 加锁读，失败回退 `.bak` |
| `_write_json` | `(path, data) → None` | 原子写 + `.bak` |

### 5.5 热度排名公式

```python
def compute_hot_score(skill, stats):
    d = norm(skill.download_count, stats.max_download)
    r = norm(skill.rating_avg * min(skill.rating_count, 50) / 50, 5.0)
    i = norm(skill.like_count + skill.favorite_count, stats.max_interaction)
    return 0.5 * d + 0.3 * r + 0.2 * i
```

- 写时更新：每次互动变更 → 重算该 skill 的 `hot_score`
- `stats.max_*` 由 `compute_global_stats()` 缓存 60 秒
- 分母为 0 时 `norm()` 返回 0，不得出现 NaN

### 5.6 种子数据要求

- ≥ 10 条 `status=published` 记录覆盖所有分类
- ≥ 1 条 `featured_weight > 0`
- ≥ 2 条含中文 `name / description`
- 所有 `skill_md` 至少包含一级标题 + 代码块

---

## 6. 用户故事与验收标准

### US-003（P0）技能详情展示

> 作为**访客**，我希望在详情页看到 skill.md 内容以及描述、标签、评分、浏览数等，以便判断是否使用。

| AC | 描述 |
|----|------|
| AC-003-01 | 详情页展示 name/description/category/tags/rating_avg/rating_count/view_count/favorite_count/like_count/download_count/updated_at |
| AC-003-02 | skill.md 以 Markdown 渲染后呈现 (`skill_md_html`)，XSS 消毒后禁止 `<script>` |
| AC-003-03 | 进入详情页时 `view_count` 原子 +1 |
| AC-003-04 | 若存在 zip bundle，返回 `has_bundle=true` + `bundle_size` + `file_count` |
| AC-003-05 | 不存在的 skill_id → 404 `SKILL_NOT_FOUND` |

### US-005（P0）标签筛选

> 作为用户，我希望通过点击标签筛选技能，以便快速找到相关 skill。

| AC | 描述 |
|----|------|
| AC-005-01 | `GET /skills/tags` 返回标签频率 Top 20 |
| AC-005-02 | `GET /skills?tags=a,b` 以 AND 逻辑过滤 |

### US-006（P0）分类筛选与排序

> 作为用户，我希望按分类筛选并按多维度排序。

| AC | 描述 |
|----|------|
| AC-006-01 | 排序支持 `hot / downloads / rating / latest`，默认 `hot` |
| AC-006-02 | `sort=downloads` 按 download_count 倒序；`sort=rating` 按加权公式倒序 |
| AC-006-03 | 分类与排序可叠加 |
| AC-006-04 | 分类不在白名单 → 400 `INVALID_CATEGORY` |

### US-008（P0）热度排名

> 作为用户，我希望默认看到按热度排序的技能。

| AC | 描述 |
|----|------|
| AC-008-01 | `sort=hot` 按公式计算 `hot_score` 倒序 |
| AC-008-02 | 互动数据变化后 1 秒内反映新排序 |
| AC-008-03 | 所有计数分母为 0 时返回 0，不得 NaN |

---

## 7. 依赖与集成接口

### 7.1 B1 对外暴露（供 B2/B3 import）

```python
# B2/B3 可 import 的接口
from storage.json_storage import JsonStorage      # 存储引擎实例
from services.skill_service import SkillService   # 查询/列表方法
from services.ranking_service import RankingService
from utils.trace import generate_trace_id
from utils.errors import api_error, ErrorCode
from models.skill import Skill
from models.category import Category
```

### 7.2 B1 的外部依赖

- 无外部 API 依赖
- Python 包：`flask`, `ulid-py`（ULID 生成）

### 7.3 B1 需为 B2/B3 预留

- `app.py` 中注册 B2 的 `submit_bp`、B3 的 `interact_bp` 和 `ai_bp`（使用 try/except 容错缺失模块）
- `JsonStorage.create_skill()` / `JsonStorage.update_skill()` 供 B2 写入
- `JsonStorage.get_skill()` / `JsonStorage.list_skills()` 供 B3 查询

---

## 8. 里程碑对齐

| 阶段 | B1 任务 | DoD |
|------|---------|-----|
| **S1** | Storage + 种子数据 + GET /skills + GET /categories + app.py 骨架 | 列表可查、分类可筛 |
| **S2** | GET /skills/\<id\> + GET /skills/tags + ranking_service | 详情 + 标签频率 + 热度排序 |
| **S4** | 错误码对齐 + 覆盖率 ≥ 80% | 全量 TC 通过 |

### 关联测试用例

| TC 范围 | 覆盖 |
|---------|------|
| TC-M02-001~004 | 列表与分类 |
| TC-M02-010~013 | 搜索与标签过滤 |
| TC-M02-020~023 | 详情页与计数 |
| TC-M02-060~064 | 分类与排序 |
| TC-M02-080~082 | 热度排名 |
| Storage 单元测试 | _read_json / _write_json / 并发锁 |

---

## 9. 非功能要求

| 项 | SLO |
|----|-----|
| GET /skills P95 | < 300ms |
| GET /skills/\<id\> P95 | < 200ms |
| 单文件 | ≤ 400 行 |
| 函数 | ≤ 50 行 |
| 后端覆盖率 | ≥ 80% |
| Python | ≥ 3.10 |
