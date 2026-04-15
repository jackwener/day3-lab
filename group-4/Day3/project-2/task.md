# Vibe Oracle 后端分工任务书

> 基于 frontend/fate-cards 代码 + spec 文档梳理，将前端 mock 数据抽离为后端接口

---

## 0. 前端 Mock 数据现状盘点

当前前端所有数据均硬编码在以下位置，需要全部由后端接口提供：

| 数据 | 前端位置 | 说明 |
|------|----------|------|
| `tarotCardPool` (9张卡) | `data/mockData.js` | 卡牌 id/name/description |
| `fatePhases` (3阶段) | `data/mockData.js` | past/present/future 配置 |
| `diceResults` (6面) | `data/mockData.js` + `DiceRitualPage.jsx` | 骰子结果标签（两处重复定义） |
| `fateAttributes` (3属性) | `data/mockData.js` | 运势/发疯值/行动力，当前写死 |
| `reportQuotes` (引言) | `data/mockData.js` | 报告页引言文案，写死1条 |
| `systemTerms` | `data/mockData.js` | 业力积分 +1,204 / 次元等级 混沌 |
| `fateCards` (揭示卡) | `RevealPage.jsx` L10-29 | 写死3张卡，未关联用户选择 |
| 结局文案 | 无 | spec 要求但前端尚未实现 |
| 人格标签 | 无 | spec 要求但前端尚未实现 |
| 历史图鉴 | 无 | spec 要求 localStorage，改为后端 |

---

## 1. 后端技术约定

| 项 | 选型 |
|----|------|
| 框架 | Python FastAPI / Node Express（组内协商） |
| 数据库 | SQLite（轻量，单文件部署） |
| API 风格 | RESTful JSON |
| Base URL | `http://localhost:8000/api/v1` |

---

## 后端 A：抽卡模块（核心玩法）

> 负责人：___________

### A-1. 卡牌池接口

**GET** `/api/v1/cards`

返回所有可抽取卡牌，供前端渲染 9 宫格祭坛。

**Response:**

```json
{
  "cards": [
    {
      "id": 1,
      "name": "咸鱼翻身失败",
      "description": "翻了个身，还是咸鱼。",
      "type": "state",
      "image": "/images/card-1.webp",
      "weight": 50
    }
  ],
  "total": 9
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | ✅ | 卡牌唯一ID |
| name | string | ✅ | 卡牌标题（2-20字符） |
| description | string | ✅ | 卡牌描述（5-200字符） |
| type | enum | ✅ | `state` / `desire` / `result` |
| image | string | ❌ | 卡面插图 URL |
| weight | int | ❌ | 抽取权重 0-100，默认50 |

**任务清单：**

- [ ] 设计 `cards` 表结构并建表
- [ ] 录入至少 9 张卡（state×3, desire×3, result×3）
- [ ] 实现 GET `/api/v1/cards` 返回全部卡牌

---

### A-2. 骰子配置接口

**GET** `/api/v1/dice`

返回骰子 6 面的标签配置。

**Response:**

```json
{
  "faces": [
    { "face": 1, "label": "命定之虚无" },
    { "face": 2, "label": "二元对立" },
    { "face": 3, "label": "三重真理" },
    { "face": 4, "label": "四大基本力" },
    { "face": 5, "label": "五维震荡" },
    { "face": 6, "label": "命运超活跃" }
  ]
}
```

**任务清单：**

- [ ] 建 `dice_faces` 配置表或直接 JSON 配置文件
- [ ] 实现 GET `/api/v1/dice`

---

### A-3. 抽卡（核心接口）

**POST** `/api/v1/draw`

用户提交选择的 3 张卡 index + 骰子结果，后端计算完整命运结果。

**Request:**

```json
{
  "selected_card_ids": [1, 5, 9],
  "dice_face": 3,
  "fate_choice": "accept"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| selected_card_ids | int[] | ✅ | 用户选择的 3 张卡 ID |
| dice_face | int | ❌ | 骰子点数 1-6，可为空（跳过骰子） |
| fate_choice | enum | ✅ | `accept`（接受命运） / `change`（改命） |

**Response:**

```json
{
  "draw_id": "uuid-xxxx",
  "timestamp": 1744700000,
  "phases": [
    {
      "phase": "past",
      "label": "过去",
      "label_en": "PAST",
      "sub_label": "起因",
      "rarity": "普通",
      "card": {
        "id": 1,
        "name": "咸鱼翻身失败",
        "description": "翻了个身，还是咸鱼。",
        "type": "state",
        "image": "/images/card-1.webp"
      }
    },
    {
      "phase": "present",
      "label": "现在",
      "label_en": "PRESENT",
      "sub_label": "纠缠",
      "rarity": "稀有",
      "card": { "id": 5, "name": "...", "description": "...", "type": "desire", "image": "..." }
    },
    {
      "phase": "future",
      "label": "未来",
      "label_en": "FUTURE",
      "sub_label": "劫数",
      "rarity": "传说",
      "card": { "id": 9, "name": "...", "description": "...", "type": "result", "image": "..." }
    }
  ],
  "ending": {
    "title": "命运急转弯",
    "description": "宇宙给你准备了一个彩蛋，就在下个转角。保持开放，惊喜自来。",
    "mood": "epic",
    "theme_color": "#FFD700"
  },
  "personality": {
    "label": "深夜哲学家",
    "description": "你在凌晨三点想通了一切，然后第二天全忘了。"
  },
  "attributes": [
    { "key": "luck", "label": "运势", "icon": "star", "value": 72, "color": "primary", "unit": "%" },
    { "key": "madness", "label": "发疯值", "icon": "psychology", "value": 85, "color": "tertiary", "unit": "%" },
    { "key": "action", "label": "行动力", "icon": "bolt", "value": 34, "color": "secondary", "unit": "%" },
    { "key": "anti_anxiety", "label": "反内耗指数", "icon": "self_improvement", "value": 60, "color": "primary", "unit": "%" },
    { "key": "mystery", "label": "神秘值", "icon": "visibility", "value": 88, "color": "tertiary", "unit": "%" }
  ],
  "quote": {
    "text": "你的命运就像掉在沙滩上的冰淇淋，虽然可惜，但很有艺术感。",
    "highlights": [
      { "word": "冰淇淋", "color": "text-tertiary" },
      { "word": "艺术感", "color": "text-secondary italic underline" }
    ]
  },
  "karma_points": "+1,204",
  "dimension_rank": "混沌"
}
```

**任务清单：**

- [ ] 设计 `endings` 表（id, combination, title, description, mood, theme_color）
- [ ] 录入至少 5 种结局组合 + 1 个 fallback
- [ ] 设计 `personalities` 表（id, label, description, match_rule）
- [ ] 录入至少 5 种人格标签
- [ ] 设计 `quotes` 表（id, text, highlights JSON）
- [ ] 录入至少 5 条报告引言
- [ ] 实现结局计算算法 `resolveEnding(card1, card2, card3)`
- [ ] 实现人格计算算法 `resolvePersonality(card1, card2, card3)`
- [ ] 实现属性值计算算法（运势/发疯值/行动力/反内耗/神秘值，含随机区间）
- [ ] 实现改命逻辑：`fate_choice=change` 时重新随机第3张卡的结局
- [ ] 实现 POST `/api/v1/draw`，返回完整命运报告
- [ ] 每次抽卡结果自动写入 `history` 表（供图鉴模块使用）

---

### A-4. 改命接口（可选，也可合并到 A-3）

**POST** `/api/v1/draw/{draw_id}/change-fate`

对已有抽卡结果执行改命操作，重算结局。

**Response:** 同 A-3 Response 格式

**任务清单：**

- [ ] 实现根据 draw_id 查询原始卡牌组合
- [ ] 重新计算结局/属性/引言
- [ ] 更新 history 表中对应记录 `is_changed_fate = true`

---

## 后端 B：图鉴模块（历史记录）

> 负责人：___________

### B-1. 保存抽卡记录

> 由抽卡接口 A-3 自动触发写入，B 模块负责表设计和查询

**`history` 表结构：**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| timestamp | bigint | 抽卡时间戳 |
| card_ids | JSON | 选中的3张卡ID `[1, 5, 9]` |
| dice_face | int | 骰子点数，可为 null |
| fate_choice | varchar | `accept` / `change` |
| ending_title | varchar | 结局标题 |
| ending_description | text | 结局描述 |
| ending_mood | varchar | 情绪基调 |
| ending_theme_color | varchar | 主题色 |
| personality_label | varchar | 人格标签 |
| personality_description | text | 人格描述 |
| attributes | JSON | 5维属性值快照 |
| quote_text | text | 引言文案 |
| is_changed_fate | boolean | 是否改过命 |
| karma_points | varchar | 业力积分 |
| dimension_rank | varchar | 次元等级 |

**任务清单：**

- [ ] 设计并建 `history` 表
- [ ] 提供写入方法供 A-3 调用

---

### B-2. 图鉴列表接口

**GET** `/api/v1/album`

返回历史抽卡记录列表（摘要），用于图鉴网格展示。

**Query Params:**

| 参数 | 类型 | 默认 | 说明 |
|------|------|------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页条数，最大 50 |

**Response:**

```json
{
  "total": 5,
  "page": 1,
  "page_size": 20,
  "records": [
    {
      "id": "uuid-xxxx",
      "timestamp": 1744700000,
      "cards_summary": [
        { "id": 1, "name": "咸鱼翻身失败", "type": "state" },
        { "id": 5, "name": "凌晨三点的猫头鹰", "type": "desire" },
        { "id": 9, "name": "反向锦鲤", "type": "result" }
      ],
      "ending_title": "命运急转弯",
      "ending_mood": "epic",
      "personality_label": "深夜哲学家",
      "is_changed_fate": false
    }
  ]
}
```

**任务清单：**

- [ ] 实现 GET `/api/v1/album`，支持分页
- [ ] 按时间倒序排列
- [ ] 返回摘要信息（卡牌名称 + 结局标题 + 人格标签）

---

### B-3. 图鉴详情接口

**GET** `/api/v1/album/{record_id}`

返回单条历史记录的完整详情（和抽卡结果格式一致）。

**Response:** 同 A-3 `/draw` 的 Response 格式

**任务清单：**

- [ ] 实现 GET `/api/v1/album/{record_id}`
- [ ] 关联 `cards` 表补全卡牌完整信息
- [ ] 404 处理

---

### B-4. 删除图鉴记录

**DELETE** `/api/v1/album/{record_id}`

删除单条历史记录。

**Response:**

```json
{ "success": true, "deleted_id": "uuid-xxxx" }
```

**任务清单：**

- [ ] 实现 DELETE `/api/v1/album/{record_id}`
- [ ] 404 处理

---

### B-5. 清空图鉴

**DELETE** `/api/v1/album`

清空所有历史记录。

**Response:**

```json
{ "success": true, "deleted_count": 5 }
```

**任务清单：**

- [ ] 实现 DELETE `/api/v1/album`（无参数 = 全部清空）
- [ ] 确认提示（前端负责，后端直接执行）

---

### B-6. 图鉴统计接口（加分项）

**GET** `/api/v1/album/stats`

返回图鉴统计信息，用于展示在图鉴页头部。

**Response:**

```json
{
  "total_draws": 12,
  "unique_cards_collected": 7,
  "total_cards": 9,
  "most_drawn_card": { "id": 1, "name": "咸鱼翻身失败", "count": 5 },
  "fate_change_rate": "33%",
  "mood_distribution": {
    "epic": 3,
    "chill": 2,
    "chaos": 4,
    "mystic": 2,
    "absurd": 1
  }
}
```

**任务清单：**

- [ ] 实现 GET `/api/v1/album/stats`
- [ ] 统计：总抽卡次数、已收集卡牌数、最常抽到的卡、改命率、情绪分布

---

## 后端 C：前端接入改造

> 负责人：___________

### C-1. API 服务层封装

在前端项目中新建 `src/api/` 目录，封装所有后端调用。

**文件结构：**

```
src/api/
├── client.js          # axios/fetch 封装，baseURL、错误处理
├── cardApi.js         # 卡牌相关：getCards(), getDice()
├── drawApi.js         # 抽卡相关：submitDraw(), changeFate()
└── albumApi.js        # 图鉴相关：getAlbum(), getDetail(), delete(), clear(), getStats()
```

**任务清单：**

- [ ] 安装 axios（或用 fetch 封装）
- [ ] 实现 `client.js`：baseURL 配置、请求/响应拦截、错误统一处理
- [ ] 实现 `cardApi.js`：`getCards()`, `getDiceFaces()`
- [ ] 实现 `drawApi.js`：`submitDraw(payload)`, `changeFate(drawId)`
- [ ] 实现 `albumApi.js`：`getAlbumList(page)`, `getAlbumDetail(id)`, `deleteRecord(id)`, `clearAlbum()`, `getAlbumStats()`

---

### C-2. 替换 mockData.js

把 `data/mockData.js` 的静态数据改为从 API 获取。

| 原数据 | 替换为 | 调用时机 |
|--------|--------|----------|
| `tarotCardPool` | `GET /api/v1/cards` | App 初始化时加载 |
| `diceResults` | `GET /api/v1/dice` | DiceRitualPage 挂载时 |
| `fatePhases` | 后端 draw 响应中的 `phases` | 抽卡完成时 |
| `fateAttributes` | 后端 draw 响应中的 `attributes` | 抽卡完成时 |
| `reportQuotes` | 后端 draw 响应中的 `quote` | 抽卡完成时 |
| `systemTerms` | 后端 draw 响应中的 `karma_points` / `dimension_rank` | 抽卡完成时 |

**任务清单：**

- [ ] `DrawCardsPage.jsx`：改用 API 获取的卡牌池渲染 TarotGrid
- [ ] `DiceRitualPage.jsx`：骰子标签改用 API 数据（删除 L9-16 硬编码）
- [ ] `RevealPage.jsx`：删除 L10-29 硬编码 `fateCards`，改用抽卡结果
- [ ] `ReportPage.jsx`：所有数据改从 draw 接口响应读取
- [ ] 修改 `useRitualState.js`：新增 `drawResult` state 存储后端响应
- [ ] 在 `goToNextState` 的 DRAW→REVEAL 转换时调用 `POST /api/v1/draw`

---

### C-3. 新增图鉴页面

前端新增图鉴入口和页面。

**任务清单：**

- [ ] 新建 `pages/AlbumPage.jsx`：图鉴列表页（网格布局）
- [ ] 新建 `pages/AlbumDetailPage.jsx`：图鉴详情页（复用 ReportPage 布局）
- [ ] 在 `SideNavBar` 和 `BottomNavBar` 中增加图鉴导航入口
- [ ] 实现图鉴列表：调用 `GET /api/v1/album`，展示卡牌缩略图 + 时间 + 标签
- [ ] 实现图鉴详情：调用 `GET /api/v1/album/{id}`，展示完整报告
- [ ] 实现删除功能：调用 `DELETE /api/v1/album/{id}`
- [ ] 实现清空功能：调用 `DELETE /api/v1/album`

---

### C-4. 加载状态与错误处理

**任务清单：**

- [ ] 各 API 调用增加 loading 状态（骨架屏 / spinner）
- [ ] 网络错误统一 toast 提示
- [ ] 后端未启动时 fallback 到本地 mockData（降级兼容）

---

## 接口总览

| # | Method | Path | 模块 | 说明 |
|---|--------|------|------|------|
| 1 | GET | `/api/v1/cards` | A | 获取卡牌池 |
| 2 | GET | `/api/v1/dice` | A | 获取骰子配置 |
| 3 | POST | `/api/v1/draw` | A | 提交抽卡，返回完整命运报告 |
| 4 | POST | `/api/v1/draw/{id}/change-fate` | A | 改命 |
| 5 | GET | `/api/v1/album` | B | 图鉴列表 |
| 6 | GET | `/api/v1/album/stats` | B | 图鉴统计 |
| 7 | GET | `/api/v1/album/{id}` | B | 图鉴详情 |
| 8 | DELETE | `/api/v1/album/{id}` | B | 删除记录 |
| 9 | DELETE | `/api/v1/album` | B | 清空图鉴 |

---

## 数据库 ER 关系

```
┌──────────┐    N:1    ┌──────────┐
│  cards   │◄──────────│ history  │ (card_ids JSON 关联)
└──────────┘           └──────────┘
                            │ 1:1
┌──────────┐           ┌──────────┐
│ endings  │           │ quotes   │
└──────────┘           └──────────┘

┌──────────────┐
│ personalities│
└──────────────┘

┌──────────────┐
│ dice_faces   │ (配置表 / JSON)
└──────────────┘
```

---

## 里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| M1 | Day 1 | A：cards/dice 接口可用 + 数据录入完成 |
| M2 | Day 1 | B：history 表建好 + album 列表/详情接口可用 |
| M3 | Day 2 | A：draw 核心接口完成（结局/人格/属性计算） |
| M4 | Day 2 | C：前端 API 层封装 + mockData 替换完成 |
| M5 | Day 3 | C：图鉴页面完成 + 全链路联调 |
| M6 | Day 3 | 全员：联调测试 + Bug 修复 |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-15 | 首版，基于前端代码 + spec 梳理 |
