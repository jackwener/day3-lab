# SPEC-B2 — 提交与安全

---

| 项 | 值 |
|---|---|
| 角色编号 | B2 |
| 角色名称 | 提交与安全（Submit & Security） |
| 模块 | M2-HUB · Skill Hub |
| 文档版本 | v1.0 |
| 上游参考 | `spec-template/05` · `08` · `09` · `10` · `11` · `13` |

---

## 1. 角色定义与职责边界

### 1.1 职责

| 类别 | 说明 |
|------|------|
| **核心** | 技能在线创建、ZIP 上传发布、ZIP 下载 3 个写入/下载端点 |
| **安全** | ZIP 安全校验（zip-slip、大小限制、文件数限制）、Markdown 渲染 + bleach XSS 消毒 |
| **防护** | 输入校验、限速装饰器 |

### 1.2 边界（不做）

- **不做** 列表查询、详情查询、标签、分类（→ B1）
- **不做** 点赞/收藏/评分、LLM 相关（→ B3）
- **不做** Storage 引擎本身（使用 B1 提供的 JsonStorage）
- **不做** 任何前端页面（→ F）

---

## 2. 拥有的文件清单

> 以下文件由 B2 **独占编写**，其他角色不得修改。

```
backend/
├── routes/
│   └── submit_bp.py                # POST /skills, POST /skills/upload, GET /download
├── services/
│   ├── zip_service.py              # ZIP 解压/校验/zip-slip 防护
│   └── md_render.py                # Markdown 渲染 + bleach 消毒
└── utils/
    ├── validators.py               # 输入校验（字段/ZIP/文件大小）
    └── rate_limiter.py             # 限速装饰器
```

---

## 3. API 端点规格

> Base URL: `/api/v1/hub`

### 3.1 POST /skills — 在线创建

#### 请求体

| 字段 | 类型 | 必填 | 约束 |
|------|------|------|------|
| `name` | string | 是 | 1–80 |
| `category` | string | 是 | 枚举白名单 |
| `description` | string | 是 | 1–200 |
| `skill_md` | string | 是 | 1–10000 |
| `tags` | array\<string\> | 否 | 0–6 项，每项 1–20 字符 |

#### 响应（201）

| 字段 | 类型 |
|------|------|
| `traceId` | string |
| `skill_id` | string |
| `created_at` | string (ISO-8601) |

#### 参数校验

| 字段 | 规则 | HTTP | code |
|------|------|------|------|
| 必填 4 项 | 非空 | 400 | `EMPTY_FIELD` |
| `category` | 枚举 | 400 | `INVALID_CATEGORY` |
| `tags` | 0-6 | 400 | `INVALID_TAG` |

#### 业务逻辑

1. 校验所有字段
2. 调用 `md_render.render(skill_md)` 生成 `skill_md_html`（bleach 消毒）
3. 调用 `JsonStorage.create_skill(payload)` 写入，固定 `status=pending`
4. 返回 201 + skill_id

### 3.2 POST /skills/upload — ZIP 上传发布

#### 请求

- Content-Type: `multipart/form-data`
- 字段 `file`（必填）：zip 文件，`Content-Length ≤ 10MB`
- 可选字段 `override_name`：覆盖 frontmatter 解析的 name

#### 成功响应（201）

| 字段 | 类型 | 说明 |
|------|------|------|
| `traceId` | string | — |
| `skill_id` | string | — |
| `name` | string | 解析/覆盖后的名称 |
| `file_count` | int | ZIP 内文件数 |
| `bundle_size` | int | 压缩包原始字节 |

#### 错误

| code | 说明 |
|------|------|
| `FILE_TOO_LARGE` | > 10MB → 413 |
| `MISSING_SKILL_MD` | 根目录无 skill.md → 400 |
| `UNSAFE_ZIP` | 含 `..`/绝对路径/符号链接 → 400 |
| `BUNDLE_LIMIT_EXCEEDED` | 解压 > 50MB 或 > 200 文件 → 400 |

#### ZIP 发布完整流程

```
POST /skills/upload (multipart)
  1. 校验 Content-Length ≤ 10MB
  2. 保存临时文件 tmp/<uuid>.zip
  3. zip_service.inspect(zip):
       - 遍历条目：禁 `..` / 禁绝对路径 / 禁软链
       - 累计大小 ≤ 50MB / 文件数 ≤ 200
       - 查找 root 下的 skill.md
       - 解析 YAML frontmatter → (name/description/category/tags)
  4. 生成 skill_id = sk_ + ULID
  5. 安全解压到 ./data/bundles/<skill_id>/
  6. 读取 skill.md 内容 → md_render 消毒 → 存 Skill 记录
  7. 返回 201 + skill_id
  失败路径：任何校验失败 → 删除临时文件 & 解压目录 → 返回对应 error.code
```

#### zip-slip 防护代码

```python
for member in zip.infolist():
    norm = os.path.normpath(member.filename)
    if norm.startswith('..') or os.path.isabs(norm):
        raise UnsafeZip
    target = os.path.join(bundle_dir, norm)
    if not os.path.abspath(target).startswith(os.path.abspath(bundle_dir) + os.sep):
        raise UnsafeZip
```

### 3.3 GET /skills/\<id\>/download — 下载 ZIP

#### 响应

- `200` + `Content-Type: application/zip` + `Content-Disposition: attachment; filename="<name>.zip"` + 二进制流
- `download_count` 原子 +1 并重算 `hot_score`
- 无 bundle → 404 `SKILL_NOT_FOUND`

---

## 4. Markdown 渲染与 XSS 消毒

### 4.1 后端消毒链

```
skill_md (原始 Markdown)
  → marked 解析为 HTML
  → bleach.clean() 白名单消毒
  → skill_md_html
```

### 4.2 白名单标签

- **允许**：`p, h1~h6, ul, ol, li, blockquote, pre, code, em, strong, a, img, table, thead, tbody, tr, th, td, br, hr, span, div`
- **禁止**：`script, iframe, object, embed, form, input, button, style`
- **禁止属性**：`on*`（onclick, onerror 等所有事件）
- **允许 img src**：仅 `http(s)` 或相对路径，禁 `javascript:`

### 4.3 md_render 接口

```python
class MdRender:
    def render(self, markdown_text: str) -> str:
        """将 Markdown 转为消毒后的 HTML"""
        
    def is_safe(self, html: str) -> bool:
        """检查 HTML 是否通过安全校验"""
```

---

## 5. 输入校验与限速

### 5.1 validators.py

```python
def validate_create_skill(data: dict) -> None:
    """校验 POST /skills 请求体，不通过则抛 ValidationError"""
    # 检查 name(1-80), category(枚举), description(1-200), 
    # skill_md(1-10000), tags(0-6项)

def validate_upload_file(file) -> None:
    """校验上传文件：大小 ≤ 10MB、扩展名 .zip"""
```

### 5.2 rate_limiter.py

| 端点 | 限速规则 |
|------|----------|
| `POST /skills` | 同 IP 10次/分钟 |
| `POST /skills/upload` | 同 IP 5次/分钟 |

```python
def rate_limit(max_calls: int, period: int):
    """限速装饰器，基于内存计数器 + 时间窗口"""
```

---

## 6. 用户故事与验收标准

### US-001（P0）ZIP 压缩包发布

> 作为**技能作者**，我希望**上传整个 skill 文件夹的 zip 压缩包**，以便**一次发布包含 skill.md + 资源脚本 + 截图的完整技能包**。

| AC | 描述 |
|----|------|
| AC-001-01 | 上传 ≤10MB 的 zip，后端识别到根目录 skill.md 后返回 201 + skill_id，30 秒内完成 |
| AC-001-02 | zip 中无 skill.md 或 skill.md 位于非根目录 → 400 `MISSING_SKILL_MD` |
| AC-001-03 | zip > 10MB → 413 `FILE_TOO_LARGE` |
| AC-001-04 | zip 解压后总大小 > 50MB 或文件数 > 200 → 400 `BUNDLE_LIMIT_EXCEEDED` |
| AC-001-05 | zip 包含 `..` 或绝对路径条目 → 400 `UNSAFE_ZIP`，**禁止任何文件落盘** |
| AC-001-06 | 成功发布后，详情页展示从 skill.md frontmatter 自动提取的 name/description/category/tags |

### US-002（P0）在线创建 Skill

> 作为**技能作者**，我希望**在网页上直接填写表单创建一个 skill**，以便**无需本地打包 zip**。

| AC | 描述 |
|----|------|
| AC-002-01 | 必填 name/category/description/skill_md，任一缺失 → 400 `EMPTY_FIELD` |
| AC-002-02 | 合法请求返回 201 + skill_id，保存 skill.md 到 `./data/bundles/<skill_id>/skill.md` |
| AC-002-03 | category 不在白名单 → 400 `INVALID_CATEGORY` |
| AC-002-04 | 成功后详情页可正常渲染 skill.md（经过 bleach 消毒） |

---

## 7. 依赖与集成接口

### 7.1 B2 对 B1 的依赖（import）

```python
from storage.json_storage import JsonStorage      # 调用 create_skill / get_skill / increment_download / update_skill
from services.ranking_service import RankingService  # 下载后重算 hot_score
from utils.trace import generate_trace_id
from utils.errors import api_error, ErrorCode
from models.skill import Skill
```

### 7.2 B2 对外暴露（供其他角色使用）

```python
from services.md_render import MdRender            # B3 的 LLM 草稿也需消毒
from utils.validators import validate_create_skill  # 可选复用
from utils.rate_limiter import rate_limit           # B3 可用于 LLM 端点限速
```

### 7.3 Blueprint 注册

B2 的 `submit_bp` 由 B1 的 `app.py` 负责注册：
```python
# app.py 中（B1 编写）
try:
    from routes.submit_bp import submit_bp
    app.register_blueprint(submit_bp, url_prefix='/api/v1/hub')
except ImportError:
    pass  # B2 尚未就绪
```

---

## 8. 里程碑对齐

| 阶段 | B2 任务 | DoD |
|------|---------|-----|
| **S2** | POST /skills（在线创建）+ md_render | 创建 → 详情可查可渲染 |
| **S3** | POST /skills/upload + zip_service + GET /download + rate_limiter | ZIP 全流程 + 限速 |
| **S4** | validators 完善 + 安全用例 + 覆盖率 | 全量安全 TC 通过 |

### 关联测试用例

| TC 范围 | 覆盖 |
|---------|------|
| TC-M02-001~006 | ZIP 上传（正常 + 5 种错误场景） |
| TC-M02-010~013 | 在线创建（正常 + 校验失败） |
| TC-M02-030~032 | 下载 ZIP + 下载计数 |
| XSS 安全用例 | script 注入 / on* 属性 / javascript: URI |
| 限速用例 | 超频 → 429 |

---

## 9. 安全设计要点

### 9.1 ZIP 安全

| 威胁 | 防护 |
|------|------|
| zip-slip（路径穿越） | `os.path.normpath` + `startswith` 双重校验 |
| zip 炸弹 | 解压前检查累计大小 ≤ 50MB、文件数 ≤ 200 |
| 恶意 skill.md | bleach 白名单消毒 |
| 超大文件 | `Content-Length` 前端 + 后端双重校验 |
| 符号链接 | 遍历条目时禁止 symlink |

### 9.2 XSS 双层防护

```
后端：marked → bleach（白名单标签/属性）→ skill_md_html（存储）
前端：DOMPurify 二次消毒（F 负责）
```

---

## 10. 非功能要求

| 项 | SLO |
|----|-----|
| POST /skills/upload | 30 秒内完成 |
| POST /skills | < 500ms |
| 单文件 | ≤ 400 行 |
| 函数 | ≤ 50 行 |
| 覆盖率 | ≥ 80% |

### Python 依赖（B2 新增）

- `bleach`：HTML 白名单消毒
- `markdown` 或 `mistune`：Markdown → HTML
- `pyyaml`：YAML frontmatter 解析
