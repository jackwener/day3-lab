# 01 — Spec 写作总则 & 文档编号索引

---

| 项 | 值 |
|---|---|
| 模块编号 | M1-QA |
| 模块名称 | 投研问答助手 |
| 文档版本 | v0.2 |
| 文档状态 | Approved |

---

## 一、编号与阶段对照（00 ~ 14）

| 编号 | 阶段 | 分类 | 文档名称 |
|------|------|------|----------|
| `00` | Meta | 总则 | Spec 写作规则、RFC 规范词 |
| `01` | Meta | 编号规范 | 编号、命名、目录结构 |
| `02` | Meta | Elicitation | 需求来源与采集记录 |
| `03` | Proposal | Proposal | 立项提案与范围说明 |
| `04` | Proposal | PRD | 产品需求说明 |
| `05` | Spec | UserStory | 用户故事与验收标准 |
| `06` | Spec | FSD | 功能规格说明 |
| `07` | Spec | NFR | 非功能需求与约束 |
| `08` | Design | Architecture | 系统架构与技术选型 |
| `09` | Design | API | 接口规格（契约真源） |
| `10` | Design | Data | 数据模型与存储规格 |
| `11` | Design | Security | 安全设计规格 |
| `12` | Plan | Plan | 实施计划与里程碑 |
| `13` | Test | Test | 测试策略与质量门禁 |
| `14` | Trace | Traceability | 需求追踪矩阵（四向对齐） |

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

> 模块编号 · 模块名称 · 文档版本 · 文档状态 · Owner · Reviewer · 生效日期 · 变更影响级别

## 五、写作约束

- 时间统一 `ISO-8601 UTC`
- 所有 API 字段名一律在 `09` 冻结，其他文档只引用不另起别名
- 所有业务规则必须关联 `REQ-ID`、`UserStory-ID`
- 所有 AC 必须可映射到 `TC-ID`
- 所有跨模块依赖必须写明「依赖类型 / 影响范围 / 回退策略」

## 六、版本与变更

1. 变更流程：`05`（行为）→ `09/10`（契约）→ `13/14`（验证追踪）
2. 修改 API 字段名/类型 **MUST** 升级小版本，记录 breaking / non-breaking
3. 每次变更文末维护变更记录

## 七、质量门禁（文档侧）

- `05` 每条 P0 US 在 `14` 有映射
- `14` 每条 REQ 在 `13` 存在至少 1 个 TC
- `09` 有示例请求 / 响应 / 错误体
- `10` 有索引与约束说明

> 不满足任一条，文档状态不得置为 Approved

## 八、文件命名 & 目录

格式：`<编号>-<分类英文>-<中文主题>-v<主>.<次>.md`

| 示例 | 对应 |
|------|------|
| `03-Proposal-立项提案与范围-v2.0.md` | Proposal |
| `09-API-接口规格-v2.0.md` | API Spec |

**分类词表**：Elicitation · Proposal · PRD · UserStory · FSD · NFR · Architecture · API · Data · Security · Plan · Test · Traceability

---

## 九、术语表（Glossary）

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
| **SSE** | Server-Sent Events | 服务端推送事件 |
| **RAG** | Retrieval-Augmented Generation | 检索增强生成 |
| **RSS** | Really Simple Syndication | 简易信息聚合 |
| **CORS** | Cross-Origin Resource Sharing | 跨域资源共享 |
| **CRUD** | Create, Read, Update, Delete | 增删改查 |

## 十、六阶段流程

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

## 十一、文档写作顺序（非阅读顺序）

> 编号是阅读顺序，实际写作分四轮螺旋推进：

| 轮次 | 文档 | 做什么 | 清晰度 |
|------|------|--------|--------|
| **1. 起点** | 03 → 04 | 提炼原始素材 → 立项 → 产品需求 | 30% |
| **2. 锚定** | 05 + 09 | 用户故事与 API 接口互相校准 | 60% |
| **3. 展开** | 08 + 10 → 06 + 07 | 架构+数据展开；06/07 被倒逼补全 | 85% |
| **4. 收口** | 12 + 13 → 14 | 计划+测试并行；14 终检全链路 | 95% |

## 十二、源码目录参考

```
code/
├── backend/
│   ├── server.js                     # Express 主入口（11 个 API 端点）
│   ├── swagger.js                    # Swagger API 文档定义
│   ├── agent.py                      # Agent 编排 — 三级降级
│   ├── agent_bp.py                   # Flask 蓝图路由（Python 备选后端）
│   ├── storage.py                    # Storage 层 — JSON 文件 CRUD
│   ├── bailian_qa.py                 # 百炼（DashScope）LLM 集成
│   ├── copaw_bridge.py               # CoPaw HTTP 桥接
│   ├── wsgi.py                       # Flask 应用工厂
│   ├── data/                         # 生产数据
│   │   ├── session_info.json         #   会话元数据
│   │   ├── message_log.json          #   问答记录
│   │   ├── doc_chunks.json           #   文档块（RAG 检索源）
│   │   └── reports/                  #   研报 Markdown 源文件
│   │       ├── 华芯科技2025年度深度研究报告.md
│   │       ├── 星辰半导体2025年度深度研究报告.md
│   │       └── 龙芯微电子2025年度深度研究报告.md
│   └── tests/
│       ├── conftest.py               # pytest fixtures
│       ├── test_storage.py           # Storage 单元测试
│       ├── test_agent.py             # Agent 降级测试
│       ├── test_api_ask.py           # 问答 API 集成测试
│       ├── test_api_health.py        # 健康检查 API 测试
│       └── test_task05_sessions.py   # 会话管理 API 测试
├── frontend/
│   └── src/
│       ├── App.jsx                   # 主组件（三视图切换）
│       ├── api/
│       │   └── client.js             # API 客户端封装
│       ├── components/
│       │   ├── ChatArea.jsx           # 聊天区域
│       │   ├── DocPreview.jsx         # 原文溯源预览
│       │   ├── Header.jsx             # 顶部导航 + 健康指示
│       │   ├── ReportCompare.jsx      # 研报对比
│       │   ├── SentimentMonitor.jsx   # 舆情监控
│       │   └── Sidebar.jsx            # 会话侧边栏
│       ├── index.css                  # 全局样式（CSS 变量体系）
│       └── App.css                    # 组件样式
```

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-14 | 首版，适配投研问答助手 M1-QA 模块 |
| v0.2 | 2026-04-15 | 新增 SSE/RAG/RSS 等术语；修正源码目录结构（Express 主入口、6 个前端组件、研报目录） |
