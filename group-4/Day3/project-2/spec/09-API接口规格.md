# 09 — API 接口规格

---

| 项 | 值 |
|---|---|
| 模块编号 | VO-001 |
| 模块名称 | Vibe Oracle 命运卡仪式体验 |
| 文档版本 | v0.3 |
| 阶段 | Design（API Contract） |
| Base URL | `/api/v1` |
|

---

> **本文档说明**：本文档将原“纯前端内部契约”升级为**前后端联调契约真源**。目标是把前端 `mockData.js`、`RevealPage.jsx`、`ReportPage.jsx` 中写死的数据，抽离为可实现、可测试、可并行开发的后端接口。

## 1. 设计目标

### 1.1 前端当前真实数据需求

基于 `frontend/fate-cards` 当前实现，前端最终需要以下几类真实数据：

| 数据域 | 当前前端位置 | 需要后端化的内容 |
|---|---|---|
| 卡牌主数据 | `src/data/mockData.js` | 卡牌标题、摘要、类型、阶段、稀有度、配图 |
| 骰子结果 | `mockData.js` + `DiceRitualPage.jsx` | 骰子面值、结果标签、旋转参数 |
| 三阶段揭示结果 | `RevealPage.jsx` | past/present/future 三张牌详情 |
| 最终命运报告 | `ReportPage.jsx` | 结局标题、结局解读、人格标签、状态条、引言、分享数据 |
| 图鉴与历史 | 目前未实现 | 卡牌图鉴列表、卡牌详情、用户历史抽卡记录 |

### 1.2 API 拆分原则

- 抽卡域：负责“一次命运仪式”的会话、抽取、改命、报告生成。
- 图鉴域：负责卡牌主数据查询与用户历史图鉴查询。
- 前端联调：只消费契约，不再本地拼装报告内容。

## 2. API 总览

| 域 | 方法 | 路径 | 功能 |
|---|---|---|---|
| Ritual | `POST` | `/rituals` | 初始化一次抽卡会话 |
| Ritual | `POST` | `/rituals/{ritualId}/dice-roll` | 生成或确认骰子结果 |
| Ritual | `GET` | `/rituals/{ritualId}/draw-pool` | 获取本轮可选卡池 |
| Ritual | `POST` | `/rituals/{ritualId}/reveal` | 提交三张卡并生成三阶段揭示结果 |
| Ritual | `POST` | `/rituals/{ritualId}/choice` | 提交接受命运/改命选择 |
| Ritual | `GET` | `/rituals/{ritualId}/report` | 获取最终命运报告 |
| Gallery | `GET` | `/cards` | 获取图鉴卡牌列表 |
| Gallery | `GET` | `/cards/{cardId}` | 获取单张卡详细信息 |
| Gallery | `GET` | `/history` | 获取历史抽卡记录列表 |
| Gallery | `GET` | `/history/{historyId}` | 获取单次抽卡历史详情 |

## 3. 通用约定

### 3.1 Header

| Header | 必填 | 说明 |
|---|---|---|
| `Content-Type: application/json` | 是 | JSON 请求体 |
| `X-Request-Id` | 否 | 调试追踪 |
| `X-Client-Version` | 否 | 前端版本号 |

### 3.2 通用响应包装

成功响应：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

失败响应：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "selectedCardIds must contain exactly 3 items",
  "details": {
    "field": "selectedCardIds"
  }
}
```

### 3.3 通用错误码

| code | HTTP | 说明 |
|---|---|---|
| `OK` | 200 | 成功 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 |
| `RITUAL_NOT_FOUND` | 404 | 抽卡会话不存在 |
| `CARD_NOT_FOUND` | 404 | 卡牌不存在 |
| `RITUAL_STATE_INVALID` | 409 | 当前会话状态不允许该操作 |
| `RITUAL_ALREADY_FINALIZED` | 409 | 会话已完成，不可再次改命 |
| `INTERNAL_ERROR` | 500 | 服务异常 |

## 4. 核心数据结构

### 4.1 CardSummary

```json
{
  "id": "card_001",
  "title": "咸鱼翻身失败",
  "subtitle": "翻了个身，还是咸鱼。",
  "type": "state",
  "phase": "past",
  "rarity": "common",
  "coverUrl": "/assets/cards/card-001.webp",
  "tags": ["摆烂", "沙雕"]
}
```

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | 是 | 卡牌唯一 ID |
| `title` | string | 是 | 卡牌标题 |
| `subtitle` | string | 是 | 卡牌短描述 |
| `type` | enum | 是 | `state` / `desire` / `result` |
| `phase` | enum | 是 | `past` / `present` / `future` |
| `rarity` | enum | 是 | `common` / `rare` / `legendary` |
| `coverUrl` | string | 否 | 卡面资源 |
| `tags` | string[] | 否 | 标签 |

### 4.2 CardDetail

```json
{
  "id": "card_001",
  "title": "咸鱼翻身失败",
  "subtitle": "翻了个身，还是咸鱼。",
  "description": "你以为自己正在上岸，其实只是换了一个更优雅的躺法。",
  "type": "state",
  "phase": "past",
  "rarity": "common",
  "coverUrl": "/assets/cards/card-001.webp",
  "illustrationUrl": "/assets/cards/card-001-detail.webp",
  "tags": ["摆烂", "沙雕"],
  "unlockStatus": "unlocked",
  "timesDrawn": 3,
  "lastDrawnAt": "2026-04-15T12:30:00+08:00"
}
```

### 4.3 DiceRoll

```json
{
  "face": 6,
  "label": "命运超活跃",
  "rotation": "rotateY(180deg) rotateZ(0deg)"
}
```

### 4.4 RevealedPhase

```json
{
  "phase": "past",
  "label": "过去",
  "labelEn": "PAST",
  "subLabel": "起因",
  "rarity": "common",
  "card": {
    "id": "card_001",
    "title": "咸鱼翻身失败",
    "subtitle": "翻了个身，还是咸鱼。",
    "type": "state",
    "phase": "past",
    "rarity": "common"
  }
}
```

### 4.5 ReportPayload

```json
{
  "ritualId": "ritual_20260415_xxxx",
  "fateChoice": "accept",
  "diceRoll": {
    "face": 6,
    "label": "命运超活跃",
    "rotation": "rotateY(180deg) rotateZ(0deg)"
  },
  "phases": [],
  "ending": {
    "id": "ending_epic_turn",
    "title": "命运急转弯",
    "summary": "宇宙给你准备了一个彩蛋，就在下个转角。",
    "description": "保持开放，惊喜自来。",
    "mood": "epic",
    "themeColor": "#FFD700"
  },
  "personality": {
    "id": "persona_midnight_philosopher",
    "label": "深夜哲学家",
    "description": "你在凌晨三点想通了一切，然后第二天全忘了。"
  },
  "attributes": [
    {
      "key": "luck",
      "label": "运势",
      "icon": "star",
      "value": 72,
      "color": "primary",
      "unit": "%"
    }
  ],
  "quote": {
    "text": "你的命运就像掉在沙滩上的冰淇淋，虽然可惜，但很有艺术感。",
    "highlights": [
      { "word": "冰淇淋", "color": "text-tertiary" }
    ]
  },
  "systemTerms": {
    "karmaPoints": "+1,204",
    "dimensionRank": "混沌"
  },
  "shareCard": {
    "title": "今日命运裁决",
    "subtitle": "深夜哲学家",
    "imageUrl": "/assets/share/ritual_20260415_xxxx.png"
  },
  "historyId": "history_20260415_xxxx"
}
```

## 5. Ritual 域接口

### 5.1 初始化抽卡会话

`POST /rituals`

用途：
- 前端从 LoadingPage 进入流程时创建本轮会话。
- 返回 `ritualId`、基础配置、是否启用骰子。

请求体：

```json
{
  "source": "web",
  "enableDice": true
}
```

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ritualId": "ritual_20260415_xxxx",
    "state": "initialized",
    "enableDice": true,
    "drawCount": 3
  }
}
```

### 5.2 生成骰子结果

`POST /rituals/{ritualId}/dice-roll`

用途：
- 替代前端本地随机。
- 返回用于动画展示的 label 和 rotation。

请求体：

```json
{}
```

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ritualId": "ritual_20260415_xxxx",
    "state": "dice_rolled",
    "diceRoll": {
      "face": 3,
      "label": "三重真理",
      "rotation": "rotateY(-90deg) rotateZ(0deg)"
    }
  }
}
```

### 5.3 获取本轮卡池

`GET /rituals/{ritualId}/draw-pool`

用途：
- 为 DrawCardsPage 提供 9 张可选卡。
- 保证本轮卡池和后续 reveal/report 一致。

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ritualId": "ritual_20260415_xxxx",
    "state": "drawing",
    "cards": []
  }
}
```

### 5.4 提交三张卡并生成揭示结果

`POST /rituals/{ritualId}/reveal`

请求体：

```json
{
  "selectedCardIds": ["card_001", "card_005", "card_009"]
}
```

校验规则：
- 必须恰好 3 张。
- 不允许重复。
- 所有卡必须属于当前会话卡池。

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ritualId": "ritual_20260415_xxxx",
    "state": "revealed",
    "phases": [],
    "availableChoices": ["accept", "change"]
  }
}
```

### 5.5 提交命运选择

`POST /rituals/{ritualId}/choice`

请求体：

```json
{
  "fateChoice": "change"
}
```

说明：
- `accept`：直接固化当前三张卡并生成最终报告。
- `change`：允许后端执行一次改命逻辑，典型行为为重算第三阶段或重算结局。

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "ritualId": "ritual_20260415_xxxx",
    "state": "finalized",
    "fateChoice": "change",
    "reportReady": true
  }
}
```

### 5.6 获取最终命运报告

`GET /rituals/{ritualId}/report`

用途：
- ReportPage 的唯一数据源。
- 不再由前端本地拼 `fatePhases`、`fateAttributes`、`reportQuotes`、`systemTerms`。

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

`data` 字段必须符合 `ReportPayload`。

## 6. Gallery 域接口

### 6.1 获取图鉴卡牌列表

`GET /cards`

查询参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `phase` | 否 | `past` / `present` / `future` |
| `type` | 否 | `state` / `desire` / `result` |
| `rarity` | 否 | `common` / `rare` / `legendary` |
| `keyword` | 否 | 标题或描述搜索 |
| `page` | 否 | 页码，默认 1 |
| `pageSize` | 否 | 每页数量，默认 20 |

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 9
    }
  }
}
```

`items` 中每项必须符合 `CardSummary`。

### 6.2 获取卡牌详情

`GET /cards/{cardId}`

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {}
}
```

`data` 必须符合 `CardDetail`。

### 6.3 获取历史抽卡记录列表

`GET /history`

查询参数：

| 参数 | 必填 | 说明 |
|---|---|---|
| `page` | 否 | 页码 |
| `pageSize` | 否 | 每页数量 |

响应体：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "items": [
      {
        "historyId": "history_20260415_xxxx",
        "ritualId": "ritual_20260415_xxxx",
        "createdAt": "2026-04-15T12:30:00+08:00",
        "endingTitle": "命运急转弯",
        "personalityLabel": "深夜哲学家",
        "coverCards": [
          "card_001",
          "card_005",
          "card_009"
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 1
    }
  }
}
```

### 6.4 获取单次历史详情

`GET /history/{historyId}`

说明：
- 返回结构与 `GET /rituals/{ritualId}/report` 一致。
- 用于图鉴历史详情页复用报告展示组件。

## 7. 前后端联调注意事项

### 7.1 前端需删除的本地硬编码数据

| 文件 | 本地硬编码内容 | 替换方式 |
|---|---|---|
| `src/data/mockData.js` | 卡池、阶段、骰子、属性、引言、系统术语 | 逐步替换为 API 数据 |
| `src/pages/RevealPage.jsx` | `fateCards` 常量 | 改为 `GET /rituals/{ritualId}/reveal` 返回值 |
| `src/pages/ReportPage.jsx` | 本地拼接 `displayCards/quote/attributes` | 改为 `GET /rituals/{ritualId}/report` |

### 7.2 联调阶段约束

- 字段命名统一使用 camelCase。
- 报告页一切展示性数据均以后端返回为准。
- 图鉴页与抽卡页不得共享前端硬编码卡池。
- 后端必须保证 `reveal` 与 `report` 的卡牌结果一致。

## 8. 验收标准

| 验收项 | 通过标准 |
|---|---|
| 抽卡流程 | 前端从 loading 到 report 全链路可走通，无本地 mock 参与结果生成 |
| 报告数据 | `ReportPage` 仅依赖 `/rituals/{ritualId}/report` 渲染 |
| 图鉴列表 | 可分页查询卡牌列表并查看详情 |
| 历史记录 | 每次完成抽卡后均可在 `/history` 查到 |
| 错误处理 | 参数错误、状态错误、资源不存在均有稳定错误码 |

---

| 版本 | 日期 | 说明 |
|---|---|---|
| v0.1 | 2026-04-15 | 首版 |
| v0.2 | 2026-04-15 | 纯前端内部契约版 |
| v0.3 | 2026-04-15 | 升级为后端 API 契约，拆分 Ritual / Gallery 两个域 |
