# 01 — Spec 写作总则 & 文档编号索引

---

| 项 | 值 |
|---|---|
| 模块编号 | M2-HUB |
| 模块名称 | Skill Hub（Claude Code 技能库） |
| 文档版本 | v0.2 |
| 文档状态 | Draft |
| Owner | huangtianming |
| 生效日期 | 2026-04-15 |

---

## 一、本模块范围（v0.2 聚焦）

本次 Spec 仅覆盖以下 4 类核心需求，其余（评论、用户体系、运营后台、审核流程、推荐位等）推迟至后续版本：

| 类别 | 能力 |
|------|------|
| **一、Skill 管理** | (1) ZIP 压缩包上传发布 (2) 在线创建（LLM 协助） |
| **二、Skill 展示** | (3) 展示 `skill.md` + 描述/标签/评分/浏览/收藏/下载 (4) 深色/浅色主题切换 |
| **三、分类与搜索** | (5) 标签筛选 (6) 分类筛选 + 多维度排序 (7) LLM 自然语言智能搜索（≥5 条） |
| **四、互动** | (8) 热度排名 (9) 点赞 (10) 收藏 |

## 二、编号与阶段对照（00 ~ 15）

| 编号 | 阶段 | 分类 | 文档名称 |
|------|------|------|----------|
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
| `15` | Plan | Team Plan | 开发分工与集成计划 |

## 三、基本原则

1. **单一真相**：对外行为以 `09` API 与 `10` 数据模型为准
2. **先行为后实现**：先定义 `05` 用户故事，再写 `06/09/10`
3. **可验证**：所有 MUST 条目必须能被测试或监控验证
4. **不混层**：PRD 不写 SQL，API 不写像素，Test 不重复规则
5. **无歧义**：禁止「可选其一 / 建议 / 大概 / 尽量」等表述

## 四、规范词（RFC 风格）

| 词 | 含义 |
|----|------|
| **MUST** | 必须，违反即缺陷 |
| **SHOULD** | 建议，不满足需说明理由 |
| **MAY** | 可选，不影响基线验收 |
| **MUST NOT** | 严禁 |

## 五、写作约束

- 时间统一 `ISO-8601 UTC`
- 所有 API 字段名一律在 `09` 冻结
- 所有业务规则必须关联 `REQ-ID`、`US-ID`
- 所有 AC 必须可映射到 `TC-ID`

## 六、质量门禁（文档侧）

- `05` 每条 P0 US 在 `14` 有映射
- `14` 每条 REQ 在 `13` 存在至少 1 个 TC
- `09` 有示例请求 / 响应 / 错误体
- `10` 有索引与约束说明

## 七、术语表

| 缩写 | 全称 | 含义 |
|------|------|------|
| **Skill** | Claude Code Skill | 技能包（含 `skill.md` + 资源文件，打包为 zip） |
| **skill.md** | Skill Manifest | 技能说明主文件，含元数据与使用说明 |
| **ZIP Bundle** | Skill ZIP Bundle | 技能的 zip 压缩发布包 |
| **LLM Assist** | LLM-Assisted Creation | 用户输入意图，LLM 生成 skill.md 草稿 |
| **Smart Search** | LLM Semantic Search | 基于自然语言的语义匹配 |
| **Rating** | User Rating | 1–5 星评分 |
| **Like** | Like | 点赞（单用户/IP 唯一） |
| **Favorite** | Favorite | 收藏（单用户/IP 唯一） |

## 八、源码目录参考

```
group-1-project-a/
├── backend/
│   ├── app.py
│   ├── blueprints/
│   │   ├── skill_bp.py         # Skill CRUD / 展示
│   │   ├── upload_bp.py        # ZIP 上传
│   │   ├── interact_bp.py      # 点赞/收藏/评分
│   │   └── search_bp.py        # 智能搜索
│   ├── services/
│   │   ├── skill_service.py
│   │   ├── zip_service.py      # ZIP 解压、zip-slip 防护
│   │   ├── llm_service.py      # LLM 创建/搜索封装
│   │   └── ranking_service.py  # 热度算分
│   ├── storage.py
│   ├── data/
│   │   ├── skills.json
│   │   ├── interactions.json   # 点赞/收藏/评分
│   │   └── bundles/<skill_id>/ # 解压后的 skill 文件
│   └── tests/
└── frontend/
    └── src/
        ├── App.jsx
        ├── theme/              # 深色/浅色主题
        ├── pages/
        │   ├── SkillList.jsx
        │   ├── SkillDetail.jsx
        │   ├── SkillCreate.jsx # 含 LLM 辅助
        │   └── SkillUpload.jsx # ZIP 上传
        └── api.js
```

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-15 | 首版（旧范围） |
| v0.2 | 2026-04-15 | **范围聚焦**：ZIP 发布 / LLM 创建 / 智能搜索 / 主题切换 / 点赞收藏评分 |
