# 研报审核助手 (M2-Review) — 开发任务拆分

> **项目**：研报审核助手（M2-Review）
> **状态**：全部开发任务已完成（Done）
> **生成日期**：2026-04-15

## 关联 Spec 文档

| 文档编号 | 文档名称           | 主要引用内容                             |
| -------- | ------------------ | ---------------------------------------- |
| 04       | 产品需求说明       | F-01~F-09 功能清单、BR-01~BR-09 业务规则 |
| 05       | 用户故事与验收标准 | US-001~US-008、AC 验收标准               |
| 06       | 功能规格说明       | 前端页面行为规格、交互流程               |
| 08       | 系统架构与技术选型 | 分层架构、技术选型、ADR                  |
| 09       | API 接口规格       | 10 个 API 端点契约                       |
| 10       | 数据模型与存储规格 | E-01 Review / E-02 Issue / E-03 Rule     |
| 12       | 实施计划与里程碑   | Sprint 计划、WBS 任务拆分                |
| 13       | 测试策略与质量门禁 | TC-M2RV-001~024 测试用例                 |

---

## 一、后端任务 (Backend)

### 1.1 项目初始化与基础架构

| 编号  | 任务名称             | 描述                                                                                                                     | 关联 Spec         | 优先级 | 状态 | 关联文件                               |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------ | ---- | -------------------------------------- |
| BE-01 | Flask 应用工厂初始化 | 实现 `create_app()` 工厂函数，注册蓝图（dashboard_bp / review_bp / rule_bp），配置 CORS、SQLAlchemy、Migrate 等扩展      | 08 §1~§2, ADR-001 | P0     | Done | `backend/app/__init__.py`              |
| BE-02 | 应用配置管理         | 定义 Config 类，管理 `SQLALCHEMY_DATABASE_URI`（SQLite）、`MAX_CONTENT_LENGTH`（50MB）、`UPLOAD_FOLDER`、AI 相关环境变量 | 08 §5, 10 §2      | P0     | Done | `backend/app/config.py`                |
| BE-03 | 扩展实例化           | 初始化 `db = SQLAlchemy()` 和 `migrate = Migrate()` 扩展实例                                                             | 08 §2             | P0     | Done | `backend/app/extensions.py`            |
| BE-04 | WSGI 入口            | 配置 gunicorn 生产部署入口                                                                                               | 08 §6             | P2     | Done | `backend/wsgi.py`                      |
| BE-05 | 环境变量配置         | `.env` 文件定义 `FLASK_APP`、`SECRET_KEY`、`DASHSCOPE_API_KEY`、`AI_MODEL` 等                                            | 08 §9             | P0     | Done | `backend/.env`, `backend/.env.example` |
| BE-06 | 依赖管理             | 声明 Flask、flask-cors、flask-sqlalchemy、flask-migrate、python-docx、PyPDF2、pdfplumber、reportlab 等依赖               | 08 §8             | P0     | Done | `backend/requirements.txt`             |

### 1.2 数据模型层

| 编号  | 任务名称            | 描述                                                                                                                                                                                                                                                                | 关联 Spec    | 优先级 | 状态 | 关联文件                         |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------ | ---- | -------------------------------- |
| BE-07 | Review 模型（E-01） | 定义 Review ORM 实体：id（PK, `RV-{年}-{序号}`）、title、author、report_type、mode、status、score、file_path、file_name、progress、current_step、compliance_issues、content_issues、submitted_at、completed_at；实现 `generate_id()`、`to_dict()`、`to_list_dict()` | 10 §3, BR-09 | P0     | Done | `backend/app/models/review.py`   |
| BE-08 | Issue 模型（E-02）  | 定义 Issue ORM 实体：id（PK, `ISS-{序号}`）、review_id（FK）、rule_id、rule_name、category、severity、location、excerpt、suggestion；实现 `generate_id()`、`to_dict()`；Review 级联删除                                                                             | 10 §4        | P0     | Done | `backend/app/models/issue.py`    |
| BE-09 | Rule 模型（E-03）   | 定义 Rule ORM 实体：id（PK, `R-{类别}-{序号}`）、name、category、severity、mode（JSON）、description、example、enabled；实现 `to_dict()`                                                                                                                            | 10 §5        | P0     | Done | `backend/app/models/rule.py`     |
| BE-10 | 模型包初始化        | 导出 Review、Issue、Rule 模型                                                                                                                                                                                                                                       | 10 §1        | P0     | Done | `backend/app/models/__init__.py` |

### 1.3 API 路由层 — 仪表盘

| 编号  | 任务名称                         | 描述                                                                                                                                       | 关联 Spec                       | 优先级 | 状态 | 关联文件                             |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------ | ---- | ------------------------------------ |
| BE-11 | GET /api/v1/dashboard/stats      | 返回概览指标：totalReviews、passRate（近30日）、avgScore、avgDuration、todayCount、pendingCount、complianceIssuesTotal、contentIssuesTotal | 09 §3.1, US-005 AC-005-01, F-07 | P1     | Done | `backend/app/routes/dashboard_bp.py` |
| BE-12 | GET /api/v1/dashboard/trend      | 返回近7日每日审核趋势：day / total / passed / failed 数组                                                                                  | 09 §3.2, US-005 AC-005-02, F-07 | P1     | Done | `backend/app/routes/dashboard_bp.py` |
| BE-13 | GET /api/v1/dashboard/top-issues | 按 rule_name 分组统计 TOP5 问题，返回 name / count / pct                                                                                   | 09 §3.3, US-005 AC-005-03, F-07 | P1     | Done | `backend/app/routes/dashboard_bp.py` |

### 1.4 API 路由层 — 审核管理

| 编号  | 任务名称                        | 描述                                                                                                                                                        | 关联 Spec                                       | 优先级 | 状态 | 关联文件                          |
| ----- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------ | ---- | --------------------------------- |
| BE-14 | POST /api/v1/reviews            | 接收文件上传（multipart/form-data），校验文件格式（PDF/DOCX/DOC）、大小（≤50MB）、reportType、mode 参数；创建审核记录并启动异步审核线程；返回 201 + 审核 ID | 09 §3.4, US-001 AC-001-01~03, F-01, BR-01~BR-04 | P0     | Done | `backend/app/routes/review_bp.py` |
| BE-15 | GET /api/v1/reviews             | 分页查询审核历史，支持 page/pageSize/search/status/mode/startDate/endDate 多维度筛选；按 submitted_at 倒序；返回 total/page/pageSize/list                   | 09 §3.5, US-004 AC-004-01~03, F-06              | P1     | Done | `backend/app/routes/review_bp.py` |
| BE-16 | GET /api/v1/reviews/{id}        | 获取单条审核记录完整报告，含基本信息 + issues 问题列表（ruleId/ruleName/category/severity/location/excerpt/suggestion）                                     | 09 §3.6, US-003 AC-003-01~03, F-05              | P0     | Done | `backend/app/routes/review_bp.py` |
| BE-17 | GET /api/v1/reviews/{id}/status | 返回审核实时进度：id/status/progress/currentStep/steps/estimatedRemaining；支持前端轮询                                                                     | 09 §3.7, US-002 AC-002-01~02, F-05              | P0     | Done | `backend/app/routes/review_bp.py` |
| BE-18 | GET /api/v1/reviews/{id}/export | 导出审核报告为 PDF 或 DOCX（query param format）；设置 Content-Type 和 Content-Disposition；支持 reportlab/python-docx 降级为纯文本                         | 09 §3.8, US-007 AC-007-01~02, F-09              | P2     | Done | `backend/app/routes/review_bp.py` |

### 1.5 API 路由层 — 规则管理

| 编号  | 任务名称                 | 描述                                                                                                                              | 关联 Spec                           | 优先级 | 状态 | 关联文件                        |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | ---- | ------------------------------- |
| BE-19 | GET /api/v1/rules        | 返回全部审核规则列表（8 条内置），支持按 category/enabled 筛选；每条含 id/name/category/severity/mode/description/example/enabled | 09 §3.9, US-006 AC-006-01, F-08     | P1     | Done | `backend/app/routes/rule_bp.py` |
| BE-20 | PATCH /api/v1/rules/{id} | 更新规则启用/禁用状态；校验 enabled 为布尔值；规则不存在返回 404 RULE_NOT_FOUND                                                   | 09 §3.10, US-006 AC-006-02~03, F-08 | P1     | Done | `backend/app/routes/rule_bp.py` |

### 1.6 服务层 — 文件解析服务

| 编号  | 任务名称           | 描述                                                                                                                 | 关联 Spec                         | 优先级 | 状态 | 关联文件                               |
| ----- | ------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------ | ---- | -------------------------------------- |
| BE-21 | 文件保存与路径管理 | UUID 重命名上传文件（防路径遍历），按年/月目录存储到 uploads/                                                        | 06 §3.2, 08 ADR-006, 11 §文件安全 | P0     | Done | `backend/app/services/file_service.py` |
| BE-22 | PDF 文件解析       | 优先 pdfplumber 解析 PDF 文本，失败回退 PyPDF2；提取标题（第一页首行 ≤100字符）和作者（前5行含"分析师/研究员/作者"） | 06 §3.5, F-01                     | P0     | Done | `backend/app/services/file_service.py` |
| BE-23 | DOCX 文件解析      | python-docx 解析 DOCX 文档；提取标题（第一个非空段落或文档属性 title）和作者（含关键词段落或文档属性 author）        | 06 §3.5, F-01                     | P0     | Done | `backend/app/services/file_service.py` |

### 1.7 服务层 — 规则审核引擎

| 编号  | 任务名称                   | 描述                                                                                        | 关联 Spec            | 优先级 | 状态 | 关联文件                               |
| ----- | -------------------------- | ------------------------------------------------------------------------------------------- | -------------------- | ------ | ---- | -------------------------------------- |
| BE-24 | 内置规则初始化             | 定义 BUILTIN_RULES 数据（R-C-01~R-C-03, R-CO-01~R-CO-05 共 8 条），应用启动时自动写入数据库 | 10 §5, 06 §10.4      | P0     | Done | `backend/app/services/rule_service.py` |
| BE-25 | R-C-02 政治敏感词检测      | 遍历敏感词列表（政治/政府/领导/中央/党）查找匹配位置，提取上下文（前20字后50字）            | 06 §4.3, F-02        | P0     | Done | `backend/app/services/rule_service.py` |
| BE-26 | R-CO-02 数据来源标注检查   | 按段落拆分，检测含数字数据（>50字符）的段落是否有来源关键词（来源：/根据/Wind/Bloomberg）   | 06 §4.3, F-02        | P0     | Done | `backend/app/services/rule_service.py` |
| BE-27 | R-CO-03 投资评级一致性检查 | 提取全文评级词汇（买入/增持/中性/减持/卖出/强烈推荐/推荐），多个不同评级则报告不一致        | 06 §4.3, F-02        | P1     | Done | `backend/app/services/rule_service.py` |
| BE-28 | R-CO-05 分析师信息披露检查 | 检查是否包含"执业证书/执业编号/证书编号"（P1）和"利益冲突/无利益冲突"（P2）                 | 06 §4.3, F-02        | P1     | Done | `backend/app/services/rule_service.py` |
| BE-29 | 规则引擎执行调度           | 从数据库加载适用当前模式且 enabled=true 的规则，逐条执行检查，汇总问题列表并保存 Issue 记录 | 06 §4.2, F-02, BR-03 | P0     | Done | `backend/app/services/rule_service.py` |

### 1.8 服务层 — AI 审核引擎

| 编号  | 任务名称         | 描述                                                                                                              | 关联 Spec                       | 优先级 | 状态 | 关联文件                             |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------ | ---- | ------------------------------------ |
| BE-30 | 百炼 API 调用    | 调用 DashScope Generation API（模型 qwen-plus），发送研报文本（截断 8000 字符），解析返回 JSON 问题列表           | 06 §5.4, F-03                   | P0     | Done | `backend/app/services/ai_service.py` |
| BE-31 | Mock AI 降级服务 | API Key 未配置或调用失败时自动降级；实现关键词匹配：诱导性语言检测（R-CO-04, P0）+ 敏感信息泄露检测（R-C-01, P0） | 06 §5.3, US-008 AC-008-02, F-03 | P0     | Done | `backend/app/services/ai_service.py` |

### 1.9 服务层 — 审核流程编排

| 编号  | 任务名称     | 描述                                                                                                                                 | 关联 Spec                       | 优先级 | 状态 | 关联文件                                 |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- | ------ | ---- | ---------------------------------------- |
| BE-32 | 异步审核线程 | `threading.Thread` 执行审核流程，避免阻塞 HTTP 请求；5 个步骤（文件解析→规则匹配→AI分析→交叉验证→生成报告）更新 progress/currentStep | 08 §4, ADR-005, 06 §6.5         | P0     | Done | `backend/app/services/review_service.py` |
| BE-33 | 评分计算     | 基础分 100，P0 扣 20 / P1 扣 10 / P2 扣 5，最低 0 分                                                                                 | 06 §6.3, 10 §8.1, BR-05         | P0     | Done | `backend/app/services/review_service.py` |
| BE-34 | 状态判定     | 有 P0 → failed；仅 P1/P2 → warning；无问题 → passed（评分 100）                                                                      | 06 §6.4, 10 §8.2, BR-06~BR-08   | P0     | Done | `backend/app/services/review_service.py` |
| BE-35 | 联合审核模式 | mode=combined 时同时执行规则引擎 + AI 引擎，合并问题列表后综合评分                                                                   | 06 §6.1, US-008 AC-008-03, F-04 | P0     | Done | `backend/app/services/review_service.py` |

### 1.10 服务层 — 报告导出

| 编号  | 任务名称  | 描述                                                                                               | 关联 Spec                        | 优先级 | 状态 | 关联文件                                 |
| ----- | --------- | -------------------------------------------------------------------------------------------------- | -------------------------------- | ------ | ---- | ---------------------------------------- |
| BE-36 | PDF 导出  | 使用 reportlab 生成 PDF（标题/基本信息表/问题统计/问题详情）；reportlab 不可用时降级为纯文本 UTF-8 | 06 §11.4, F-09                   | P2     | Done | `backend/app/services/export_service.py` |
| BE-37 | DOCX 导出 | 使用 python-docx 生成 DOCX（内容与 PDF 一致）；python-docx 不可用时降级为纯文本                    | 06 §11.4, US-007 AC-007-02, F-09 | P2     | Done | `backend/app/services/export_service.py` |

### 1.11 工具层

| 编号  | 任务名称         | 描述                                                                                                                     | 关联 Spec       | 优先级 | 状态 | 关联文件             |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------- | ------ | ---- | -------------------- |
| BE-38 | 统一响应格式     | 封装 traceId 注入、成功响应（data）、分页响应（total/page/pageSize/list）、错误响应（error.code/message/details）        | 09 §2           | P0     | Done | `backend/app/utils/` |
| BE-39 | 错误码与异常处理 | 定义 INVALID_REQUEST / FILE_TOO_LARGE / UNSUPPORTED_FILE_TYPE / REVIEW_NOT_FOUND / RULE_NOT_FOUND 等错误码；全局异常处理 | 09 §2.4, 06 §12 | P0     | Done | `backend/app/utils/` |
| BE-40 | 参数校验工具     | 文件格式白名单、大小限制、reportType 枚举、mode 枚举、enabled 布尔值校验                                                 | 09 §5           | P0     | Done | `backend/app/utils/` |

### 1.12 测试

| 编号  | 任务名称            | 描述                                                                                | 关联 Spec                     | 优先级 | 状态 | 关联文件                    |
| ----- | ------------------- | ----------------------------------------------------------------------------------- | ----------------------------- | ------ | ---- | --------------------------- |
| BE-41 | 测试夹具配置        | conftest.py：创建测试用 Flask app、测试数据库（内存 SQLite）、Flask test_client     | 13 §一                        | P0     | Done | `backend/tests/conftest.py` |
| BE-42 | 仪表盘 API 集成测试 | TC-M2RV-001~003：验证 stats/trend/top-issues 端点响应格式和数据正确性               | 13 §3.1, REQ-M2RV-005         | P1     | Done | `backend/tests/`            |
| BE-43 | 提交审核集成测试    | TC-M2RV-004~008：合法提交→201、格式错误→400、大小超限→400、无文件→400、联合模式→201 | 13 §3.2, REQ-M2RV-001/008     | P0     | Done | `backend/tests/`            |
| BE-44 | 审核状态/报告测试   | TC-M2RV-009~012：状态查询正常/404、报告获取正常/404                                 | 13 §3.3~3.4, REQ-M2RV-002/003 | P0     | Done | `backend/tests/`            |
| BE-45 | 审核历史列表测试    | TC-M2RV-013~015：默认分页、多条件筛选、模糊搜索                                     | 13 §3.5, REQ-M2RV-004         | P1     | Done | `backend/tests/`            |
| BE-46 | 报告导出测试        | TC-M2RV-016~017：PDF 导出、DOCX 导出                                                | 13 §3.6, REQ-M2RV-007         | P2     | Done | `backend/tests/`            |
| BE-47 | 规则管理测试        | TC-M2RV-018~020：规则列表、分类筛选、启用/禁用切换                                  | 13 §3.7, REQ-M2RV-006         | P1     | Done | `backend/tests/`            |
| BE-48 | 异常场景测试        | TC-M2RV-021~024：不存在审核记录404、空文件400、不存在规则404、enabled 参数校验400   | 13 §3.8                       | P1     | Done | `backend/tests/`            |

---

## 二、前端任务 (Frontend)

> 前端采用 React + Vite 构建，Tailwind CSS 样式，Chart.js 图表，原生 fetch 调用后端 API。

### 2.1 项目初始化与基础架构

| 编号  | 任务名称                | 描述                                                                                                                                                                                              | 关联 Spec        | 优先级 | 状态 | 关联文件                                           |
| ----- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ---- | -------------------------------------------------- |
| FE-01 | Vite + React 项目初始化 | 创建 Vite 项目，配置 proxy 代理到 Flask 后端（localhost:5000），引入 Tailwind CSS / Chart.js / Font Awesome CDN                                                                                   | 08 §3.1, ADR-003 | P0     | Done | `frontend/vite.config.js`, `frontend/package.json` |
| FE-02 | 应用入口                | main.jsx 渲染根组件 App；index.html 定义 `<div id="root">`                                                                                                                                        | 06 §1            | P0     | Done | `frontend/src/main.jsx`, `frontend/index.html`     |
| FE-03 | API 封装层              | 统一封装 fetch 请求，定义所有 10 个 API 端点调用函数（submitReview / getReviews / getReviewDetail / getReviewStatus / exportReport / getRules / updateRule / getStats / getTrend / getTopIssues） | 09 §1            | P0     | Done | `frontend/src/api.js`                              |
| FE-04 | 全局样式                | Tailwind CSS 基础样式配置 + 自定义样式（深蓝色主色调、卡片阴影、状态标签颜色等）                                                                                                                  | 06 §2.1          | P0     | Done | `frontend/src/index.css`                           |

### 2.2 布局组件

| 编号  | 任务名称       | 描述                                                                                                                         | 关联 Spec  | 优先级 | 状态 | 关联文件                              |
| ----- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---- | ------------------------------------- |
| FE-05 | Header 导航栏  | 深蓝色背景 60px 高，左侧 Logo + "研报合规稽核系统"，右侧导航菜单（提交审核/审核历史/仪表盘/规则管理）                        | 06 §2      | P0     | Done | `frontend/src/components/Header.jsx`  |
| FE-06 | Sidebar 侧边栏 | 左侧导航菜单，路由切换各功能页面，高亮当前页面                                                                               | 06 §1      | P0     | Done | `frontend/src/components/Sidebar.jsx` |
| FE-07 | App 主框架     | 整体布局（Header + Sidebar + Main Content），状态管理（currentView / reviewFile / reportType / reviewMode 等），视图路由切换 | 06 §1, §13 | P0     | Done | `frontend/src/App.jsx`                |

### 2.3 提交审核页

| 编号  | 任务名称     | 描述                                                                                             | 关联 Spec                            | 优先级 | 状态 | 关联文件                                  |
| ----- | ------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------ | ------ | ---- | ----------------------------------------- |
| FE-08 | 审核配置面板 | 研报类型下拉选择（日报/周报/深度研究/首次覆盖/行业报告）+ 审核模式选择（规则/AI/联合）+ 提交按钮 | 06 §3.3, US-001, US-008, BR-03~BR-04 | P0     | Done | `frontend/src/components/ReviewSetup.jsx` |
| FE-09 | 文件上传弹窗 | 拖拽/点击上传区域，文件格式前端校验（PDF/DOCX/DOC）、大小校验（≤50MB），上传进度展示             | 06 §3.2, US-001 AC-001-02~03         | P0     | Done | `frontend/src/components/UploadModal.jsx` |

### 2.4 审核报告页

| 编号  | 任务名称         | 描述                                                                                                                                                                                                                      | 关联 Spec                                          | 优先级 | 状态 | 关联文件                                   |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------ | ---- | ------------------------------------------ |
| FE-10 | 审核报告详情展示 | 展示审核基本信息（标题/作者/类型/模式/评分/状态/时间）；问题列表（severity 颜色标签 P0红/P1橙/P2蓝 + ruleName + category + location + excerpt + suggestion）；审核进度轮询（GET /status 轮询 progress/currentStep/steps） | 06 §7.2~7.4, US-002 AC-002-01, US-003 AC-003-01~03 | P0     | Done | `frontend/src/components/ReviewReport.jsx` |
| FE-11 | 报告导出按钮     | "导出PDF" / "导出DOCX" 按钮，调用 GET /reviews/{id}/export 下载文件                                                                                                                                                       | 06 §11.2, US-007                                   | P2     | Done | `frontend/src/components/ReviewReport.jsx` |

### 2.5 审核历史页 & 仪表盘 & 规则管理

| 编号  | 任务名称               | 描述                                                                                                                                                                                                  | 关联 Spec                | 优先级 | 状态 | 关联文件                                     |
| ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------ | ---- | -------------------------------------------- |
| FE-12 | 文档抽屉（多功能面板） | 整合审核历史列表（搜索/状态筛选/模式筛选/日期筛选/分页/数据表格）、仪表盘统计（概览卡片/Chart.js 趋势折线图/TOP5 横向柱状图）、规则管理（规则卡片列表/分类筛选/启用禁用开关）于统一的抽屉式面板组件中 | 06 §8~§10, US-004~US-006 | P1     | Done | `frontend/src/components/DocumentDrawer.jsx` |

### 2.6 Mock 数据

| 编号  | 任务名称       | 描述                                 | 关联 Spec | 优先级 | 状态 | 关联文件             |
| ----- | -------------- | ------------------------------------ | --------- | ------ | ---- | -------------------- |
| FE-13 | 前端 Mock 数据 | 开发阶段提供模拟数据支持前端独立调试 | —         | P2     | Done | `frontend/src/mock/` |

---

## 三、任务统计

| 分类                | P0     | P1     | P2     | 合计   |
| ------------------- | ------ | ------ | ------ | ------ |
| 后端（BE-01~BE-48） | 28     | 13     | 7      | 48     |
| 前端（FE-01~FE-13） | 8      | 1      | 4      | 13     |
| **合计**            | **36** | **14** | **11** | **61** |

> 全部 61 项任务状态均为 **Done**，项目代码开发已完成。

---

## 四、需求追溯索引

| 需求编号     | 用户故事              | 后端任务        | 前端任务     | 测试任务 |
| ------------ | --------------------- | --------------- | ------------ | -------- |
| REQ-M2RV-001 | US-001 提交研报审核   | BE-14, BE-21~23 | FE-08, FE-09 | BE-43    |
| REQ-M2RV-002 | US-002 查看审核进度   | BE-17, BE-32    | FE-10        | BE-44    |
| REQ-M2RV-003 | US-003 查看审核报告   | BE-16, BE-33~34 | FE-10, FE-11 | BE-44    |
| REQ-M2RV-004 | US-004 查询审核历史   | BE-15           | FE-12        | BE-45    |
| REQ-M2RV-005 | US-005 查看仪表盘统计 | BE-11~13        | FE-12        | BE-42    |
| REQ-M2RV-006 | US-006 管理审核规则   | BE-19~20, BE-24 | FE-12        | BE-47    |
| REQ-M2RV-007 | US-007 导出审核报告   | BE-18, BE-36~37 | FE-11        | BE-46    |
| REQ-M2RV-008 | US-008 选择审核模式   | BE-29~31, BE-35 | FE-08        | BE-43    |
