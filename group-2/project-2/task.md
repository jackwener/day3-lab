# 基金管家（FundHub）— 4 人并行开发任务书

> **基于 Spec 文档 01~14 生成 | 当前阶段：S1 前端原型（Mock 数据）**

---

## 任务分工总览

| 开发者 | 负责模块 | 覆盖 US | 关键产出文件 |
|--------|----------|---------|-------------|
| **A — 脚手架 + 全局布局** | 项目初始化、AppLayout、路由、公共类型/工具、Mock 数据层 | US-008 | `App.tsx`, `AppLayout.tsx`, `types/`, `mock/` |
| **B — 基金诊断页** | DiagnosisPage（搜索 + 评级 + 收益持仓 + 资讯） | US-001, US-002, US-003 | `DiagnosisPage.tsx` |
| **C — 行情 + 视点页** | MarketPage + InsightsPage | US-004, US-005 | `MarketPage.tsx`, `InsightsPage.tsx` |
| **D — 自选 + 问答组件** | WatchlistPage + FundChatBot | US-006, US-007 | `WatchlistPage.tsx`, `FundChatBot.tsx` |

---

## 开发者 A — 脚手架 + 全局布局 + 公共层

> **产出目标**：其他 3 人 `git pull` 后可直接在 `pages/` 下开发页面

### Task A-1：项目初始化与依赖安装
- [ ] 确认 Vite + React 19 + TypeScript 脚手架已就绪
- [ ] 安装核心依赖：`antd@6` `react-router-dom@7` `@ant-design/icons`
- [ ] 配置 `vite.config.ts`：proxy `/api` → `http://localhost:3000`
- [ ] 配置 `ConfigProvider` 中文语言包 `zhCN`
- **DoD**：`pnpm dev` 启动无报错，浏览器显示空白页

### Task A-2：公共类型定义（types/index.ts）
- [ ] 定义 `Fund` 类型（对齐 Spec-10 §3，含 scores 对象）
- [ ] 定义 `FundReturns` 类型（对齐 Spec-10 §4）
- [ ] 定义 `FundHolding` 类型（对齐 Spec-10 §5）
- [ ] 定义 `HoldingNews` 类型（对齐 Spec-10 §6）
- [ ] 定义 `MarketIndex` 类型（对齐 Spec-10 §11）
- [ ] 定义 `Article` 类型（对齐 Spec-10 §10）
- [ ] 定义 `WatchlistItem` 类型（对齐 Spec-10 §9，扩展 nav/day_change 等运行时字段）
- [ ] 定义 `ChatMessage` 类型（对齐 Spec-10 §8）
- [ ] 定义统一响应类型 `ApiResponse<T>`（对齐 Spec-09 §2）
- **DoD**：所有类型导出，其他页面可直接 `import { Fund } from '../types'`

### Task A-3：Mock 数据层（mock/）
- [ ] `mock/funds.ts` — 至少 3 只基金的完整诊断数据（含 scores、returns、holdings）
- [ ] `mock/news.ts` — 持仓股资讯 Mock（6+ 条，覆盖 positive/negative/neutral）
- [ ] `mock/market.ts` — 4 个大盘指数 + 20 只基金列表数据
- [ ] `mock/articles.ts` — 10+ 篇文章（覆盖 4 个分类）+ hot_articles + hot_tags
- [ ] `mock/watchlist.ts` — 3 只自选基金 + summary 汇总数据
- [ ] `mock/chat.ts` — 预设问答对（5+ 组）+ 快捷提问列表
- **DoD**：所有 Mock 数据字段完整对齐 Spec-09 响应格式，其他开发者可直接 import 使用

### Task A-4：公共 API 服务层（services/api.ts）
- [ ] 封装统一请求函数 `request<T>(url, options)` → 解析 `ApiResponse<T>`
- [ ] P0 阶段：函数内直接返回 Mock 数据（后续替换为 fetch 调用）
- [ ] 导出各 API 函数：
  - `getFundDiagnosis(fundCode)` → Spec-09 §3
  - `getFundReturns(fundCode)` → Spec-09 §4
  - `getFundHoldingsNews(fundCode)` → Spec-09 §5
  - `getMarketIndices()` → Spec-09 §6
  - `getMarketFunds(params)` → Spec-09 §7
  - `getInsightArticles(params)` → Spec-09 §8
  - `postChatAsk(body)` → Spec-09 §9
  - `getWatchlist()` → Spec-09 §10
  - `addWatchlist(body)` → Spec-09 §11
  - `deleteWatchlist(fundCode)` → Spec-09 §12
- **DoD**：页面组件调用 `api.getFundDiagnosis('005827')` 即可拿到 Mock 数据

### Task A-5：全局布局组件（AppLayout.tsx）— 对齐 US-008
- [ ] `Layout` + `Sider` + `Header` + `Content` 结构（对齐 Spec-06 §1 布局图）
- [ ] 侧边栏菜单 4 项：基金诊断(`/diagnosis`)、基金行情(`/market`)、基金视点(`/insights`)、我的自选(`/watchlist`)
- [ ] Logo + "基金管家" 文字，折叠时仅显示图标（对齐 AC-008-01）
- [ ] `collapsed` 状态切换，宽度 200px ↔ 80px（对齐 AC-008-03）
- [ ] 当前页面菜单高亮 `selectedKeys`（对齐 AC-008-02）
- [ ] 顶部栏：折叠触发器 + 通知铃铛 `Badge` + 用户头像（对齐 AC-008-04）
- **DoD**：侧边栏导航点击可切换页面，折叠/展开正常，高亮正确

### Task A-6：路由配置（App.tsx）
- [ ] `BrowserRouter` + `Routes` 配置
- [ ] `/` → 重定向到 `/diagnosis`（对齐 AC-008-05）
- [ ] `/diagnosis` → `DiagnosisPage`
- [ ] `/market` → `MarketPage`
- [ ] `/insights` → `InsightsPage`
- [ ] `/watchlist` → `WatchlistPage`
- [ ] 所有页面包裹在 `AppLayout` 内
- **DoD**：浏览器地址栏输入各路由均正确渲染对应页面（暂可为占位符）

### Task A-7：公共工具函数（utils/）
- [ ] `formatPercent(value)` — 百分比格式化（+号、颜色标识）
- [ ] `getChangeColor(value)` — 涨红跌绿零灰
- [ ] `formatCurrency(value)` — 金额格式化（万/亿）
- [ ] `formatDate(isoString)` — ISO-8601 → 友好日期
- **DoD**：导出工具函数，各页面可复用

---

## 开发者 B — 基金诊断页（DiagnosisPage）

> **产出目标**：完整可交互的基金诊断页面，覆盖 US-001 / US-002 / US-003

### Task B-1：搜索区域 — 对齐 Spec-06 §3.1
- [ ] 渐变蓝色背景区，居中标题"基金智能诊断"
- [ ] `Input.Search` 搜索框，placeholder "输入基金代码或名称"
- [ ] 6 个热门基金标签（如"易方达蓝筹 005827"），点击自动填入代码
- [ ] 点击搜索 / 点击标签 → 调用 `api.getFundDiagnosis(code)` 获取结果
- [ ] 搜索中显示 `Spin` 加载态
- **DoD**：输入基金代码搜索后展示结果区域；点击热门标签快捷搜索（对齐 AC-001-05）

### Task B-2：综合评级区域 — 对齐 US-001 + Spec-06 §3.2
- [ ] 基金信息头：名称、代码、类型 Tag、基金经理、公司、规模（对齐 AC-001-01）
- [ ] 综合评级：`Rate` 组件 1-5 星 + `Tag` 评级标签（优秀/良好/一般）（对齐 AC-001-02）
- [ ] 最新净值 + 日涨跌幅（红涨绿跌颜色）（对齐 AC-001-04）
- [ ] 5 维评分仪表盘：5 个 `Progress type="circle"` — 收益/风控/稳定性/择时/选股，0-100 分（对齐 AC-001-03）
- **DoD**：诊断结果展示基金基本信息 + 星级评级 + 5 维评分圆环

### Task B-3：诊断详情 Tab — 对齐 US-002 + Spec-06 §3.3
- [ ] `Tabs` 组件，3 个 Tab 页签
- [ ] **历史收益 Tab**：6 个时段收益率卡片（近1月/3月/6月/1年/3年/成立以来），正值红"+"，负值绿色（对齐 AC-002-01, AC-002-02）
- [ ] **前十大持仓 Tab**：`Table` 展示股票名称、代码、行业 `Tag`、占比 `Progress` 进度条（对齐 AC-002-03）
- [ ] **投资建议 Tab**：`Alert` 诊断结论 + 建议列表（带序号图标）（对齐 AC-002-04）
- [ ] 搜索触发时同步调用 `api.getFundReturns(code)` 获取数据
- **DoD**：Tab 切换正常，3 个面板数据完整展示

### Task B-4：持仓股资讯区域 — 对齐 US-003 + Spec-06 §3.4
- [ ] 区域标题："持仓股近期资讯" + `NotificationOutlined` 图标
- [ ] `Row` + `Col span={12}` 双列卡片布局（对齐 AC-003-01）
- [ ] 每张卡片：情感 `Tag`（利好/利空/中性）+ 股票名称代码 + 标题 + 来源 + 时间（对齐 AC-003-02）
- [ ] 情感配色（对齐 AC-003-03）：
  - 利好(positive)：红色左边框 + 浅红背景
  - 利空(negative)：绿色左边框 + 浅绿背景
  - 中性(neutral)：灰色左边框 + 浅灰背景
- [ ] 按 `published_at` 倒序排列（对齐 AC-003-04）
- [ ] 搜索触发时同步调用 `api.getFundHoldingsNews(code)` 获取数据
- **DoD**：资讯卡片颜色区分正确，排序正确

---

## 开发者 C — 基金行情页 + 基金视点页

> **产出目标**：完整可交互的行情页和视点页，覆盖 US-004 / US-005

### Task C-1：大盘指数区域 — 对齐 US-004 + Spec-06 §4.1
- [ ] 4 个 `Card` 指数卡片：上证指数、深证成指、创业板指、沪深300（对齐 AC-004-01）
- [ ] 卡片内容：指数值 + 涨跌幅(%) + 成交量
- [ ] 顶部色条：涨红跌绿，3px 圆角顶部边框（对齐 AC-004-02）
- [ ] 页面加载时调用 `api.getMarketIndices()`
- **DoD**：4 个指数卡片展示正确，颜色反映涨跌

### Task C-2：基金列表区域 — 对齐 US-004 + Spec-06 §4.2
- [ ] `Segmented` 类型筛选：全部/混合型/指数型（对齐 AC-004-04）
- [ ] `Input.Search` 关键词搜索（按名称或代码过滤）（对齐 AC-004-05）
- [ ] `Table` 列：名称、代码、类型、净值、日涨跌、近1周、近1月、近1年、规模、风险等级（对齐 AC-004-03）
- [ ] 涨跌列支持排序 `sorter`（日涨跌/近1周/近1月/近1年）（对齐 AC-004-06）
- [ ] 涨跌配色：正红、负绿、零灰
- [ ] 星标收藏图标，点击切换收藏/取消状态（对齐 AC-004-07）
- [ ] 调用 `api.getMarketFunds(params)` 并支持前端筛选/排序
- **DoD**：列表展示完整，筛选/搜索/排序均可用

### Task C-3：基金视点 — 头条 + 分类搜索 — 对齐 US-005 + Spec-06 §5.1
- [ ] 头条大图卡片：封面图 + 标题 + 摘要 + 来源 + 阅读量（对齐 AC-005-01）
- [ ] 分类 Tag 条：全部/市场展望/行业动态/投资策略/产品分析，点击筛选（对齐 AC-005-02）
- [ ] `Input.Search` 关键词搜索（标题/摘要/标签匹配）（对齐 AC-005-03）
- [ ] 调用 `api.getInsightArticles(params)`
- **DoD**：头条文章突出展示，分类/搜索联动过滤

### Task C-4：基金视点 — 文章列表 + 侧边栏 — 对齐 US-005 + Spec-06 §5.2/5.3
- [ ] 文章卡片列表：分类 Tag + 标题 + 摘要 + 作者头像+名称 + 时间 + 阅读量（对齐 AC-005-04）
- [ ] 点赞功能：`HeartOutlined` / `HeartFilled` 切换，计数实时更新（对齐 AC-005-05）
- [ ] 右侧栏 — 热门排行：前 5 篇按阅读量排序，序号色标（金银铜）（对齐 AC-005-06）
- [ ] 右侧栏 — 标签云：热门标签列表，点击触发搜索（对齐 AC-005-07）
- [ ] 布局：`Row` + `Col span={16}` 文章列表 + `Col span={8}` 右侧栏
- **DoD**：文章展示完整，点赞可切换，热门排行和标签云可交互

---

## 开发者 D — 自选基金页 + 基金问答组件

> **产出目标**：完整可交互的自选页面和全局悬浮问答组件，覆盖 US-006 / US-007

### Task D-1：持仓汇总区域 — 对齐 US-007 + Spec-06 §6.1
- [ ] 蓝色渐变背景区
- [ ] 4 个统计卡片：总市值、总投入成本、持仓总收益（正红负绿）、总收益率（对齐 AC-007-01）
- [ ] 调用 `api.getWatchlist()` 获取 summary 数据
- **DoD**：汇总数据展示正确，收益颜色标识正确

### Task D-2：自选基金列表 — 对齐 US-007 + Spec-06 §6.2
- [ ] `Table` 列：星标、名称代码、类型、净值、日/周/月涨跌、持有收益、添加日期（对齐 AC-007-02）
- [ ] 涨跌配色：正红、负绿、零灰
- [ ] 空状态：`Empty` 组件 + "添加您关注的基金" 提示 + 快捷添加按钮（对齐 AC-007-06）
- **DoD**：自选列表展示完整，空状态友好

### Task D-3：添加/删除自选 — 对齐 US-007 + Spec-06 §6.2
- [ ] "添加自选" 按钮 → `Modal` 弹窗（对齐 AC-007-03）
- [ ] Modal 内搜索基金名称/代码，点击"添加"调用 `api.addWatchlist(body)`
- [ ] 重复添加检测：`message.warning("该基金已在自选列表中")`（对齐 AC-007-04，Spec-09 409 DUPLICATE_WATCHLIST）
- [ ] 删除按钮 → `Modal.confirm` 确认 → 调用 `api.deleteWatchlist(fundCode)`（对齐 AC-007-05）
- [ ] 添加/删除后刷新列表
- **DoD**：增删操作闭环，重复/确认交互正确

### Task D-4：悬浮按钮 — 对齐 US-006 + Spec-06 §7
- [ ] 右下角 fixed 定位，蓝色圆形 56px（对齐 AC-006-01）
- [ ] `MessageOutlined` 图标 + "问一问" 文字
- [ ] 点击展开聊天窗口 400×560px（对齐 AC-006-02）
- [ ] 右上角 × 按钮关闭，恢复悬浮按钮（对齐 AC-006-05）
- [ ] `chatOpen` 状态控制展开/收起
- **DoD**：悬浮按钮定位正确，展开/关闭动画流畅

### Task D-5：聊天窗口交互 — 对齐 US-006 + Spec-06 §7
- [ ] 欢迎语："你好！我是基金智投助手..." + 快捷提问标签（对齐 AC-006-02）
- [ ] 点击快捷标签或手动输入 → 用户消息蓝色气泡右对齐（对齐 AC-006-03）
- [ ] 调用 `api.postChatAsk({ query, session_id })` 发送请求
- [ ] AI 回复：0.8-2s 延迟，"思考中..." 加载态 → 白色气泡左对齐（对齐 AC-006-04）
- [ ] 发送按钮：输入为空或 AI 回复中时 `disabled`（对齐 AC-006-06）
- [ ] 新消息自动滚动到底部 `scrollIntoView`（对齐 AC-006-07）
- [ ] `messages` 数组管理消息记录，`loading` 控制加载态
- **DoD**：完整的聊天交互闭环，消息收发正常，UX 细节到位

---

## 并行开发约定

### 文件目录结构（对齐 Spec-08 §3.1）

```
frontend/src/
├── App.tsx                        ← A 负责
├── main.tsx                       ← A 负责
├── types/
│   └── index.ts                   ← A 负责
├── mock/
│   ├── funds.ts                   ← A 负责
│   ├── news.ts                    ← A 负责
│   ├── market.ts                  ← A 负责
│   ├── articles.ts                ← A 负责
│   ├── watchlist.ts               ← A 负责
│   └── chat.ts                    ← A 负责
├── services/
│   └── api.ts                     ← A 负责
├── utils/
│   └── index.ts                   ← A 负责
├── components/
│   ├── AppLayout.tsx              ← A 负责
│   └── FundChatBot.tsx            ← D 负责
├── pages/
│   ├── DiagnosisPage.tsx          ← B 负责
│   ├── MarketPage.tsx             ← C 负责
│   ├── InsightsPage.tsx           ← C 负责
│   └── WatchlistPage.tsx          ← D 负责
└── vite-env.d.ts
```

### 接口约定

1. **A 先行**：A 完成 Task A-1 ~ A-4 后，B/C/D 方可启动页面开发
2. **类型共享**：所有页面组件从 `types/index.ts` 导入类型，不要自行定义
3. **Mock 数据**：所有页面通过 `services/api.ts` 获取数据，不直接 import mock
4. **样式规范**：统一使用 Ant Design Token，涨红(`#cf1322`)跌绿(`#3f8600`)零灰(`#999`)
5. **Git 分支**：各自在 `feature/A-layout`、`feature/B-diagnosis`、`feature/C-market`、`feature/D-watchlist` 分支开发，完成后合并

### 验收标准速查

| 开发者 | 对标 AC | 自测要点 |
|--------|---------|----------|
| A | AC-008-01~05 | 侧边栏折叠、菜单高亮、路由跳转、通知铃铛 |
| B | AC-001-01~05, AC-002-01~04, AC-003-01~04 | 搜索→评级→Tab→资讯全流程 |
| C | AC-004-01~07, AC-005-01~07 | 指数卡片→列表筛排→文章点赞→标签云 |
| D | AC-006-01~07, AC-007-01~06 | 自选增删→汇总→悬浮问答全流程 |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2025-04-15 | 首版，基于 Spec 01~14 生成 S1 前端原型阶段任务 |
