# M5-RA 研报智能分析助手 — 任务拆分

> 按 **1 前端 + 3 后端** 分配，每人 ≤5 个任务
> 依赖链：S1 → S2 → S3 → S4 → S5 → S6

---

## 前端开发（FE-Dev） — 1 人

| # | 任务 | 里程碑 | 涉及文件 | 验收标准 | 对齐 Spec |
|---|------|--------|---------|---------|----------|
| **FE-1** | **会话管理 + 空状态 + React State 架构** | S1 | `App.jsx` `App.css` | Sidebar 会话列表加载 <1s；新建 <2s；删除带确认弹窗；无会话显示引导；页面刷新数据清空 | 06 §3-4, 10 §2 |
| **FE-2** | **文件上传组件 + 解析进度展示** | S2 | `App.jsx` `api.js` `App.css` | 支持拖拽上传 pdf/doc/docx ≤100MB；实时进度条；失败提示；首次上传自动命名会话 | 06 §5, 09 §8-9 |
| **FE-3** | **问答输入 + 对话历史渲染 + FAQ 网格** | S3 | `App.jsx` `App.css` | Enter 发送 / Shift+Enter 换行；≤500字符计数；用户/AI 气泡 + 来源标签 + 时间戳；FAQ 点击填入输入框 | 06 §4-5, 09 §10 |
| **FE-4** | **Header 模型切换 + 能力状态芯片** | S4+S6 | `App.jsx` `App.css` | 下拉列表展示可用/不可用模型；选择后新对话使用新模型；芯片显示 CoPaw/百炼/离线状态 | 06 §7, 09 §3,11 |
| **FE-5** | **深度分析触发按钮 + 报告面板** | S5 | `App.jsx` `App.css` | 手动点击触发；防重复提交；进度条展示；Tab 切换八维度 Markdown 渲染；支持导出 | 06 §6, 09 §12-13 |

---

## 后端开发 A（BE-A）— 路由层 + 基础设施

| # | 任务 | 里程碑 | 涉及文件 | 验收标准 | 对齐 Spec |
|---|------|--------|---------|---------|----------|
| **BE-A1** | **Flask 应用 + traceId 中间件 + 统一错误码** | S1 | `app.py` `api_bp.py` | CORS 全开放；每请求注入 traceId；错误响应格式 `{error:{code,message,details,traceId}}` | 08 §6, 09 §2 |
| **BE-A2** | **会话管理 CRUD 路由** | S1 | `api_bp.py` | POST/GET/DELETE /sessions 三端点通过；参数校验 SESSION_NOT_FOUND | 09 §4-6 |
| **BE-A3** | **文件上传 + 解析状态路由** | S2 | `api_bp.py` | POST /files/upload 类型/大小校验；GET /files/{id}/status 返回进度 | 09 §8-9 |
| **BE-A4** | **问答提交 + 历史记录路由** | S3 | `api_bp.py` | POST /ask 参数校验（空 query / 超 500 字 / 无 session）；GET /records 按时间倒序 | 09 §7,10,14 |
| **BE-A5** | **模型列表 + 深度分析 + 能力探测路由** | S4-S6 | `api_bp.py` | GET /llm/providers 不含 Key；POST /analyze 返回 202；GET /capabilities 能力检测 | 09 §3,11-13 |

---

## 后端开发 B（BE-B）— Agent 编排 + 存储 + 文件解析

| # | 任务 | 里程碑 | 涉及文件 | 验收标准 | 对齐 Spec |
|---|------|--------|---------|---------|----------|
| **BE-B1** | **Storage 模块 — Session/QARecord 内存存储** | S1 | `storage.py` | Session CRUD；session_id UUID；query_count 自增；delete 级联清理 records | 10 §3-4 |
| **BE-B2** | **Storage 模块 — ReportFile 存储 + 文件保存** | S2 | `storage.py` | save_file 保存到 uploads/；首次上传自动命名；file_size 校验 | 10 §5,7 |
| **BE-B3** | **PDF/Word 解析引擎** | S2 | `pdf_parser.py` | PDF 文本提取（pdfplumber）；Word 文本提取（python-docx）；进度回调；30s 超时 → failed | 08 §2, 10 §7 |
| **BE-B4** | **ReportAgent 三级降级编排** | S3 | `report_agent.py` | CoPaw(20s) → 百炼(120s) → Demo(0s)；静默降级不抛异常；answer_source 正确标记 | 08 §4, 07 §1.2 |
| **BE-B5** | **Demo 模式兜底 + 深度分析异步调度** | S3+S5 | `report_agent.py` `skill_client.py` | Demo 返回模板回答 llm_used=false；analyze 异步执行返回 status/progress | 08 §4, 09 §12-13 |

---

## 后端开发 C（BE-C）— LLM Provider + Skill 集成

| # | 任务 | 里程碑 | 涉及文件 | 验收标准 | 对齐 Spec |
|---|------|--------|---------|---------|----------|
| **BE-C1** | **CoPaw 桥接 Provider** | S3 | `copaw_bridge.py` | 读取 IRA_COPAW_BASE_URL；20s 超时；未配置返回 None；answer_source='copaw' | 08 §4 [1] |
| **BE-C2** | **百炼 DashScope Provider** | S3 | `bailian_qa.py` | 读取 DASHSCOPE_API_KEY；120s 超时；调用 qwen-max；answer_source='bailian' | 08 §4 [2] |
| **BE-C3** | **LLM Manager 多 Provider 管理** | S4 | `llm_manager.py` | 扫描 .env 配置；list_providers 不含 Key；get_capabilities 返回配置状态 | 09 §3,11 |
| **BE-C4** | **Skill Client — Rabyte API 集成** | S5 | `skill_client.py` | 调用 Rabyte Skill API；异步执行；状态查询 queued→analyzing→completed；降级提示 | 04 §5.3, 09 §12-13 |
| **BE-C5** | **能力探测逻辑 + 健康检查** | S6 | `llm_manager.py` | GET /capabilities 正确返回各服务状态；LLM 异常自动降级到 Demo | 09 §3, 07 §1.2 |

---

## 汇总

| 角色 | 人员 | 任务数 | 覆盖里程碑 |
|------|------|--------|-----------|
| FE-Dev | 前端 ×1 | 5 | S1-S6 全覆盖 |
| BE-A | 后端 ×1 | 5 | S1-S6（路由层贯穿） |
| BE-B | 后端 ×1 | 5 | S1-S3,S5（存储+Agent+解析） |
| BE-C | 后端 ×1 | 5 | S3-S6（Provider+Skill） |
| **合计** | **4 人** | **20** | |

## 依赖关系

```
BE-A1 (Flask基础) ──┬── BE-A2 (会话路由) ─── FE-1 (会话管理)
                    │
BE-B1 (Storage)  ───┘
                    
BE-A3 (文件路由) ─── BE-B2 (文件存储) ─── BE-B3 (解析引擎) ─── FE-2 (文件上传)

BE-B4 (降级编排) ─── BE-C1 (CoPaw) ─┐
                    BE-C2 (百炼)  ───┤── BE-A4 (问答路由) ─── FE-3 (问答界面)
                                     │
BE-C3 (LLM Manager) ────────────────┘── BE-A5 (模型路由) ─── FE-4 (模型切换)

BE-C4 (Skill Client) ─── BE-B5 (异步调度) ─── FE-5 (深度分析)
```
