# Vibe Oracle 后端分工与联调计划

> 基于 `frontend/fate-cards` 当前代码与 `spec` 现状整理。目标是把前端 mock 数据抽离为后端契约，并拆成 3 份可并行执行的工作。

## 1. 现状结论

- 前端当前依赖 `mockData.js`、`RevealPage.jsx` 中的硬编码数据，尚未接任何真实接口。
- `spec/09-API接口规格.md` 原先仍以“纯前端内部契约”为中心，不足以支持后端并行开发。
- 图鉴在产品语义上应拆成两层：
  - 卡牌图鉴：卡牌主数据和详情查询。
  - 历史图鉴：用户完成过的抽卡记录与结果回放。

## 2. 需要抽离的数据

### 2.1 卡片主数据

- `cardId`
- `title`
- `subtitle`
- `description`
- `type`
- `phase`
- `rarity`
- `coverUrl`
- `illustrationUrl`
- `tags`

### 2.2 抽卡运行数据

- `ritualId`
- `state`
- `diceRoll`
- `selectedCardIds`
- `fateChoice`
- `revealed phases`
- `reportPayload`

### 2.3 命运报告数据

- `ending`
- `personality`
- `attributes`
- `quote`
- `systemTerms`
- `shareCard`

### 2.4 图鉴数据

- 卡牌列表
- 卡牌详情
- 历史记录列表
- 历史记录详情

## 3. 三份分工

### 3.1 后端 A：抽卡域

负责人范围：
- 负责一次命运仪式从开始到出报告的完整后端链路。

接口范围：
- `POST /api/v1/rituals`
- `POST /api/v1/rituals/{ritualId}/dice-roll`
- `GET /api/v1/rituals/{ritualId}/draw-pool`
- `POST /api/v1/rituals/{ritualId}/reveal`
- `POST /api/v1/rituals/{ritualId}/choice`
- `GET /api/v1/rituals/{ritualId}/report`

数据表范围：
- `dice_faces`
- `endings`
- `personalities`
- `report_quotes`
- `ritual_sessions`
- `ritual_reveals`

交付物：
- 可稳定返回三阶段揭示结果。
- 可稳定返回最终命运报告。
- 改命逻辑落地。
- 完成后自动写入历史记录快照。

验收标准：
- 前端不再本地计算 report。
- reveal 与 report 三张卡完全一致。
- 错误状态有明确错误码。

### 3.2 后端 B：图鉴域

负责人范围：
- 负责卡牌主数据管理和历史图鉴查询，不处理抽卡流程。

接口范围：
- `GET /api/v1/cards`
- `GET /api/v1/cards/{cardId}`
- `GET /api/v1/history`
- `GET /api/v1/history/{historyId}`

数据表范围：
- `cards`
- `history_records`

交付物：
- 卡牌图鉴列表分页、筛选、详情。
- 历史图鉴列表与详情。
- 卡牌详情可支持未来“荒诞图鉴”页面。

验收标准：
- 能按 `phase/type/rarity/keyword` 查询卡牌。
- 单次历史详情可直接复用报告页渲染。

### 3.3 前端 C：联调与去 mock

负责人范围：
- 负责前端状态流转接入新接口，逐步移除本地假数据。

改造范围：
- `LoadingPage` 对接 `POST /rituals`
- `DiceRitualPage` 对接 `POST /rituals/{ritualId}/dice-roll`
- `DrawCardsPage` / `TarotGrid` 对接 `GET /rituals/{ritualId}/draw-pool`
- `RevealPage` 对接 `POST /rituals/{ritualId}/reveal`
- `FateDialog` 对接 `POST /rituals/{ritualId}/choice`
- `ReportPage` 对接 `GET /rituals/{ritualId}/report`
- 后续图鉴页对接 `GET /cards`、`GET /history`

交付物：
- `src/data/mockData.js` 不再作为正式数据源。
- `RevealPage.jsx` 去掉本地 `fateCards`。
- `ReportPage.jsx` 改为只消费 report 接口。
- 增加 loading、error、empty 三类状态。

验收标准：
- 整个流程可在不依赖本地 mock 的情况下完整走通。
- 刷新页面后可基于 `ritualId` 恢复当前会话或给出可理解提示。

## 4. 推荐执行顺序

### Phase 0：契约冻结

- 冻结 `spec/09` 和 `spec/10`
- 统一字段命名为 camelCase
- 冻结错误码和状态机

### Phase 1：后端并行

- 后端 A 开发抽卡域
- 后端 B 开发图鉴域

依赖关系：
- 两者共享 `Card` 主数据契约
- `history_records` 的写入由后端 A 完成，查询由后端 B 暴露

### Phase 2：前端联调

- 优先接 `rituals` 主链路
- 再接 `history` / `cards` 图鉴能力

## 5. WBS

| WBS | 工作项 | 负责人 |
|---|---|---|
| WBS-01 | 冻结 API 契约和数据模型 | 全员 |
| WBS-02 | 建 `cards` / `dice_faces` / `endings` / `personalities` / `report_quotes` 表 | 后端 A / 后端 B |
| WBS-03 | 完成抽卡会话主链路接口 | 后端 A |
| WBS-04 | 完成图鉴列表与详情接口 | 后端 B |
| WBS-05 | 完成历史记录落库与查询接口 | 后端 A / 后端 B |
| WBS-06 | 前端接入 ritual 主链路 | 前端 C |
| WBS-07 | 前端去除 report/reveal mock | 前端 C |
| WBS-08 | 前端接入图鉴与历史页面 | 前端 C |
| WBS-09 | 联调回归与错误态补全 | 全员 |

## 6. 风险点

- `RevealPage` 当前并未真正使用用户选中的三张卡，需要联调时修正页面数据流。
- `ReportPage` 现在本地拼装阶段标签、属性条、引言和系统术语，改接口后容易出现字段名不一致。
- 图鉴如果同时承载“卡牌百科”和“历史记录”，前端页面信息架构要先定清，否则接口会反复调整。

## 7. 本次固化结果

- 已将后端化接口契约写入 `spec/09-API接口规格.md`
- 已将后端化数据模型写入 `spec/10-数据模型与存储规格.md`
- 本文件 `plan.md` 作为分工与执行计划
