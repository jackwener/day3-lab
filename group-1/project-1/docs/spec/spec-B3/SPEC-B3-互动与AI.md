# SPEC-B3 — 互动与 AI

---

| 项 | 值 |
|---|---|
| 角色编号 | B3 |
| 角色名称 | 互动与 AI（Interaction & AI） |
| 模块 | M2-HUB · Skill Hub |
| 文档版本 | v1.0 |
| 上游参考 | `spec-template/05` · `08` · `09` · `11` · `13` |

---

## 1. 角色定义与职责边界

### 1.1 职责

| 类别 | 说明 |
|------|------|
| **互动** | 点赞、收藏、评分 3 组端点 + 收藏列表，基于 visitor_id cookie 实现幂等 |
| **AI** | LLM 草稿生成、智能搜索 2 个端点，接入百炼 DashScope |
| **容错** | 断路器模式，三级降级（LLM → 关键词兜底 → 模板），保证主链路不返回 5xx |

### 1.2 边界（不做）

- **不做** 列表查询、详情、标签、分类（→ B1）
- **不做** ZIP 上传/下载、在线创建、Markdown 消毒（→ B2）
- **不做** Storage 引擎本身（使用 B1 的 JsonStorage）
- **不做** 任何前端页面（→ F）

---

## 2. 拥有的文件清单

> 以下文件由 B3 **独占编写**，其他角色不得修改。

```
backend/
├── routes/
│   ├── interact_bp.py              # like/favorite/rate/GET /me/favorites
│   └── ai_bp.py                    # POST /skills/draft, /skills/smart-search
├── services/
│   ├── interaction_service.py      # 点赞/收藏/评分业务逻辑
│   └── llm_service.py              # DashScope 接入/断路器/三级降级
├── storage/
│   └── interaction_storage.py      # 互动数据存储（interactions.json）
├── utils/
│   └── circuit_breaker.py          # 断路器模式实现
└── data/
    └── interactions.json           # 互动数据（点赞/收藏/评分记录）
```

---

## 3. API 端点规格 — 互动

> Base URL: `/api/v1/hub`

### 3.1 POST /skills/\<id\>/like · DELETE /skills/\<id\>/like — 点赞

#### 行为

- **POST**：若当前 `visitor_id` 未点赞 → 新增，`like_count +1`；若已点赞 → 幂等（不变）
- **DELETE**：若已点赞 → 移除，`like_count -1`；否则幂等
- `visitor_id` 从请求 cookie `hub_visitor` 读取；缺失 → 后端生成并 `Set-Cookie`

#### 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `liked` | bool | 操作后状态 |
| `like_count` | int | 最新计数 |

### 3.2 POST /skills/\<id\>/favorite · DELETE — 收藏

同 §3.1 结构，字段为 `favorited` / `favorite_count`。

### 3.3 POST /skills/\<id\>/rate — 评分

#### 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `score` | int | 是 | 1–5 |

#### 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `rating_avg` | float | 更新后（2 位小数） |
| `rating_count` | int | 首次评分 +1；覆盖旧值则不变 |
| `my_score` | int | 本次保存的分数 |

#### 校验

| 字段 | 规则 | HTTP | code |
|------|------|------|------|
| `score` | 1-5 整数 | 400 | `INVALID_RATING` |
| `<id>` | 存在性 | 404 | `SKILL_NOT_FOUND` |

### 3.4 GET /me/favorites — 当前访客收藏

#### 响应（200）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `items` | array\<SkillSummary\>（按收藏时间倒序） |
| `total` | int |

> 身份来自 cookie `hub_visitor`；未设置时返回空数组。

---

## 4. API 端点规格 — AI

### 4.1 POST /skills/draft — LLM 生成草稿

#### 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `intent` | string | 是 | 10–200 字符 |
| `category` | string | 否 | 枚举（提示 LLM） |

#### 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_md_draft` | string | ≥100 字符，含 H1 + 至少 1 个 code fence |
| `fallback` | bool | true = 使用模板兜底 |
| `upstream_latency_ms` | int | LLM 耗时（fallback 时为 0） |

#### 校验与限速

| 规则 | HTTP | code |
|------|------|------|
| `intent` 10-200 字符 | 400 | `INVALID_QUERY` |
| 同 visitor_id 5 秒冷却 | 429 | `RATE_LIMITED` |

#### LLM 编排流程

```
POST /skills/draft { intent }
  → llm_service.generate_draft(intent)
      ├─ 转义用户输入（防 prompt 注入）
      ├─ 组装系统 Prompt（角色 + 输出格式约束）
      ├─ 调 LLM，超时 8s
      ├─ 校验输出：必须含 H1 + 至少 1 个 code fence
      ├─ 通过 → 返回 skill_md_draft
      └─ 失败/超时 → 返回 TEMPLATE_DRAFT (fallback=true)
```

### 4.2 POST /skills/smart-search — LLM 智能搜索

#### 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `query` | string | 是 | 1–200 |
| `limit` | int | 否 | 默认 10，5–20 |

#### 响应（200）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `items` | array\<SkillSummary & {match_reason}\> | **长度保证 ≥ 5** |
| `keywords` | array\<string\> | LLM 提取的关键词 |
| `fallback` | bool | true = LLM 不可用 |
| `upstream_latency_ms` | int | — |

#### 硬约束

| 规则 | 说明 |
|------|------|
| **MUST** | `items.length >= 5`（数据总数 ≥ 5 时） |
| **MUST** | 超时 8s 或异常 → 自动 fallback |
| **MUST NOT** | 返回 5xx（所有失败均通过 fallback 转 200） |

#### 智能搜索编排流程

```
POST /skills/smart-search { query }
  → llm_service.smart_search(query)
      ├─ Step1: LLM 生成 keywords[] + categories[]（JSON 输出）
      ├─ Step2: 本地召回 = union(
      │          skills where category in categories,
      │          skills where name/desc/tags matches any keyword
      │       ) 按关键字命中数降序
      ├─ Step3: 若召回 <5 → 用 description 相似度补足到 5
      ├─ Step4: LLM 为 Top-N 每条生成 match_reason（可选，超时跳过）
      ├─ Step5: 返回 items[] (≥5)
      └─ 任一步骤失败 → 回退 keyword search 并补足到 5，fallback=true
```

#### 校验

| 字段 | 规则 | HTTP | code |
|------|------|------|------|
| `query` | 1-200 | 400 | `INVALID_QUERY` |

---

## 5. 断路器模式

### 5.1 状态机

| 状态 | 条件 | 行为 |
|------|------|------|
| **Closed** | 失败率 < 50% | 正常调用 LLM |
| **Open** | 连续 5 次失败或超时 | 60 秒内直接 fallback |
| **Half-Open** | 熔断 60 秒后 | 放 1 个请求探活 |

### 5.2 接口

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        ...
    
    def call(self, func, *args, **kwargs):
        """包装调用，自动管理状态转换"""
        
    @property
    def state(self) -> str:
        """返回 'closed' / 'open' / 'half_open'"""
```

---

## 6. 互动数据存储

### 6.1 interaction_storage.py 数据结构

```json
{
  "likes": {
    "<skill_id>": ["visitor_1", "visitor_2"]
  },
  "favorites": {
    "<skill_id>": {
      "visitor_1": "2026-04-15T10:00:00Z"
    }
  },
  "ratings": {
    "<skill_id>": {
      "visitor_1": 5,
      "visitor_2": 4
    }
  }
}
```

### 6.2 Storage 方法

| 方法 | 签名 | 行为 |
|------|------|------|
| `add_like` | `(skill_id, visitor_id) → bool` | 新增返回 True，已存在返回 False |
| `remove_like` | `(skill_id, visitor_id) → bool` | 移除返回 True，不存在返回 False |
| `has_liked` | `(skill_id, visitor_id) → bool` | — |
| `add_favorite` | `(skill_id, visitor_id) → bool` | — |
| `remove_favorite` | `(skill_id, visitor_id) → bool` | — |
| `has_favorited` | `(skill_id, visitor_id) → bool` | — |
| `get_favorites` | `(visitor_id) → list[str]` | 返回 skill_id 列表 |
| `set_rating` | `(skill_id, visitor_id, score) → (old, new)` | 返回旧分与新分 |
| `get_rating` | `(skill_id, visitor_id) → int\|None` | — |
| `get_skill_ratings` | `(skill_id) → dict` | 返回 {visitor_id: score} |

### 6.3 互动 → 计数同步

每次互动变更后，B3 需调用 B1 的接口更新 Skill 实体上的计数：

```python
# 点赞后同步
storage.update_skill(skill_id, {"like_count": new_count})
ranking_service.recompute(skill_id)
```

---

## 7. visitor_id 管理

| 项 | 规格 |
|----|------|
| Cookie 名 | `hub_visitor` |
| 生成时机 | 首次互动请求且 cookie 缺失时 |
| 格式 | `v_` + uuid4 |
| 有效期 | 365 天 |
| 适用范围 | 所有互动端点 + /me/favorites + /skills/draft（限速） |

```python
def get_or_create_visitor_id(request, response) -> str:
    vid = request.cookies.get('hub_visitor')
    if not vid:
        vid = f"v_{uuid4().hex}"
        response.set_cookie('hub_visitor', vid, max_age=365*86400, httponly=True)
    return vid
```

---

## 8. 用户故事与验收标准

### US-002a（P0）LLM 协助生成 skill.md 草稿

> 作为**不熟悉 skill.md 规范的作者**，我希望输入一句话描述意图，系统调用大模型生成草稿。

| AC | 描述 |
|----|------|
| AC-002a-01 | 用户输入 ≥10 字符意图 → 10 秒内返回 skill_md_draft（≥100 字符） |
| AC-002a-02 | 草稿必须包含一级标题、使用说明、至少 1 个代码块 |
| AC-002a-03 | LLM 失败/超时 → 200 + `fallback=true` + 本地模板草稿（不得返回 5xx） |
| AC-002a-04 | 同一 visitor_id 连续调用间隔 < 5 秒 → 429 `RATE_LIMITED` |
| AC-002a-05 | 草稿内容经过出站消毒，不得包含 `<script>` 片段 |

### US-007（P0）LLM 智能搜索

> 作为用户，我希望用自然语言描述需求，系统匹配至少 5 条合适的 skill。

| AC | 描述 |
|----|------|
| AC-007-01 | 输入 query 1–200 字符，响应 items.length >= 5 |
| AC-007-02 | 响应包含 items[].match_reason，由 LLM 给出 1 句相关性说明 |
| AC-007-03 | LLM 超时(>8s)或不可用 → fallback=true，仍返回 ≥5 条 |
| AC-007-04 | query 超长(>200) → 400 `INVALID_QUERY` |
| AC-007-05 | 总响应时间 ≤10 秒 |

### US-009（P0）点赞

> 作为用户，我希望对喜欢的 skill 点赞并可取消。

| AC | 描述 |
|----|------|
| AC-009-01 | 首次 POST → like_count +1；再次 POST → 200 计数不变（幂等） |
| AC-009-02 | DELETE → 已点赞 like_count -1；未点赞 → 200 不变 |
| AC-009-03 | 响应返回 `liked:boolean` + 最新 `like_count` |
| AC-009-04 | visitor_id 来自 cookie，缺失则后端生成并 Set-Cookie |

### US-010（P0）收藏

> 作为用户，我希望收藏稍后要用的 skill，在收藏列表中找回。

| AC | 描述 |
|----|------|
| AC-010-01 | 收藏/取消收藏幂等，响应返回 `favorited:boolean` + `favorite_count` |
| AC-010-02 | GET /me/favorites 返回当前访客全部收藏 |

### US-011（P0）评分

> 作为用户，我希望对 skill 打 1~5 星评分。

| AC | 描述 |
|----|------|
| AC-011-01 | 评分必须为 1~5 整数，否则 400 `INVALID_RATING` |
| AC-011-02 | 同一 visitor_id 重复评分 → 覆盖旧值，rating_count 不变 |
| AC-011-03 | 响应返回 rating_avg（2 位小数）与 rating_count |

---

## 9. 依赖与集成接口

### 9.1 B3 对 B1 的依赖

```python
from storage.json_storage import JsonStorage        # get_skill / update_skill / list_skills
from services.skill_service import SkillService     # 智能搜索需回查列表
from services.ranking_service import RankingService  # 互动后重算 hot_score
from utils.trace import generate_trace_id
from utils.errors import api_error, ErrorCode
from models.skill import Skill
```

### 9.2 B3 对 B2 的依赖

```python
from services.md_render import MdRender              # LLM 草稿消毒
from utils.rate_limiter import rate_limit            # /skills/draft 限速
```

### 9.3 Blueprint 注册

B3 的 `interact_bp` 和 `ai_bp` 由 B1 的 `app.py` 注册：
```python
# app.py（B1 编写）
try:
    from routes.interact_bp import interact_bp
    from routes.ai_bp import ai_bp
    app.register_blueprint(interact_bp, url_prefix='/api/v1/hub')
    app.register_blueprint(ai_bp, url_prefix='/api/v1/hub')
except ImportError:
    pass
```

---

## 10. LLM 接入配置

### 10.1 DashScope / OpenAI 兼容

| 配置项 | 来源 | 默认值 |
|--------|------|--------|
| `LLM_API_KEY` | 环境变量 | 必填 |
| `LLM_BASE_URL` | 环境变量 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `LLM_MODEL` | 环境变量 | `qwen-plus` |
| `LLM_TIMEOUT` | config.py | 8 秒 |

### 10.2 三级降级

```
Level 1: LLM 正常返回 → 使用 LLM 结果
Level 2: LLM 超时/错误 → 关键词兜底搜索（智能搜索）/ 模板草稿（draft）
Level 3: 断路器熔断 → 直接返回 fallback，不尝试调用 LLM
```

---

## 11. 里程碑对齐

| 阶段 | B3 任务 | DoD |
|------|---------|-----|
| **S2** | interact_bp（like/favorite/rate）+ interaction_storage | 互动操作可用 |
| **S3** | ai_bp + llm_service + circuit_breaker + smart-search + draft | LLM 全链路 + 降级 |
| **S4** | 幂等测试 + 降级测试 + 覆盖率 | 全量 TC 通过 |

### 关联测试用例

| TC 范围 | 覆盖 |
|---------|------|
| TC-M02-020~024 | LLM 草稿（正常 + fallback + 限速） |
| TC-M02-070~074 | 智能搜索（≥5 条 + fallback + 超时） |
| TC-M02-090~093 | 点赞（幂等 + 取消 + cookie） |
| TC-M02-100~104 | 收藏（幂等 + 列表 + cookie） |
| TC-M02-110~113 | 评分（1-5 + 覆盖 + 计数） |
| 断路器单元测试 | Closed/Open/Half-Open 状态转换 |

---

## 12. 非功能要求

| 项 | SLO |
|----|-----|
| POST /skills/draft | 10 秒内返回 |
| POST /skills/smart-search | 10 秒内返回 |
| 互动端点 P95 | < 200ms |
| LLM 超时 | 8 秒（硬上限） |
| 覆盖率 | ≥ 80% |

### Python 依赖（B3 新增）

- `dashscope` 或 `openai`：LLM API 调用
- `httpx`：HTTP 客户端（可选，替代 requests）
