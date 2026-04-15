# 01 — Spec 写作总则 & 文档编号索引

---

| 项 | 值 |
|---|---|
| 模块编号 | M-FundHub |
| 模块名称 | 基金管家（FundHub） |
| 文档版本 | v0.1 |
| 文档状态 | Draft |

---

## 一、编号与阶段对照（01 ~ 14）

| 编号 | 阶段 | 分类 | 文档名称 | 状态 |
|------|------|------|----------|------|
| `01` | Meta | 总则 | Spec 写作总则与文档编号索引 | ✅ 已完成 |
| `02` | Meta | Elicitation | 需求来源与采集记录 | ✅ 已完成 |
| `03` | Proposal | Proposal | 立项提案与范围说明 | ✅ 已完成 |
| `04` | Proposal | PRD | 产品需求说明 | ✅ 已完成 |
| `05` | Spec | UserStory | 用户故事与验收标准 | ✅ 已完成 |
| `06` | Spec | FSD | 功能规格说明 | ✅ 已完成 |
| `07` | Spec | NFR | 非功能需求与约束 | ✅ 已完成 |
| `08` | Design | Architecture | 系统架构与技术选型 | ✅ 已完成 |
| `09` | Design | API | 接口规格（契约真源） | ✅ 已完成 |
| `10` | Design | Data | 数据模型与存储规格 | ✅ 已完成 |
| `11` | Design | Security | 安全设计规格 | ✅ 已完成 |
| `12` | Plan | Plan | 实施计划与里程碑 | ✅ 已完成 |
| `13` | Test | Test | 测试策略与质量门禁 | ✅ 已完成 |
| `14` | Trace | Traceability | 需求追踪矩阵（四向对齐） | ✅ 已完成 |

## 二、基本原则

1. **单一真相**：对外行为以 `09` API 与 `10` 数据模型为准
2. **先行为后实现**：先定义 `05` 用户故事，再写 `06/09/10`
3. **可验证**：所有 MUST 条目必须能被测试或监控验证
4. **不混层**：PRD 不写 SQL，API 不写像素，Test 不重复规则
5. **无歧义**：禁止「可选其一 / 建议 / 大概 / 尽量」等表述

## 三、规范词（RFC 风格）

| 词 | 含义 |
|----|------|
| **MUST** | 必须，违反即缺陷 |
| **SHOULD** | 建议，不满足需说明理由 |
| **MAY** | 可选，不影响基线验收 |
| **MUST NOT** | 严禁 |

## 四、文档元数据（每页必填）

> 模块编号 · 模块名称 · 文档版本 · 文档状态 · 变更记录

## 五、写作约束

- 时间统一 `ISO-8601 UTC`
- 所有 API 字段名一律在 `09` 冻结，其他文档只引用不另起别名
- 所有业务规则必须关联 `REQ-ID`、`US-ID`
- 所有 AC 必须可映射到 `TC-ID`
- 所有跨模块依赖必须写明「依赖类型 / 影响范围 / 回退策略」

## 六、版本与变更

1. 变更流程：`05`（行为）→ `09/10`（契约）→ `13/14`（验证追踪）
2. 修改 API 字段名/类型 **MUST** 升级小版本，记录 breaking / non-breaking
3. 每次变更文末维护变更记录

## 七、质量门禁（文档侧）

- `05` 每条 P0 US 在 `14` 有映射 → ✅ 8 条 US 全部映射
- `14` 每条 REQ 在 `13` 存在至少 1 个 TC → ✅ 8 REQ + 5 规则全覆盖
- `09` 有请求/响应字段说明 → ✅ 10 个端点全部定义
- `10` 有实体定义与约束说明 → ✅ 8 个实体全部定义

> 不满足任一条，文档状态不得置为 Approved

## 八、术语表（Glossary）

| 缩写 | 英文全称 | 中文含义 |
|------|----------|----------|
| **FSD** | Functional Specification Document | 功能规格说明 |
| **NFR** | Non-Functional Requirement | 非功能需求 |
| **PRD** | Product Requirements Document | 产品需求说明 |
| **US** | User Story | 用户故事 |
| **AC** | Acceptance Criteria | 验收标准 |
| **API** | Application Programming Interface | 应用程序接口 |
| **DTO** | Data Transfer Object | 数据传输对象 |
| **RTM** | Requirements Traceability Matrix | 需求追踪矩阵 |
| **TDD** | Test-Driven Development | 测试驱动开发 |
| **WBS** | Work Breakdown Structure | 工作分解结构 |
| **SLO** | Service Level Objective | 服务等级目标 |
| **LLM** | Large Language Model | 大语言模型 |
| **NLP** | Natural Language Processing | 自然语言处理 |
| **SPA** | Single Page Application | 单页面应用 |
| **HMR** | Hot Module Replacement | 热模块替换 |

## 九、六阶段流程

```
Proposal(03-04) → Spec(05-06-07) → Design(08-09-10-11) → Plan(12) → Test(13) → Trace(14)
  Why              What              How             When/Who     OK?      All linked?
```

| 阶段 | 编号 | 完整问题 | 产出物 |
|------|------|----------|--------|
| **Proposal** | 03 + 04 | 为什么要做？做什么不做什么？ | 立项提案 + PRD |
| **Spec** | 05 + 06 + 07 | 用户要什么？功能什么样？约束底线？ | 用户故事 + FSD + NFR |
| **Design** | 08 + 09 + 10 + 11 | 怎么架构？接口契约？数据怎么存？ | 架构 + API + 数据模型 + 安全 |
| **Plan** | 12 | 什么时候交付？谁来做？ | 里程碑 + WBS |
| **Test** | 13 | 做对了没？门禁是什么？ | TC + 质量门禁 |
| **Trace** | 14 | 全对得上吗？有没有漏？ | 四向追溯矩阵 |

## 十、文档写作顺序（非阅读顺序）

> 编号是阅读顺序，实际写作分四轮螺旋推进：

| 轮次 | 文档 | 做什么 | 清晰度 |
|------|------|--------|--------|
| **1. 起点** | 02 + 03 + 05 → 04 | 核心输入 → 产品需求 | 30% |
| **2. 锚定** | 09 | API 接口契约校准 | 60% |
| **3. 展开** | 08 + 10 → 06 + 07 + 11 | 架构+数据展开；06/07/11 被倒逼补全 | 85% |
| **4. 收口** | 12 + 13 → 14 → 01 | 计划+测试并行；14 终检；01 索引收口 | 95% |

## 十一、项目核心数据

| 维度 | 数量 |
|------|------|
| 功能模块 | 6（诊断/行情/视点/问答/自选/导航） |
| 用户故事（US） | 8 条（US-001 ~ US-008） |
| 需求条目（REQ） | 8 条 + 5 条规则 |
| API 端点 | 10 个 |
| 数据实体 | 8 个 |
| 测试用例（TC） | 36 条 |
| 里程碑（S） | 4 个阶段 |
| WBS 任务 | 7 包 |

## 十二、源码目录参考

```
group-workshop/group-2/wangsihong/day3/
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # 路由入口 + ConfigProvider
│   │   ├── main.tsx                   # React 渲染入口
│   │   ├── components/
│   │   │   ├── AppLayout.tsx          # 全局布局（Sider + Header + Content）
│   │   │   └── FundChatBot.tsx        # 悬浮问答组件（fixed 定位）
│   │   └── pages/
│   │       ├── DiagnosisPage.tsx      # 基金诊断页
│   │       ├── MarketPage.tsx         # 基金行情页
│   │       ├── InsightsPage.tsx       # 基金视点页
│   │       └── WatchlistPage.tsx      # 自选基金页
│   ├── package.json
│   └── vite.config.ts
└── spec/
    ├── 01-Spec写作总则与文档编号索引.md
    ├── 02-需求来源与采集记录.md
    ├── 03-立项提案与范围说明.md
    ├── 04-产品需求说明.md
    ├── 05-用户故事与验收标准.md
    ├── 06-功能规格说明.md
    ├── 07-非功能需求与约束.md
    ├── 08-系统架构与技术选型.md
    ├── 09-API接口规格.md
    ├── 10-数据模型与存储规格.md
    ├── 11-安全设计规格.md
    ├── 12-实施计划与里程碑.md
    ├── 13-测试策略与质量门禁.md
    └── 14-需求追踪矩阵.md
```

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2025-04-15 | 首版填写，14 份文档全部完成 |
