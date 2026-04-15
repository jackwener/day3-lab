# 研报合规稽核系统 - 后端服务

基于 Flask 的研报合规稽核系统后端服务，提供研报上传、规则审核、AI审核、报告导出等功能。

## 技术栈

- **框架**: Flask 3.0+
- **数据库**: SQLAlchemy + SQLite/PostgreSQL
- **API文档**: Flasgger (Swagger UI)
- **AI服务**: 阿里云百炼 (DashScope API)
- **文件处理**: python-docx, PyPDF2, pdfplumber, reportlab

## 项目结构

```
backend/
├── app/
│   ├── models/          # 数据模型
│   │   ├── review.py    # 审核记录模型
│   │   ├── issue.py     # 问题记录模型
│   │   └── rule.py      # 规则模型
│   ├── routes/          # API路由
│   │   ├── review_bp.py # 审核相关接口
│   │   ├── rule_bp.py   # 规则管理接口
│   │   └── dashboard_bp.py # 仪表盘接口
│   ├── services/        # 业务逻辑
│   │   ├── review_service.py  # 审核服务
│   │   ├── rule_service.py    # 规则服务
│   │   ├── file_service.py    # 文件处理服务
│   │   ├── export_service.py  # 报告导出服务
│   │   └── ai_service.py      # AI审核服务
│   ├── utils/           # 工具函数
│   │   ├── response.py  # 响应格式化
│   │   ├── validators.py # 参数校验
│   │   └── errors.py    # 错误处理
│   ├── config.py        # 配置管理
│   └── extensions.py    # Flask扩展
├── tests/               # 测试文件
├── uploads/             # 上传文件目录
├── requirements.txt     # 依赖列表
├── .env.example         # 环境变量示例
└── wsgi.py              # 应用入口
```

## 快速开始

### 1. 创建虚拟环境

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. 安装依赖

```powershell
pip install -r requirements.txt
```

### 3. 配置环境变量

```powershell
copy .env.example .env
```

编辑 `.env` 文件，配置必要参数：

```env
# Flask
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=sqlite:///report_audit.db

# File Upload
UPLOAD_FOLDER=uploads

# AI Service (可选)
DASHSCOPE_API_KEY=your-dashscope-api-key
AI_MODEL=qwen-plus
```

### 4. 启动服务

```powershell
python wsgi.py
```

服务将在 `http://localhost:5000` 启动。

### 5. 访问API文档

启动后访问 `http://localhost:5000/apidocs` 查看Swagger API文档。

## API 接口

### 审核模块 (Reviews)

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/v1/reviews` | 提交审核 |
| GET | `/api/v1/reviews` | 审核历史列表 |
| GET | `/api/v1/reviews/<id>` | 获取审核详情 |
| GET | `/api/v1/reviews/<id>/status` | 获取审核状态 |
| GET | `/api/v1/reviews/<id>/export` | 导出审核报告 |

### 规则模块 (Rules)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/rules` | 获取规则列表 |
| PATCH | `/api/v1/rules/<id>` | 更新规则状态 |

### 仪表盘模块 (Dashboard)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/v1/dashboard/stats` | 获取统计数据 |
| GET | `/api/v1/dashboard/trend` | 获取近7日趋势 |
| GET | `/api/v1/dashboard/top-issues` | 获取常见问题TOP5 |

## 审核模式

系统支持三种审核模式：

| 模式 | 说明 |
|------|------|
| `rule` | 纯规则审核，基于预设规则进行检查 |
| `ai` | 纯AI审核，使用大模型进行智能分析 |
| `combined` | 综合审核，规则+AI双重检查 |

## 支持的研报类型

- 日报
- 周报
- 深度研究
- 首次覆盖
- 行业报告

## 支持的文件格式

- PDF (`.pdf`)
- Word (`.docx`, `.doc`)

最大文件大小: 50MB

## 环境配置说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `SECRET_KEY` | 是 | - | Flask密钥 |
| `DATABASE_URL` | 否 | `sqlite:///report_audit.db` | 数据库连接串 |
| `UPLOAD_FOLDER` | 否 | `uploads` | 上传文件目录 |
| `DASHSCOPE_API_KEY` | 否 | - | 阿里云百炼API密钥 |
| `AI_MODEL` | 否 | `qwen-plus` | AI模型名称 |

## 运行测试

```powershell
pytest
```

带覆盖率报告：

```powershell
pytest --cov=app tests/
```

## 生产部署

使用 Gunicorn 部署：

```powershell
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

建议生产环境使用 PostgreSQL 数据库：

```env
DATABASE_URL=postgresql://user:password@localhost:5432/report_audit
```

## 许可证

MIT License
