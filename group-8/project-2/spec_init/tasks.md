# 开发任务清单 — 投研问答助手（M1-QA）

> 基于 spec 01–14 生成 · 技术栈：Flask + JSON 文件存储 · React + Vite · pytest
> 版本：v0.2 · 2026-04-14

## 目录结构约定

对齐 `08` §2 后端分层结构：

```
group-8/likangzi/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app 工厂
│   │   ├── agent_bp.py          # Route 层 — 6 个 API 端点
│   │   ├── agent.py             # Agent 层 — 三级降级编排
│   │   ├── storage.py           # Storage 层 — JSON CRUD
│   │   ├── copaw_bridge.py      # Provider — CoPaw 桥接
│   │   ├── bailian_qa.py        # Provider — 百炼 DashScope
│   │   └── helpers.py           # 工具函数（traceId、时间戳等）
│   ├── data/                    # JSON 数据目录（运行时生成）
│   ├── tests/
│   │   ├── conftest.py          # pytest fixtures
│   │   ├── test_storage.py      # L1 Unit — Storage 层
│   │   ├── test_agent.py        # L1 Unit — Agent 降级
│   │   └── test_api.py          # L2 Integration — API 端点
│   ├── wsgi.py                  # Flask 入口
│   ├── .env.example             # 环境变量模板
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.jsx              # 单文件 SPA（对齐 08 ADR-003）
    │   ├── App.css              # 样式
    │   └── main.jsx             # Vite 入口
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## S0 — 项目脚手架（前置）

### T-S0-01 后端项目初始化

| 项 | 内容 |
|---|---|
| **范围** | 创建 Flask 应用工厂、wsgi 入口、requirements.txt、.env.example |
| **产出文件** | `backend/app/__init__.py`、`backend/wsgi.py`、`backend/requirements.txt`、`backend/.env.example` |
| **DoD** | `python -m flask --app wsgi run --port 5000` 启动无报错；访问任意路径返回 404 |
| **对齐** | `08` §6 部署架构 |

**验收细节：**

- `requirements.txt` 包含：`flask>=3.0`、`python-dotenv`、`requests`、`dashscope`、`pytest`、`pytest-cov`
- `.env.example` 包含占位符：`DASHSCOPE_API_KEY=`、`IRA_COPAW_AUTH_URL=`、`IRA_COPAW_QA_URL=`、`DATA_DIR=./data`
- app 工厂注册蓝图 `agent_bp`，设置 CORS 全开放（教学版）

---

### T-S0-02 前端项目初始化

| 项 | 内容 |
|---|---|
| **范围** | Vite + React 脚手架，配置 API 代理 |
| **产出文件** | `frontend/package.json`、`frontend/vite.config.js`、`frontend/index.html`、`frontend/src/main.jsx`、`frontend/src/App.jsx`、`frontend/src/App.css` |
| **DoD** | `npm run dev` 启动后浏览器显示空白页面；`/api/v1/agent/*` 请求被代理到 `localhost:5000` |
| **对齐** | `08` §3 前端架构、§6 部署架构 |

**验收细节：**

- `vite.config.js` 配置 `server.proxy`：`/api` → `http://localhost:5000`
- React ≥ 18，Vite ≥ 5
- `App.jsx` 先渲染空壳布局（Header + Sidebar + Main + Input Area）

---

### T-S0-03 测试基础设施

| 项 | 内容 |
|---|---|
| **范围** | pytest conftest、Flask test_client fixture、临时 data 目录 |
| **产出文件** | `backend/tests/conftest.py` |
| **DoD** | `python -m pytest tests/ -q` 运行通过（0 tests collected 即可） |
| **对齐** | `13` §一 测试分层 |

**验收细节：**

- fixture `client` 创建 Flask test_client
- fixture `tmp_data_dir` 使用 `tmp_path` 提供隔离的 JSON 数据目录
- fixture `storage` 返回绑定到临时目录的 Storage 实例

---

## S1 — 会话管理（`12` §1 S1）

### T-S1-01 Storage 层 — Session CRUD

| 项 | 内容 |
|---|---|
| **范围** | 实现 `Storage` 类：`__init__`、`create_session`、`get_sessions`、`delete_session`、`update_session` |
| **产出文件** | `backend/app/storage.py` |
| **DoD** | 所有 Storage 会话方法通过单元测试 |
| **对齐** | `10` §2-§3 存储引擎与 Session 实体、§5.1 方法清单、§6 业务逻辑 |

**实现要点：**

- JSON 文件路径：`{DATA_DIR}/sessions.json`（对齐 `10` §2）
- RMW 模式：全量读入 → 修改 → 全量写回，UTF-8 编码，缩进 2 空格
- `__init__(data_dir)` — 目录不存在时自动创建，JSON 文件不存在时初始化为 `[]`
- `create_session(session_id, title="新会话")` → 返回 dict，字段：session_id / title / created_at / updated_at / query_count=0
- `get_sessions()` → 返回全部会话列表
- `delete_session(session_id)` → 删除会话 + **级联删除**其所有 QARecord（调用 `delete_records_by_session`）
- `update_session(session_id, updates)` → 合并更新字段，自动刷新 `updated_at`
- 时间格式：ISO-8601 UTC+Z（如 `2026-04-14T08:30:00Z`）

---

### T-S1-02 Storage 层 — Session 单元测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖 Session CRUD 全部路径 |
| **产出文件** | `backend/tests/test_storage.py`（会话部分） |
| **DoD** | 6 条用例全绿 |
| **对齐** | `13` §三 3.3、`10` §5.1 关联 TC |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-040 | `test_storage_init_creates_dir` | 目录不存在时自动创建，JSON 初始化为空数组 |
| TC-M01-041 | `test_create_session` | 返回 dict 含 session_id/title/created_at/query_count=0 |
| TC-M01-042 | `test_get_sessions` | 创建 2 个后返回长度为 2 的列表 |
| TC-M01-043 | `test_delete_session_cascade` | 删除会话后，关联 QARecord 同步清空 |
| TC-M01-046 | `test_update_session` | 更新 title 后字段生效，updated_at 刷新 |
| TC-M01-048 | `test_delete_nonexistent_session` | 删除不存在的 session_id 不报错或抛预期异常 |

---

### T-S1-03 Route 层 — 会话管理 API（3 个端点）

| 项 | 内容 |
|---|---|
| **范围** | 在 `agent_bp.py` 实现：`GET /sessions`、`POST /sessions`、`DELETE /sessions/<id>` |
| **产出文件** | `backend/app/agent_bp.py` |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §4-§6、§8 参数校验规则 |

**实现要点：**

- 每个响应注入 `traceId`（格式 `tr_{uuid.hex}`，对齐 `07` §3.1）
- `POST /sessions`：title 可选，默认"新会话"，校验 ≤23 字符 → 400 `INVALID_QUERY`；成功返回 201
- `DELETE /sessions/<id>`：校验 UUID 格式 → 400 `INVALID_SESSION_ID`；不存在 → 404 `SESSION_NOT_FOUND`；成功返回 200 + `message` + `deleted_session_id`
- `GET /sessions`：无参数，返回 200 + `sessions[]`
- 错误响应统一格式：`{"error": {"code": "...", "message": "...", "details": {}, "traceId": "..."}}`

---

### T-S1-04 会话管理 API 集成测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖会话 3 个端点的 happy path + 错误路径 |
| **产出文件** | `backend/tests/test_api.py`（会话部分） |
| **DoD** | 6 条用例全绿 |
| **对齐** | `13` §三 3.1 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-020 | `test_get_sessions_empty` | GET /sessions → 200，sessions=[] |
| TC-M01-021 | `test_create_session_default_title` | POST /sessions → 201，含 session_id、title="新会话" |
| TC-M01-022 | `test_create_session_custom_title` | POST /sessions {"title":"测试"} → 201，title="测试" |
| TC-M01-023 | `test_create_session_title_too_long` | title 超 23 字符 → 400 `INVALID_QUERY` |
| TC-M01-024 | `test_delete_session_success` | DELETE → 200，再 GET 列表不含该 session |
| TC-M01-025 | `test_delete_session_not_found` | DELETE 不存在的 ID → 404 `SESSION_NOT_FOUND` |

---

### T-S1-05 前端 — Sidebar 会话管理

| 项 | 内容 |
|---|---|
| **范围** | 在 `App.jsx` 实现 Sidebar 区域：会话列表加载、新建、选中、删除 |
| **产出文件** | `frontend/src/App.jsx`、`frontend/src/App.css` |
| **DoD** | 页面渲染后加载会话列表；点击"+ 新建"创建会话并自动选中；点击 × 弹确认框后删除 |
| **对齐** | `06` §3 Sidebar 会话管理 |

**实现要点：**

- 页面加载时 `useEffect` 调用 `GET /sessions` → 渲染列表 + 默认选中第一个
- 新建 → `POST /sessions` → 插入列表头部 + 自动选中
- 删除 → `window.confirm` 确认 → `DELETE /sessions/<id>` → 从列表移除
- 选中 → 设置 `currentSession`，触发加载该会话的 records

---

## S2 — 问答核心（`12` §1 S2）

### T-S2-01 Storage 层 — QARecord CRUD

| 项 | 内容 |
|---|---|
| **范围** | 实现 `add_record`、`get_records_by_session`、`delete_records_by_session` |
| **产出文件** | `backend/app/storage.py`（追加方法） |
| **DoD** | 单元测试通过 |
| **对齐** | `10` §4 QARecord 实体、§5.2 方法清单、§6 业务逻辑 |

**实现要点：**

- JSON 文件路径：`{DATA_DIR}/qa_records.json`
- `add_record(session_id, query, answer, llm_used, model, response_time_ms, answer_source)` → 生成 `id=rec_{timestamp}`，写入记录 + session.query_count 累加 1 + updated_at 刷新
- **首次问答自动命名**：`query_count` 从 0→1 时，`title = query[:20] + "..."`（对齐 `10` §6）
- `get_records_by_session(session_id)` → 按 session_id 过滤返回列表
- `delete_records_by_session(session_id)` → 删除指定会话全部记录，返回删除条数

---

### T-S2-02 Storage 层 — QARecord 单元测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖记录 CRUD + 业务逻辑 |
| **产出文件** | `backend/tests/test_storage.py`（记录部分追加） |
| **DoD** | 5 条用例全绿 |
| **对齐** | `13` §三 3.3 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-044 | `test_add_record` | 写入成功，session.query_count +1，updated_at 刷新 |
| TC-M01-045 | `test_get_records_by_session` | 返回列表仅含指定 session 的记录 |
| TC-M01-047 | `test_delete_records_by_session` | 返回删除条数，再查为空 |
| TC-M01-049 | `test_first_query_auto_rename` | 首次提问后 session.title = query[:20]+"..." |
| TC-M01-050 | `test_second_query_no_rename` | 第二次提问不再更改 title |

---

### T-S2-03 Agent 层 — 三级降级编排

| 项 | 内容 |
|---|---|
| **范围** | 实现 `CoPawAgent.ask(query, session_id)` 降级链：CoPaw → 百炼 → Demo |
| **产出文件** | `backend/app/agent.py` |
| **DoD** | 单元测试验证三级降级逻辑 |
| **对齐** | `08` §4 三级降级编排 |

**实现要点：**

- 依次尝试：CoPaw（`copaw_bridge.py`）→ 百炼（`bailian_qa.py`）→ Demo（纯字符串拼接）
- 每级失败静默降级（返回 None），不抛异常
- 返回结构：`{"answer": "...", "llm_used": bool, "model": str|None, "response_time_ms": int, "answer_source": "copaw"|"bailian"|"demo"}`
- Demo 模式始终可用，`answer_source="demo"`，`llm_used=False`

---

### T-S2-04 Provider — CoPaw 桥接

| 项 | 内容 |
|---|---|
| **范围** | 实现 CoPaw HTTP 调用封装 |
| **产出文件** | `backend/app/copaw_bridge.py` |
| **DoD** | 未配置环境变量时返回 None；配置后能发送请求 |
| **对齐** | `08` §4 CoPaw 提供商 |

**实现要点：**

- 检测 `IRA_COPAW_AUTH_URL` 和 `IRA_COPAW_QA_URL` 非空
- 超时 20s
- 任何异常返回 None（静默降级）

---

### T-S2-05 Provider — 百炼 DashScope

| 项 | 内容 |
|---|---|
| **范围** | 实现百炼 API 调用封装 |
| **产出文件** | `backend/app/bailian_qa.py` |
| **DoD** | 未配置 `DASHSCOPE_API_KEY` 时返回 None；配置后能调用 |
| **对齐** | `08` §4 百炼提供商 |

**实现要点：**

- 检测 `DASHSCOPE_API_KEY` 非空
- 超时 120s
- 区分多类错误码，失败返回 None

---

### T-S2-06 Agent 层单元测试

| 项 | 内容 |
|---|---|
| **范围** | Mock Provider，验证降级逻辑 |
| **产出文件** | `backend/tests/test_agent.py` |
| **DoD** | 4 条用例全绿 |
| **对齐** | `13` §三 示例 TC-M01-001/004 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-060 | `test_ask_copaw_success` | mock CoPaw 返回成功 → answer_source="copaw"，llm_used=True |
| TC-M01-061 | `test_ask_copaw_fail_bailian_success` | mock CoPaw 返回 None → 降级到百炼 |
| TC-M01-062 | `test_ask_all_fail_demo` | 两级均 None → answer_source="demo"，llm_used=False |
| TC-M01-063 | `test_ask_response_time_recorded` | response_time_ms > 0 |

---

### T-S2-07 Route 层 — POST /ask 端点

| 项 | 内容 |
|---|---|
| **范围** | 在 `agent_bp.py` 实现问答提交端点 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §3 POST /ask |

**实现要点：**

- 参数校验：query 非空 → `EMPTY_QUERY`；query >500 字符 → `INVALID_QUERY`；session_id 非空
- 调用 `agent.ask()` 获取回答
- 调用 `storage.add_record()` 持久化
- 返回 200 + answer / llm_used / model / response_time_ms / answer_source / traceId

---

### T-S2-08 POST /ask 集成测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖问答端点 happy path + 错误路径 |
| **产出文件** | `backend/tests/test_api.py`（问答部分追加） |
| **DoD** | 5 条用例全绿 |
| **对齐** | `13` §三 示例 TC-M01-001~004 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-001 | `test_ask_success` | POST /ask → 200，含 answer、llm_used、traceId |
| TC-M01-002 | `test_ask_empty_query` | 空 query → 400 `EMPTY_QUERY` |
| TC-M01-003 | `test_ask_long_query` | >500 字符 → 400 `INVALID_QUERY` |
| TC-M01-004 | `test_ask_demo_fallback` | 无 API Key → answer_source="demo" |
| TC-M01-005 | `test_ask_missing_session_id` | 缺少 session_id → 400 |

---

### T-S2-09 前端 — 输入区域 + 问答提交

| 项 | 内容 |
|---|---|
| **范围** | 在 `App.jsx` 实现 Input Area + 问答交互 |
| **产出文件** | `frontend/src/App.jsx`（追加） |
| **DoD** | 输入问题 → 点击发送 → 获取回答并渲染在 Main 区域 |
| **对齐** | `06` §5 输入区域 |

**实现要点：**

- textarea 3 行，placeholder "请输入您的问题..."
- 发送按钮：loading 时 disabled + 文案"发送中…"
- 清空按钮
- 提交 `POST /ask { query, session_id }`
- 成功后将新记录追加到 records 列表

---

## S3 — 历史记录与能力探测（`12` §1 S3）

### T-S3-01 Route 层 — GET /sessions/\<id\>/records 端点

| 项 | 内容 |
|---|---|
| **范围** | 实现问答记录查询端点 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §7 |

**实现要点：**

- 校验 session_id UUID 格式 → 400 `INVALID_SESSION_ID`
- 会话不存在 → 404 `SESSION_NOT_FOUND`
- 成功返回 200 + `records[]` + traceId

---

### T-S3-02 问答记录 API 集成测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖有记录 / 无记录 / 会话不存在三种场景 |
| **产出文件** | `backend/tests/test_api.py`（记录部分追加） |
| **DoD** | 3 条用例全绿 |
| **对齐** | `13` §三 3.2 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-030 | `test_get_records_with_data` | 有记录时 → 200，records 含 query/answer/timestamp |
| TC-M01-031 | `test_get_records_empty` | 有会话无记录 → 200，records=[] |
| TC-M01-032 | `test_get_records_session_not_found` | 会话不存在 → 404 `SESSION_NOT_FOUND` |

---

### T-S3-03 Route 层 — GET /capabilities 端点

| 项 | 内容 |
|---|---|
| **范围** | 实现能力探测端点 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 返回 CoPaw/百炼配置状态 |
| **对齐** | `09` §1 端点 #1 |

**实现要点：**

- 检测环境变量是否配置
- 返回 `{ traceId, copaw_configured: bool, bailian_configured: bool, model: str|null }`
- 延迟 < 200ms（对齐 `07` §1.1）

---

### T-S3-04 前端 — Main 三态渲染

| 项 | 内容 |
|---|---|
| **范围** | 实现 Main 内容区的 A/B/C 三种状态 |
| **产出文件** | `frontend/src/App.jsx`（追加） |
| **DoD** | 无会话显示空状态；有会话无记录显示常见问题；有记录显示对话历史 |
| **对齐** | `06` §4 Main 内容区 |

**三态规则：**

| 状态 | 条件 | 显示内容 |
|------|------|----------|
| A 空状态 | `currentSession === null` | "请创建或选择一个会话开始" |
| B 常见问题 | 有会话 && records=[] | 4–6 个常见问题卡片网格，点击自动填充并发送 |
| C 对话历史 | records.length > 0 | 按时间升序渲染问答卡片（query + answer + 来源标签 + 耗时 + 时间戳） |

**来源标签颜色（对齐 `06` §4.1）：**

| answer_source | 显示文本 | 样式 |
|---------------|----------|------|
| `copaw` | CoPaw | 绿色标签 |
| `bailian` | 百炼 | 蓝色标签 |
| `demo` | 离线演示 | 灰色标签 |

---

### T-S3-05 前端 — Header 能力状态芯片

| 项 | 内容 |
|---|---|
| **范围** | 页面加载时调用 `GET /capabilities`，渲染能力状态芯片 |
| **产出文件** | `frontend/src/App.jsx`（追加） |
| **DoD** | Header 正确显示当前 LLM 配置状态 |
| **对齐** | `06` §2 Header 区域 |

**芯片显示规则（对齐 `06` §2.1）：**

| 条件 | 芯片显示 |
|------|----------|
| `caps.copaw_configured = true` | CoPaw 桥接 |
| `caps.bailian_configured = true` | 百炼 · {model} |
| 两者均 false | 离线演示 |

---

### T-S3-06 前端 — 错误处理

| 项 | 内容 |
|---|---|
| **范围** | 统一错误提示展示 |
| **产出文件** | `frontend/src/App.jsx`（追加） |
| **DoD** | 各类错误码均有对应的用户友好提示 |
| **对齐** | `06` §6 错误处理 |

**错误映射：**

| error.code | 前端提示 |
|------------|----------|
| `EMPTY_QUERY` | 请输入问题 |
| `INVALID_QUERY` | 问题过长 |
| `SESSION_NOT_FOUND` | 会话不存在（自动刷新列表） |
| `INVALID_SESSION_ID` | 会话 ID 格式错误 |
| 网络异常 / 5xx | 服务异常，请稍后重试 |

---

## S4 — 收口与发布准备（`12` §1 S4）

### T-S4-01 helpers 工具函数

| 项 | 内容 |
|---|---|
| **范围** | 提取公用函数：traceId 生成、统一成功/错误响应构造 |
| **产出文件** | `backend/app/helpers.py` |
| **DoD** | agent_bp.py 中所有 traceId 和响应构造改为调用 helpers |
| **对齐** | `07` §3.1 链路追踪、`09` §2 统一响应规范 |

**要点：**
- `make_trace_id()` → `"tr_" + uuid.uuid4().hex`
- `ok(data: dict, status=200)` → 注入 traceId 并返回 Response
- `err(code: str, message: str, details: dict, status: int)` → 统一错误响应

---

### T-S4-02 Contract 测试 — 响应体结构校验

| 项 | 内容 |
|---|---|
| **范围** | 验证所有 6 个端点的响应字段名、类型与 `09` 契约一致 |
| **产出文件** | `backend/tests/test_api.py`（contract 部分追加） |
| **DoD** | 6 条 contract 用例全绿 |
| **对齐** | `13` §一 L3 Contract 层 |

**校验要点：**

| 端点 | 必含字段（类型） |
|------|-----------------|
| GET /capabilities | `traceId`(str)、`copaw_configured`(bool)、`bailian_configured`(bool) |
| POST /ask | `traceId`(str)、`answer`(str)、`llm_used`(bool)、`model`(str\|null)、`response_time_ms`(int)、`answer_source`(str) |
| GET /sessions | `traceId`(str)、`sessions`(list) |
| POST /sessions | `traceId`(str)、`session_id`(str)、`title`(str)、`created_at`(str)、`query_count`(int) |
| DELETE /sessions/<id> | `traceId`(str)、`message`(str)、`deleted_session_id`(str) |
| GET /sessions/<id>/records | `traceId`(str)、`records`(list) |

---

### T-S4-03 前端样式完善

| 项 | 内容 |
|---|---|
| **范围** | 完善 App.css，布局对齐 `06` §1 结构图 |
| **产出文件** | `frontend/src/App.css` |
| **DoD** | 左侧 Sidebar 固定宽度 240px，右侧 Main 自适应；移动端基本可用 |
| **对齐** | `06` §1 页面总体布局 |

---

77=77777777777777777777777777777777777770777777777777777777-7777777777### T-S4-0

| 项 | 内容 |
|---|---|
| **范围** | 创建种子数据脚本，生成 ≥ 10 条演示数据 |
| **产出文件** | `backend/seed.py` |
| **DoD** | 运行后 data/ 目录生成 sessions.json + qa_records.json，含 3 个会话共 10+ 条记录 |
| **对齐** | `04` §6 "种子数据 ≥ 10 条" |

---

### T-S4-05 质量门禁全通

| 项 | 内容 |
|---|---|
| **范围** | 确保所有质量门禁通过 |
| **产出文件** | 无新增文件 |
| **DoD** | 下列 4 项全绿 |
| **对齐** | `13` §四 质量门禁 |

**门禁检查：**

| Gate | 命令 | 标准 |
|------|------|------|
| G-LINT | `black --check backend/` 且 `flake8 backend/` | 零错误 |
| G-UNIT | `pytest tests/test_storage.py tests/test_agent.py -q` | 全绿 |
| G-INT | `pytest tests/test_api.py -q` | 全绿 |
| G-PERF | 检查所有 response_time_ms | < 5000ms |

---

### T-S4-06 启动脚本` vrb=

| 项 | 内容 |
|---|---|
| **范围** | 创建一键启动脚本 |
| **产出文件** | `start.bat` |
| **DoD** | 运行后同时启动前后端，浏览器打开 `localhost:5173` 可正常使用 |
| **对齐** | `03` §6 立项前置条件、`08` §6 部署架构 |


---

## S5 — 研报上传与解析（`12` §1 S3）

### T-S5-01 Storage 层 — Report CRUD

| 项 | 内容 |
|---|---|
| **范围** | 在 `storage.py` 新增 Report 实体 CRUD：`save_report`、`get_reports`、`get_report_by_id`、`delete_report` |
| **产出文件** | `backend/app/storage.py`（追加方法） |
| **DoD** | 单元测试通过 |
| **对齐** | `10` §5 Report 实体、§5.3 方法清单 |

**实现要点：**

- JSON 文件路径：`{DATA_DIR}/reports.json`
- Report 实体字段：report_id, session_id, file_name, file_type(pdf/html), file_size, file_path, uploaded_at, status(pending/parsed/failed), extracted_data(rating/target_price/key_points/summary/raw_text)
- `save_report(report)` → 写入 reports.json
- `get_reports(session_id=None)` → 可选按 session 过滤
- `get_report_by_id(report_id)` → 返回单条或 None
- `delete_report(report_id)` → 删除记录

---

### T-S5-02 Storage 层 — Report 单元测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖 Report CRUD 全路径 |
| **产出文件** | `backend/tests/test_storage.py`（追加） |
| **DoD** | 5 条用例全绿 |
| **对齐** | `13` §三 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-070 | `test_save_report` | 写入成功，字段完整 |
| TC-M01-071 | `test_get_reports_all` | 返回全部报告列表 |
| TC-M01-072 | `test_get_reports_by_session` | 按 session_id 过滤 |
| TC-M01-073 | `test_get_report_by_id` | 返回单条；不存在返回 None |
| TC-M01-074 | `test_delete_report` | 删除后查询为 None |

---

### T-S5-03 研报解析模块

| 项 | 内容 |
|---|---|
| **范围** | 实现 `report_parser.py`：PDF 和 HTML 研报解析，提取评级、目标价、核心观点 |
| **产出文件** | `backend/app/report_parser.py` |
| **DoD** | 单元测试验证 PDF 和 HTML 解析逻辑 |
| **对齐** | `08` §9 ADR-004（pdfplumber）、`04` §3.2 研报解析功能 |

**实现要点：**

- `parse_report(file_path, file_type)` → 返回 extracted_data dict
- PDF 解析使用 pdfplumber 提取文本
- HTML 解析使用 BeautifulSoup
- 关键信息提取：评级(rating)、目标价(target_price)、核心观点(key_points)、摘要(summary)、原文(raw_text)
- 解析超时限制 60s（对齐 `07` 研报 SLO）
- 解析失败返回 status="failed" + error_message
- **依赖项**：`requirements.txt` 新增 `pdfplumber` 和 `beautifulsoup4`

---

### T-S5-04 研报解析模块单元测试

| 项 | 内容 |
|---|---|
| **范围** | Mock 文件内容，测试解析逻辑 |
| **产出文件** | `backend/tests/test_report_parser.py` |
| **DoD** | 4 条用例全绿 |
| **对齐** | `13` §三 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-075 | `test_parse_pdf_success` | PDF 文件解析成功，含 raw_text |
| TC-M01-076 | `test_parse_html_success` | HTML 文件解析成功 |
| TC-M01-077 | `test_parse_invalid_file` | 无效文件 → status="failed" |
| TC-M01-078 | `test_extract_key_info` | 提取评级/目标价/核心观点字段存在 |

---

### T-S5-05 Route 层 — 研报上传端点 POST /reports/upload

| 项 | 内容 |
|---|---|
| **范围** | 在 `agent_bp.py` 实现研报文件上传与解析端点 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §7 POST /reports/upload |

**实现要点：**

- 接受 multipart/form-data，字段：file（必需）、session_id（可选）
- 文件类型校验：仅 PDF/HTML → 400 `INVALID_FILE_TYPE`
- 文件大小校验：≤50MB → 400 `FILE_TOO_LARGE`
- 保存文件到 `{DATA_DIR}/uploads/`
- 调用 `report_parser.parse_report()` 解析
- 调用 `storage.save_report()` 持久化
- 返回 201 + report_id + extracted_data + traceId

---

### T-S5-06 Route 层 — 研报查询端点 GET /reports 和 GET /reports/{id}

| 项 | 内容 |
|---|---|
| **范围** | 实现研报列表和详情查询 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §8-§9 |

**实现要点：**

- `GET /reports?session_id=xxx` → 返回 200 + reports[] + traceId
- `GET /reports/{id}` → 返回 200 + report 详情 + traceId；不存在 → 404 `REPORT_NOT_FOUND`

---

### T-S5-07 研报 API 集成测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖研报上传、列表、详情端点 |
| **产出文件** | `backend/tests/test_api.py`（追加） |
| **DoD** | 6 条用例全绿 |
| **对齐** | `13` §三 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-080 | `test_upload_report_success` | POST /reports/upload PDF → 201，含 report_id |
| TC-M01-081 | `test_upload_invalid_type` | 上传 .txt → 400 `INVALID_FILE_TYPE` |
| TC-M01-082 | `test_upload_too_large` | 超 50MB → 400 `FILE_TOO_LARGE` |
| TC-M01-083 | `test_get_reports_list` | GET /reports → 200，reports[] |
| TC-M01-084 | `test_get_report_detail` | GET /reports/{id} → 200，含 extracted_data |
| TC-M01-085 | `test_get_report_not_found` | GET /reports/xxx → 404 |

---

### T-S5-08 前端 — 研报上传与展示

| 项 | 内容 |
|---|---|
| **范围** | 在 App.jsx 新增研报上传区域和解析结果展示 |
| **产出文件** | `frontend/src/App.jsx`、`frontend/src/App.css`（追加） |
| **DoD** | 可上传文件、显示解析结果（评级/目标价/核心观点） |
| **对齐** | `06` §9 研报上传区、§10 关键信息展示 |

**实现要点：**

- 拖拽/点击上传区域，支持 PDF/HTML
- 上传中显示进度条
- 解析完成后展示：文件名、评级、目标价、核心观点列表、摘要
- 解析失败显示错误提示

---

## S6 — 研报对比（`12` §1 S4）

### T-S6-01 Route 层 — 研报对比端点 POST /reports/compare

| 项 | 内容 |
|---|---|
| **范围** | 实现多研报对比端点 |
| **产出文件** | `backend/app/agent_bp.py`（追加） |
| **DoD** | 集成测试通过 |
| **对齐** | `09` §10 POST /reports/compare |

**实现要点：**

- 参数：report_ids[]（至少 2 个，最多 5 个）
- 校验 report_id 存在性 → 404 `REPORT_NOT_FOUND`
- 对比维度：评级、目标价、核心观点
- 返回 200 + comparison_table + traceId
- 响应时间 < 120s（对齐 `07` 研报对比 SLO）

---

### T-S6-02 研报对比集成测试

| 项 | 内容 |
|---|---|
| **范围** | 覆盖对比端点 |
| **产出文件** | `backend/tests/test_api.py`（追加） |
| **DoD** | 3 条用例全绿 |
| **对齐** | `13` §三 |

**用例清单：**

| TC-ID | 测试函数 | 断言要点 |
|-------|----------|----------|
| TC-M01-090 | `test_compare_reports_success` | 2 份研报 → 200，含 comparison_table |
| TC-M01-091 | `test_compare_insufficient_reports` | 仅 1 个 ID → 400 |
| TC-M01-092 | `test_compare_report_not_found` | 含不存在的 ID → 404 |

---

### T-S6-03 前端 — 研报对比展示

| 项 | 内容 |
|---|---|
| **范围** | 在 App.jsx 新增研报对比区域 |
| **产出文件** | `frontend/src/App.jsx`、`frontend/src/App.css`（追加） |
| **DoD** | 选择多份研报后展示对比表格 |
| **对齐** | `06` §11 研报对比区 |

**实现要点：**

- 勾选 2-5 份研报 → 点击"对比"按钮
- 调用 POST /reports/compare
- 展示对比表格：行=对比维度（评级/目标价/核心观点），列=各研报
- 高亮差异项

---

### T-S6-04 研报功能质量门禁

| 项 | 内容 |
|---|---|
| **范围** | 确保研报相关所有测试通过 |
| **产出文件** | 无新增文件 |
| **DoD** | 研报相关 18 条测试全绿 |
| **对齐** | `13` §四 质量门禁 |

**门禁检查：**

| Gate | 命令 | 标准 |
|------|------|------|
| G-REPORT-UNIT | `pytest tests/test_storage.py tests/test_report_parser.py -q` | 全绿 |
| G-REPORT-INT | `pytest tests/test_api.py -k report -q` | 全绿 |
| G-REPORT-PERF | 检查研报上传解析响应时间 | < 60s |
| G-COMPARE-PERF | 检查研报对比响应时间 | < 120s |

---

## 任务依赖关系

```
S0-01 ──┬── S1-01 ── S1-02
        │      └──── S1-03 ── S1-04 ──────── S2-07 ── S2-08
        │                                       ↑
S0-02 ──┤                          S2-03 ───────┤
        │                         ↗      ↘      │
S0-03 ──┘                   S2-04        S2-05  │
                                                 │
        S2-01 ── S2-02 ─────────────────────────┘
                                                 │
        S1-05 ──────── S2-09 ── S3-04 ─────────┐
                                  ↑              │
        S3-01 ── S3-02 ──────────┘         S3-05 S3-06
                                  
S4-01  S4-02  S4-03  S4-04  S4-05  S4-06（可并行推进）

S5-01 ── S5-02
S5-03 ── S5-04
S5-01 + S5-03 ── S5-05 ── S5-07
S5-01 + S5-03 ── S5-06 ── S5-07
S5-08（依赖 S5-05 + S5-06）
S6-01（依赖 S5-05）── S6-02
S6-03（依赖 S6-01 + S5-08）
S6-04（依赖 S5-07 + S6-02）
```

---

## 任务总览

| 阶段 | 任务数 | 后端 | 前端 | 测试 |
|------|--------|------|------|------|
| **S0** 脚手架 | 3 | 1 | 1 | 1 |
| **S1** 会话管理 | 5 | 2 | 1 | 2 |
| **S2** 问答核心 | 9 | 5 | 1 | 3 |
| **S3** 历史与能力 | 6 | 2 | 3 | 1 |
| **S4** 收口发布 | 6 | 3 | 1 | 2 |
| **S5** 研报上传解析 | 8 | 5 | 1 | 2 |
| **S6** 研报对比 | 4 | 1 | 1 | 2 |
| **合计** | **41** | **19** | **9** | **13** |

---

## 测试用例总索引

| TC-ID | 所在文件 | 层级 | 关联端点/方法 | 关联 REQ |
|-------|----------|------|--------------|---------|
| TC-M01-001 | test_api.py | L2 Integration | POST /ask | REQ-002 |
| TC-M01-002 | test_api.py | L2 Integration | POST /ask | REQ-005 |
| TC-M01-003 | test_api.py | L2 Integration | POST /ask | REQ-005 |
| TC-M01-004 | test_api.py | L2 Integration | POST /ask（降级） | REQ-003 |
| TC-M01-005 | test_api.py | L2 Integration | POST /ask | REQ-005 |
| TC-M01-020 | test_api.py | L2 Integration | GET /sessions | REQ-001 |
| TC-M01-021 | test_api.py | L2 Integration | POST /sessions | REQ-001 |
| TC-M01-022 | test_api.py | L2 Integration | POST /sessions | REQ-001 |
| TC-M01-023 | test_api.py | L2 Integration | POST /sessions | REQ-005 |
| TC-M01-024 | test_api.py | L2 Integration | DELETE /sessions | REQ-001 |
| TC-M01-025 | test_api.py | L2 Integration | DELETE /sessions | REQ-005 |
| TC-M01-030 | test_api.py | L2 Integration | GET /records | REQ-003 |
| TC-M01-031 | test_api.py | L2 Integration | GET /records | REQ-003 |
| TC-M01-032 | test_api.py | L2 Integration | GET /records | REQ-005 |
| TC-M01-040 | test_storage.py | L1 Unit | Storage.__init__ | — |
| TC-M01-041 | test_storage.py | L1 Unit | create_session | REQ-001 |
| TC-M01-042 | test_storage.py | L1 Unit | get_sessions | REQ-001 |
| TC-M01-043 | test_storage.py | L1 Unit | delete_session（级联） | REQ-001 |
| TC-M01-044 | test_storage.py | L1 Unit | add_record | REQ-002 |
| TC-M01-045 | test_storage.py | L1 Unit | get_records_by_session | REQ-003 |
| TC-M01-046 | test_storage.py | L1 Unit | update_session | — |
| TC-M01-047 | test_storage.py | L1 Unit | delete_records_by_session | REQ-001 |
| TC-M01-048 | test_storage.py | L1 Unit | delete_session（不存在） | — |
| TC-M01-049 | test_storage.py | L1 Unit | add_record（首次命名） | REQ-002 |
| TC-M01-050 | test_storage.py | L1 Unit | add_record（非首次） | REQ-002 |
| TC-M01-060 | test_agent.py | L1 Unit | Agent.ask（CoPaw 成功） | REQ-003 |
| TC-M01-061 | test_agent.py | L1 Unit | Agent.ask（降级百炼） | REQ-003 |
| TC-M01-062 | test_agent.py | L1 Unit | Agent.ask（降级 Demo） | REQ-003 |
| TC-M01-063 | test_agent.py | L1 Unit | Agent.ask（耗时） | REQ-003 |
| TC-M01-070 | test_storage.py | L1 Unit | save_report | — |
| TC-M01-071 | test_storage.py | L1 Unit | get_reports（全部） | — |
| TC-M01-072 | test_storage.py | L1 Unit | get_reports（按 session） | — |
| TC-M01-073 | test_storage.py | L1 Unit | get_report_by_id | — |
| TC-M01-074 | test_storage.py | L1 Unit | delete_report | — |
| TC-M01-075 | test_report_parser.py | L1 Unit | parse_report（PDF） | REQ-006 |
| TC-M01-076 | test_report_parser.py | L1 Unit | parse_report（HTML） | REQ-006 |
| TC-M01-077 | test_report_parser.py | L1 Unit | parse_report（无效文件） | REQ-006 |
| TC-M01-078 | test_report_parser.py | L1 Unit | extract_key_info | REQ-006 |
| TC-M01-080 | test_api.py | L2 Integration | POST /reports/upload | REQ-006 |
| TC-M01-081 | test_api.py | L2 Integration | POST /reports/upload（类型错误） | REQ-006 |
| TC-M01-082 | test_api.py | L2 Integration | POST /reports/upload（文件过大） | REQ-006 |
| TC-M01-083 | test_api.py | L2 Integration | GET /reports | REQ-006 |
| TC-M01-084 | test_api.py | L2 Integration | GET /reports/{id} | REQ-006 |
| TC-M01-085 | test_api.py | L2 Integration | GET /reports/{id}（不存在） | REQ-006 |
| TC-M01-090 | test_api.py | L2 Integration | POST /reports/compare | REQ-007 |
| TC-M01-091 | test_api.py | L2 Integration | POST /reports/compare（不足） | REQ-007 |
| TC-M01-092 | test_api.py | L2 Integration | POST /reports/compare（不存在） | REQ-007 |

---

| 版本 | 日期 | 说明 |
|------|------|------|
| v0.1 | 2026-04-14 | 初版生成，基于 spec 01–14 |
| v0.2 | 2026-04-14 | 追加 S5 研报上传解析、S6 研报对比任务 |
