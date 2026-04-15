# 基金模拟投资大赛系统

一个完整的基金模拟投资大赛系统，包含用户管理、虚拟资金、基金交易、排行榜、比赛管理等核心功能。

## 技术栈

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite
- **认证**: JWT Token
- **ORM**: SQLAlchemy
- **数据可视化**: ECharts

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Redux Toolkit
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **HTTP客户端**: Axios

## 项目结构

```
fun-invest-contest/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py         # 应用入口
│   │   ├── config.py       # 配置管理
│   │   ├── database.py     # 数据库连接
│   │   ├── models/         # SQLAlchemy 模型
│   │   ├── schemas/        # Pydantic 模型
│   │   ├── routers/        # API 路由
│   │   ├── services/       # 业务逻辑
│   │   └── utils/          # 工具函数
│   └── pyproject.toml      # 项目配置
├── frontend/               # React 前端
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── services/       # API服务
│   │   ├── store/          # 状态管理
│   │   └── types/          # TypeScript类型
│   ├── package.json
│   └── vite.config.ts
└── start.bat              # Windows启动脚本
```

## 功能特性

1. **用户系统**
   - 用户注册/登录
   - JWT认证
   - 个人资料管理

2. **基金数据**
   - 20只模拟基金数据
   - 基金搜索和筛选
   - 历史净值走势
   - 日涨跌幅显示

3. **比赛系统**
   - 创建比赛
   - 参加比赛
   - 比赛状态管理
   - 初始资金配置

4. **交易功能**
   - 买入基金
   - 卖出基金
   - 手续费计算
   - 交易记录

5. **投资组合**
   - 持仓明细
   - 资产分布
   - 收益统计
   - 实时市值计算

6. **排行榜**
   - 比赛内排名
   - 收益率排行
   - 总资产排行

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 18+
- pnpm

### 安装步骤

1. **克隆项目**
```bash
cd fun-invest-contest
```

2. **启动服务（Windows）**
```bash
start.bat
```

或者手动启动：

**后端：**
```bash
cd backend
pip install -e .
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**前端：**
```bash
cd frontend
pnpm install
pnpm dev
```

3. **访问应用**
- 前端页面: http://localhost:5173
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## 默认账号

系统没有预设账号，请通过注册页面创建新用户。

## API接口

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 基金
- `GET /api/funds` - 基金列表
- `GET /api/funds/{id}` - 基金详情
- `GET /api/funds/{id}/chart` - 净值走势

### 比赛
- `GET /api/contests` - 比赛列表
- `POST /api/contests` - 创建比赛
- `POST /api/contests/{id}/join` - 参加比赛

### 交易
- `POST /api/trade/buy` - 买入
- `POST /api/trade/sell` - 卖出
- `GET /api/trade/orders` - 订单列表

### 投资组合
- `GET /api/portfolio/overview` - 组合概览
- `GET /api/portfolio/holdings` - 持仓列表

### 排行榜
- `GET /api/rankings/{contest_id}` - 比赛排行

## 数据说明

系统内置20只模拟基金，包含：
- 股票型基金
- 债券型基金
- 混合型基金
- 货币型基金
- 指数型基金

每只基金都有365天的历史净值数据，使用随机游走算法生成。

## 开发说明

### 后端开发
```bash
cd backend
# 安装依赖
pip install -e ".[dev]"

# 运行开发服务器
python -m uvicorn app.main:app --reload
```

### 前端开发
```bash
cd frontend
# 安装依赖
pnpm install

# 运行开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 许可证

MIT
