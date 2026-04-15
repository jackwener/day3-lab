# SPEC-F — 前端

---

| 项 | 值 |
|---|---|
| 角色编号 | F |
| 角色名称 | 前端（Frontend SPA） |
| 模块 | M2-HUB · Skill Hub |
| 文档版本 | v1.0 |
| 上游参考 | `spec-template/05` · `06` · `08` · `09` · `13` |

---

## 1. 角色定义与职责边界

### 1.1 职责

| 类别 | 说明 |
|------|------|
| **核心** | 4 个页面：列表、详情、创建、上传 |
| **交互** | 主题切换、标签筛选、排序、分页、搜索（关键词 + 智能）、互动操作（点赞/收藏/评分） |
| **纯前端** | 主题系统（CSS 变量 + data-theme + localStorage）、乐观更新、错误处理映射 |

### 1.2 边界（不做）

- **不做** 任何后端 Python 代码（→ B1/B2/B3）
- **不做** API 逻辑实现，仅通过 REST 调用
- **不做** 后端 Markdown 消毒（前端仅做 DOMPurify 二次消毒）

---

## 2. 拥有的文件清单

> `code/src/` 目录下所有文件归 F **独占**，后端角色不得修改。

```
code/src/
├── components/
│   ├── Header.tsx                  # Logo/搜索框(关键词+智能)/新建/上传ZIP/主题切换
│   ├── Sidebar.tsx                 # 分类侧边栏（白名单 + 计数）
│   ├── SkillCard.tsx               # 技能卡片（评分/下载/赞/藏/浏）
│   ├── TagCloud.tsx                # 标签云（Top 20 高频）
│   ├── StarRating.tsx              # 1~5 星评分组件
│   ├── Pagination.tsx              # 分页器
│   ├── ThemeProvider.tsx           # 主题 Context + CSS 变量
│   └── ErrorBoundary.tsx           # 全局错误边界
├── pages/
│   ├── SkillList.tsx               # 列表页（筛选/排序/分页/搜索）
│   ├── SkillDetail.tsx             # 详情页（Markdown渲染/互动操作）
│   ├── SkillCreate.tsx             # 创建页（表单+LLM协助）
│   └── SkillUpload.tsx             # 上传页（ZIP拖拽上传+进度条）
├── hooks/
│   ├── useTheme.ts                 # 主题 hook（读写 localStorage + data-theme）
│   ├── useSkills.ts                # 列表数据 hook（GET /skills 封装）
│   └── useVisitor.ts              # visitor_id cookie 读取
├── services/
│   └── api.ts                      # 全部 API 调用封装（13 个端点）
├── types/
│   └── skill.ts                    # TypeScript 类型定义（Skill/Category/DTO）
├── App.tsx                         # 路由配置
├── main.tsx                        # 入口
└── index.css                       # CSS 变量 + 全局样式
```

---

## 3. 技术选型

| 项 | 选型 | 理由 |
|----|------|------|
| UI | React ≥ 18 | 通用 |
| 构建 | Vite ≥ 5 | 零配置，已初始化 |
| 路由 | React Router 6 | 4 个页面 |
| 状态 | `useState` + `useReducer` + URL query + Context | 轻量 |
| Markdown | `marked` + `DOMPurify` | 双层消毒（前端侧） |
| 代码高亮 | `highlight.js` | 生态成熟 |
| 上传 | `fetch` + `FormData` + `XHR onprogress` | 显示进度 |
| 主题 | CSS 变量 + `data-theme` + `localStorage` | 无刷新切换 |

---

## 4. 页面规格

### 4.1 列表页 SkillList（路由 `/`）

#### 布局

```
┌────────────────────────────────────────────────────────┐
│  Header: Logo · 搜索框[关键词/智能] · [新建] · [上传] · 🌙  │
├──────────────┬─────────────────────────────────────────┤
│  Sidebar     │  Main                                    │
│  Categories  │  排序下拉 [hot ▾]                         │
│  ☐ 前端      │  tag chips: [#react][#test]...           │
│  ☐ 后端      │                                          │
│  ...         │  SkillCard × N                           │
│              │  [分页器]                                │
└──────────────┴─────────────────────────────────────────┘
```

#### API 调用

| 场景 | 请求 |
|------|------|
| 初次加载 | `GET /skills?sort=hot&page=1&page_size=12` |
| 分类筛选 | `GET /skills?category=frontend` |
| 标签过滤 | `GET /skills?tags=react,test`（AND 逻辑） |
| 排序 | `sort=hot / downloads / rating / latest` |
| 关键词搜索 | `GET /skills?q=...`（300ms 防抖） |
| 智能搜索 | `POST /skills/smart-search { query }` |
| 标签云 | `GET /skills/tags` |
| 分类列表 | `GET /categories` |

#### 三态渲染

| 状态 | 条件 | 显示 |
|------|------|------|
| 加载中 | `loading` | 骨架屏（12 卡片占位） |
| 空结果 | `items.length === 0 && !loading` | 空状态插画 + "清空筛选" 按钮 |
| 正常 | `items.length > 0` | 卡片网格 + 分页器 |

#### 排序下拉

| 选项 | sort 值 | 说明 |
|------|---------|------|
| 热度 | `hot` | 默认，综合公式 |
| 下载量 | `downloads` | download_count 倒序 |
| 评分 | `rating` | 加权评分倒序 |
| 最新 | `latest` | updated_at 倒序 |

#### SkillCard 元素

| 元素 | 字段 |
|------|------|
| 标题 | `name` |
| 描述 | `description`（截断 2 行） |
| 分类 | `category` |
| 标签 | `tags[]`（最多显示 4 个） |
| 统计 | ⭐rating_avg(rating_count) / 👁view_count / ⬇download_count / 👍like_count / ⭐favorite_count |
| 快捷操作 | 悬浮时显示"点赞"、"收藏" |

#### URL 同步

所有筛选/排序/分页状态同步到 URL query：`?category=dev&tags=react&sort=hot&page=2&q=test`

#### 智能搜索模式

```
用户切到智能搜索模式 → 输入自然语言 → 回车
  → POST /skills/smart-search { query }
  → 加载态：「AI 正在匹配… 预计 ≤10 秒」
  → 返回 items[]（≥5），每项展示 match_reason
  → 若 fallback=true，顶部显示 "AI 暂不可用，已使用关键词兜底"
```

| 项 | 规格 |
|----|------|
| 输入长度 | 1–200 字符 |
| 前端超时 | 12 秒硬超时 |
| 空结果 | 永远不出现（后端保证 ≥5） |

### 4.2 详情页 SkillDetail（路由 `/skills/:id`）

#### 布局

```
┌────────────────────────────────────────────────────┐
│  ← 返回                                     [🌙]   │
│  H1 name                                           │
│  meta: category · 作者 · updated_at · tags[]       │
│  互动栏: ⭐⭐⭐⭐☆ (4.3·27评) 👁128 ⬇37 👍12 ⭐9    │
│  [⬇下载ZIP] [👍点赞] [⭐收藏]                        │
│  ─────────────────────────────────────────          │
│  skill.md (Markdown 渲染 + 代码高亮)                │
└────────────────────────────────────────────────────┘
```

#### 数据加载

| 时机 | 请求 |
|------|------|
| 进入页面 | `GET /skills/<id>`（后端自动 view_count +1） |
| 404 | 显示 "技能不存在" 占位页 |

#### 互动栏

| 元素 | 行为 |
|------|------|
| **⬇ 下载 ZIP** | `window.open('/api/v1/hub/skills/<id>/download')`；前端自增 download_count |
| **👍 点赞** | 未点赞 → `POST /like`；已点赞 → `DELETE /like`；按钮态切换；显示 like_count |
| **⭐ 收藏** | 逻辑同点赞；favorited / favorite_count |
| **星级评分** | 1~5 星点击 → `POST /rate { score }`；显示 rating_avg + rating_count |
| **浏览计数** | 只读展示 view_count |

**乐观更新**：点击后立即 UI 自增，API 失败时回滚并提示 Toast。

#### Markdown 渲染

| 项 | 规格 |
|----|------|
| 源数据 | `skill_md_html`（后端已消毒） |
| 前端消毒 | `DOMPurify.sanitize(skill_md_html)` 后 `dangerouslySetInnerHTML` |
| 代码高亮 | `highlight.js` 对 `<pre><code>` 块自动高亮 |
| 图片 | 允许 `<img src>`，src 限 http(s) 或相对路径 |

### 4.3 创建页 SkillCreate（路由 `/create`）

#### 布局

```
┌────────────────────────────────────────────────────┐
│  💡 AI 协助：[描述你的 skill 用途______] [生成草稿]  │
│  Name *      [____________]                         │
│  Category *  [前端 ▾]                               │
│  Tags        [chip input]                           │
│  Description*[__________________________]           │
│  skill.md *  [textarea (支持 Markdown 预览)]         │
│              [取消]  [保存]                          │
└────────────────────────────────────────────────────┘
```

#### 表单字段

| 字段 | 类型 | 校验 |
|------|------|------|
| name | text | 非空 1–80 |
| category | select | 白名单（从 GET /categories 获取） |
| tags | chip input | 0–6 项 |
| description | textarea | 非空 1–200 |
| skill_md | textarea + 预览 | 非空 1–10000 |

#### LLM 协助流程

| 步骤 | 行为 |
|------|------|
| 1 | 用户在 "💡 AI 协助" 输入框写 ≥10 字意图 |
| 2 | 点"生成草稿" → Button 置 loading，倒计时 10 秒 |
| 3 | `POST /skills/draft { intent }` |
| 4 | 成功 → 将 `skill_md_draft` 填入 skill_md 文本域（覆盖需确认对话框） |
| 5 | 若 `fallback=true` → Toast "AI 暂不可用，已使用模板草稿" |
| 6 | 限速：同 visitor_id 5 秒冷却，按钮显示倒计时 |

#### 提交

`POST /skills` → 成功 201 → 跳转 `/skills/<skill_id>`

### 4.4 上传页 SkillUpload（路由 `/upload`）

#### 流程

```
1. 选择/拖拽 zip
2. 前端校验 size ≤ 10MB、扩展名 = .zip
3. FormData 上传 → POST /skills/upload (multipart/form-data)
4. 进度条显示上传百分比（XHR onprogress）
5. 后端解压校验 → 成功 201 + skill_id → 跳转详情
6. 失败显示 error.code 对应文案
```

#### 错误文案映射

| error.code | 前端文案 |
|------------|----------|
| `FILE_TOO_LARGE` | "压缩包超过 10MB，请精简后重试" |
| `MISSING_SKILL_MD` | "压缩包根目录必须包含 skill.md" |
| `BUNDLE_LIMIT_EXCEEDED` | "解压后文件数或总大小超限" |
| `UNSAFE_ZIP` | "压缩包包含不安全路径，已拒绝" |
| `UPSTREAM_ERROR` | "服务器开小差了，请稍后重试" |

---

## 5. 主题切换（US-004，纯前端）

| 步骤 | 行为 |
|------|------|
| 初始化 | `theme = localStorage.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')` |
| 切换 | `document.documentElement.setAttribute('data-theme', newTheme)`；同步 localStorage |
| 样式 | CSS 变量：`--bg / --fg / --card / --border / --primary / --muted`；深浅色在 `:root[data-theme=...]` 覆写 |
| 对比度 | 文本 vs 背景 ≥ 4.5:1（WCAG AA） |
| 范围 | Header / Sidebar / Main / 卡片 / 代码块 / 模态框 / 表单全部切换 |

---

## 6. 状态管理

| State | 类型 | 初始值 | 用途 |
|-------|------|--------|------|
| `theme` | `'light' \| 'dark'` | 系统偏好 | 主题 |
| `items` | `Skill[]` | `[]` | 列表 |
| `total / page / page_size` | `number` | — | 分页 |
| `filters` | `{category,tags,q,sort,mode}` | `{sort:'hot',mode:'keyword'}` | 筛选 |
| `loading / error` | `boolean / string\|null` | — | 加载状态 |
| `visitorId` | `string` | cookie | 互动身份 |
| `liked / favorited` | `Record<skillId, boolean>` | `{}` | 本访客已点赞/收藏集合 |

---

## 7. 错误处理映射（全量）

| error.code | HTTP | 前端展示 |
|------------|------|----------|
| `EMPTY_FIELD` | 400 | 字段红框 + details.field |
| `INVALID_CATEGORY` | 400 | "分类不合法" |
| `INVALID_TAG` | 400 | "标签不合法" |
| `INVALID_QUERY` | 400 | "查询过长" |
| `INVALID_RATING` | 400 | "评分必须 1–5" |
| `FILE_TOO_LARGE` | 413 | 上传页文案 |
| `MISSING_SKILL_MD` | 400 | 上传页文案 |
| `BUNDLE_LIMIT_EXCEEDED` | 400 | 上传页文案 |
| `UNSAFE_ZIP` | 400 | 上传页文案 |
| `RATE_LIMITED` | 429 | "操作过于频繁，请稍后" |
| `SKILL_NOT_FOUND` | 404 | 详情页占位 |
| `LLM_UNAVAILABLE` | 200 + fallback | Toast "AI 暂不可用" |
| `UPSTREAM_ERROR` | 500 | Toast "服务器开小差了" |

---

## 8. 用户故事与验收标准（前端相关）

### US-004（P0）深色 / 浅色主题切换（纯前端）

| AC | 描述 |
|----|------|
| AC-004-01 | 首次访问读取 `matchMedia('(prefers-color-scheme: dark)')` 作为默认 |
| AC-004-02 | 点击 Header 切换按钮立即切换 `data-theme`，无刷新 |
| AC-004-03 | 切换后写入 localStorage，刷新后保持 |
| AC-004-04 | 两个主题下文本/背景对比度 ≥ WCAG AA（4.5:1） |

### US-001 前端部分 — 上传页

| AC | 描述 |
|----|------|
| AC-001-F-01 | 拖拽/点击选择 .zip 文件，前端校验 ≤10MB |
| AC-001-F-02 | 上传中显示进度条百分比 |
| AC-001-F-03 | 成功 → 跳转详情页；失败 → 显示对应错误文案 |

### US-002 前端部分 — 创建页

| AC | 描述 |
|----|------|
| AC-002-F-01 | 表单实时校验（红框 + 提示） |
| AC-002-F-02 | 提交成功 → 跳转详情页 |

### US-002a 前端部分 — LLM 协助

| AC | 描述 |
|----|------|
| AC-002a-F-01 | 输入 ≥10 字后"生成草稿"按钮可点击 |
| AC-002a-F-02 | 点击后 loading 态 + 倒计时 |
| AC-002a-F-03 | 草稿填入 skill_md（覆盖需确认） |
| AC-002a-F-04 | fallback=true → Toast 提示 |
| AC-002a-F-05 | 5 秒冷却期按钮禁用 + 倒计时 |

### US-003 前端部分 — 详情页

| AC | 描述 |
|----|------|
| AC-003-F-01 | 展示全部元数据字段 |
| AC-003-F-02 | Markdown 经 DOMPurify 消毒后渲染 + 代码高亮 |
| AC-003-F-03 | 有 bundle → 显示"下载 ZIP"按钮 |
| AC-003-F-04 | 404 → 显示占位页 |

### US-005/006 前端部分 — 筛选与排序

| AC | 描述 |
|----|------|
| AC-005-F-01 | 标签云从 GET /skills/tags 渲染 Top 20 |
| AC-005-F-02 | 多选 AND 过滤，已选高亮，再点取消 |
| AC-006-F-01 | 排序下拉 4 选项，默认 hot |
| AC-006-F-02 | 分类 + 标签 + 排序 + 搜索可叠加，URL 同步 |

### US-009/010/011 前端部分 — 互动

| AC | 描述 |
|----|------|
| AC-interact-01 | 点赞/收藏按钮状态跟随已点赞/已收藏 |
| AC-interact-02 | 乐观更新：点击立即 UI 变化，失败回滚 + Toast |
| AC-interact-03 | 星级组件点击 → POST /rate → 刷新 rating_avg 显示 |

---

## 9. 依赖与集成接口

### 9.1 API 调用汇总（api.ts 封装全部 13 个端点）

| 端点 | 提供方 | 前端用途 |
|------|--------|----------|
| `GET /skills` | B1 | 列表页 |
| `GET /skills/<id>` | B1 | 详情页 |
| `GET /skills/tags` | B1 | 标签云 |
| `GET /categories` | B1 | 分类侧边栏 |
| `POST /skills` | B2 | 创建页提交 |
| `POST /skills/upload` | B2 | 上传页 |
| `GET /skills/<id>/download` | B2 | 详情页下载 |
| `POST /skills/draft` | B3 | 创建页 LLM 协助 |
| `POST /skills/smart-search` | B3 | 智能搜索 |
| `POST/DELETE /skills/<id>/like` | B3 | 详情页点赞 |
| `POST/DELETE /skills/<id>/favorite` | B3 | 详情页收藏 |
| `POST /skills/<id>/rate` | B3 | 详情页评分 |
| `GET /me/favorites` | B3 | 收藏列表 |

### 9.2 开发期 Mock

B1/B2/B3 未就绪时，F 可通过 Vite proxy + 本地 JSON mock 开发：
- `vite.config.ts` 配置 `proxy: { '/api': 'http://localhost:5000' }`
- 或使用 MSW (Mock Service Worker) 拦截请求

---

## 10. 里程碑对齐

| 阶段 | F 任务 | DoD |
|------|--------|-----|
| **S1** | React Router + Header + Sidebar + 列表页骨架（Mock API）+ 主题切换 | 骨架可浏览 |
| **S2** | 详情页 + Markdown 渲染 + 搜索(关键词) + 标签云 | 详情可查可渲染 |
| **S3** | 创建页(表单+LLM协助) + 上传页(进度条) + 互动操作 | 写入链路通 |
| **S4** | 智能搜索对接 + 错误处理完善 + E2E | 全量功能可用 |

### 关联测试用例（E2E）

| TC 范围 | 覆盖 |
|---------|------|
| E2E-主题 | 切换深/浅色 + 刷新保持 |
| E2E-列表 | 筛选 + 排序 + 分页 + URL 同步 |
| E2E-详情 | 渲染 + 互动操作 |
| E2E-创建 | 表单校验 + LLM 草稿 + 提交跳转 |
| E2E-上传 | 文件选择 + 进度 + 成功/失败 |

---

## 11. 非功能要求

| 项 | 要求 |
|----|------|
| 首屏加载 | FCP < 1.5s |
| Node | ≥ 18 |
| React | ≥ 18 |
| 浏览器 | Chrome/Firefox/Safari 最新 2 版本 |
| 可访问性 | WCAG AA 对比度 + 键盘可达 |

### npm 依赖（F 新增）

- `react-router-dom`：路由
- `marked`：Markdown 渲染
- `dompurify`：XSS 消毒
- `highlight.js`：代码高亮
