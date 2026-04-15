# 01 — Spec 写作总则 & 文档编号索引

---

| 项       | 值           |
| -------- | ------------ |
| 模块编号 | M2-Review    |
| 模块名称 | 研报审核助手 |
| 文档版本 | v0.1         |
| 文档状态 | Draft        |

---

## 一、编写目标

本 Spec 系列文档面向 **研报审核助手（M2-Review）** 模块，核心目标：

1. **明确**：所有需求、接口、数据模型均有唯一定义，消除歧义
2. **可追溯**：需求 → 用户故事 → 功能规格 → API → 测试用例，全链路可追踪
3. **可验证**：每条 MUST 要求均可通过自动化测试或人工验收确认

**目标读者**：产品经理、后端/前端开发工程师、QA 测试工程师、项目导师

## 二、编号与阶段对照（00 ~ 14）

| 编号 | 阶段     | 分类         | 文档名称                    | 状态     |
| ---- | -------- | ------------ | --------------------------- | -------- |
| `01` | Meta     | 编号规范     | Spec 写作总则与文档编号索引 | Draft    |
| `02` | Meta     | Elicitation  | 需求来源与采集记录          | **Done** |
| `03` | Proposal | Proposal     | 立项提案与范围说明          | Draft    |
| `04` | Proposal | PRD          | 产品需求说明                | Draft    |
| `05` | Spec     | UserStory    | 用户故事与验收标准          | Draft    |
| `06` | Spec     | FSD          | 功能规格说明                | Draft    |
| `07` | Spec     | NFR          | 非功能需求与约束            | Draft    |
| `08` | Design   | Architecture | 系统架构与技术选型          | Draft    |
| `09` | Design   | API          | 接口规格（契约真源）        | **Done** |
| `10` | Design   | Data         | 数据模型与存储规格          | Draft    |
| `11` | Design   | Security     | 安全设计规格                | Draft    |
| `12` | Plan     | Plan         | 实施计划与里程碑            | Draft    |
| `13` | Test     | Test         | 测试策略与质量门禁          | Draft    |
| `14` | Trace    | Traceability | 需求追踪矩阵（四向对齐）    | Draft    |

## 三、基本原则

1. **单一真相**：对外行为以 `09` API 与 `10` 数据模型为准
2. **先行为后实现**：先定义 `05` 用户故事，再写 `06/09/10`
3. **可验证**：所有 MUST 条目必须能被测试或监控验证
4. **不混层**：PRD 不写 SQL，API 不写像素，Test 不重复规则
5. **无歧义**：禁止「可选其一 / 建议 / 大概 / 尽量」等表述

## 四、规范词（RFC 风格）

| 词           | 含义                   |
| ------------ | ---------------------- |
| **MUST**     | 必须，违反即缺陷       |
| **SHOULD**   | 建议，不满足需说明理由 |
| **MAY**      | 可选，不影响基线验收   |
| **MUST NOT** | 严禁                   |

## 五、文档元数据（每页必填）

> 模块编号 · 模块名称 · 文档版本 · 文档状态 · Owner · Reviewer · 生效日期 · 变更影响级别

## 六、写作约束

- 时间统一 `ISO-8601 UTC`
- 所有 API 字段名一律在 `09` 冻结，其他文档只引用不另起别名
- 所有业务规则必须关联 `REQ-ID`、`UserStory-ID`
- 所有 AC 必须可映射到 `TC-ID`
- 所有跨模块依赖必须写明「依赖类型 / 影响范围 / 回退策略」

## 七、版本与变更

1. 变更流程：`05`（行为）→ `09/10`（契约）→ `13/14`（验证追踪）
2. 修改 API 字段名/类型 **MUST** 升级小版本，记录 breaking / non-breaking
3. 每次变更文末维护变更记录

## 八、质量门禁（文档侧）

- `05` 每条 P0 US 在 `14` 有映射
- `14` 每条 REQ 在 `13` 存在至少 1 个 TC
- `09` 有示例请求 / 响应 / 错误体
- `10` 有索引与约束说明

> 不满足任一条，文档状态不得置为 Approved

## 九、文件命名 & 目录

格式：`<编号>-<分类英文>-<中文主题>-v<主>.<次>.md`

| 示例                                 | 对应     |
| ------------------------------------ | -------- |
| `03-Proposal-立项提案与范围-v0.1.md` | Proposal |
| `09-API-接口规格-v0.1.md`            | API Spec |

**分类词表**：Elicitation · Proposal · PRD · UserStory · FSD · NFR · Architecture · API · Data · Security · Plan · Test · Traceability

---

## 十、术语表（Glossary）

| 缩写      | 英文全称                                     | 中文含义          |
| --------- | -------------------------------------------- | ----------------- |
| **PRD**   | Product Requirements Document                | 产品需求说明      |
| **US**    | User Story                                   | 用户故事          |
| **AC**    | Acceptance Criteria                          | 验收标准          |
| **NFR**   | Non-Functional Requirement                   | 非功能需求        |
| **FSD**   | Functional Specification Document            | 功能规格说明      |
| **SLA**   | Service Level Agreement                      | 服务等级协议      |
| **ORM**   | Object-Relational Mapping                    | 对象关系映射      |
| **CI/CD** | Continuous Integration / Continuous Delivery | 持续集成/持续交付 |
| **E2E**   | End-to-End                                   | 端到端（测试）    |
| **API**   | Application Programming Interface            | 应用程序接口      |
| **DTO**   | Data Transfer Object                         | 数据传输对象      |
| **RTM**   | Requirements Traceability Matrix             | 需求追踪矩阵      |
| **WBS**   | Work Breakdown Structure                     | 工作分解结构      |
| **SLO**   | Service Level Objective                      | 服务等级目标      |
| **PDF**   | Portable Document Format                     | 便携式文档格式    |

## 十一、六阶段流程

```
Proposal(03-04) → Spec(05-06-07) → Design(08-09-10-11) → Plan(12) → Test(13) → Trace(14)
  Why              What              How             When/Who     OK?      All linked?
```

| 阶段         | 编号              | 完整问题                           | 产出物                       |
| ------------ | ----------------- | ---------------------------------- | ---------------------------- |
| **Proposal** | 03 + 04           | 为什么要做？做什么不做什么？       | 立项提案 + PRD               |
| **Spec**     | 05 + 06 + 07      | 用户要什么？功能什么样？约束底线？ | 用户故事 + FSD + NFR         |
| **Design**   | 08 + 09 + 10 + 11 | 怎么架构？接口契约？数据怎么存？   | 架构 + API + 数据模型 + 安全 |
| **Plan**     | 12                | 什么时候交付？谁来做？             | 里程碑 + WBS                 |
| **Test**     | 13                | 做对了没？门禁是什么？             | TC + 质量门禁                |
| **Trace**    | 14                | 全对得上吗？有没有漏？             | 四向追溯矩阵                 |

## 十二、文档写作顺序（非阅读顺序）

> 编号是阅读顺序，实际写作分四轮螺旋推进：

| 轮次        | 文档              | 做什么                          | 清晰度 |
| ----------- | ----------------- | ------------------------------- | ------ |
| **1. 起点** | 03 → 04           | 提炼原始素材 → 立项 → 产品需求  | 30%    |
| **2. 锚定** | 05 + 09           | 用户故事与 API 接口互相校准     | 60%    |
| **3. 展开** | 08 + 10 → 06 + 07 | 架构+数据展开；06/07 被倒逼补全 | 85%    |
| **4. 收口** | 12 + 13 → 14      | 计划+测试并行；14 终检全链路    | 95%    |

## 十三、源码目录参考

```
group-8/team1/report-compliance-audit/
├── backend/
│   ├── app/
│   │   ├── __init__.py               # Flask 应用工厂
│   │   ├── config.py                 # 配置管理
│   │   ├── extensions.py             # 扩展初始化（SQLAlchemy）
│   │   ├── models/
│   │   │   ├── review.py             # Review 审核记录模型
│   │   │   ├── issue.py              # Issue 审核问题模型
│   │   │   └── rule.py               # Rule 审核规则模型
│   │   ├── routes/
│   │   │   ├── dashboard_bp.py       # 仪表盘路由（3 个端点）
│   │   │   ├── review_bp.py          # 审核路由（5 个端点）
│   │   │   └── rule_bp.py            # 规则路由（2 个端点）
│   │   ├── services/                 # 业务逻辑层
│   │   └── utils/                    # 工具函数（响应封装/错误处理/校验）
│   ├── tests/                        # 测试文件
│   ├── uploads/                      # 上传文件存储
│   ├── requirements.txt              # Python 依赖
│   └── wsgi.py                       # WSGI 入口
├── frontend/
│   ├── index.html                    # 主页面（HTML5 + Tailwind CSS）
│   ├── dashboard.html                # 仪表盘页面
│   ├── review.html                   # 审核详情页面
│   ├── rules.html                    # 规则管理页面
│   └── history.html                  # 审核历史页面
└── README.md
```

---

| 版本 | 日期       | 说明     |
| ---- | ---------- | -------- |
| v0.1 | 2026-04-15 | 首版填写 |
