# 命理测算工具 — 后台服务

## 技术栈

- **运行时**: Node.js 18+ / TypeScript 5+
- **框架**: Express.js 4
- **ORM**: Prisma 5 (SQLite 开发 / PostgreSQL 生产)
- **认证**: JWT (Access Token 24h + Refresh Token 7d)
- **密码**: bcryptjs (salt rounds = 10)
- **校验**: Zod
- **缓存**: 内存 Map（开发）/ Redis 7+（生产）

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
npx prisma migrate dev --name init

# 3. 生成 Prisma Client
npx prisma generate

# 4. 启动开发服务器 (端口 3001)
npm run dev
```

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（热重载） |
| `npm run build` | TypeScript 编译 |
| `npm start` | 生产模式启动 |
| `npm test` | 运行测试 |
| `npm run test:coverage` | 测试覆盖率 |
| `npm run db:migrate` | 数据库迁移 |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | 重置数据库 |

## API 端点

### 认证 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/register` | 用户注册 | — |
| POST | `/login` | 用户登录 | — |
| POST | `/refresh` | 刷新 Token | Cookie |

### 用户 `/api/user`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/profile` | 获取个人档案 | JWT |
| PUT | `/profile` | 创建/更新档案（自动计算八字） | JWT |

### 黄历 `/api/calendar`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/today` | 今日个性化黄历 | JWT |
| GET | `/:date` | 指定日期黄历（±7天） | JWT |

### 运势问询 `/api/divination`

| 方法 | 路径 | 说明 | 认证 | 限流 |
|------|------|------|------|------|
| POST | `/qimen` | 奇门遁甲起卦 | JWT | 每日 1 次 |
| POST | `/liuren` | 大小六壬起卦 | JWT | 每日 5 次 |
| GET | `/history` | 问询历史（分页） | JWT | — |

### 命格解析 `/api/destiny`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/analyze` | 命格深度解析 | JWT |
| GET | `/history` | 解析历史（分页） | JWT |

### 健康检查

```
GET /api/health → { success: true, timestamp: "..." }
```

## 项目结构

```
backend/
├── prisma/
│   └── schema.prisma              # 数据模型（5 张表）
├── src/
│   ├── algorithms/                # 算法引擎
│   │   ├── bazi/                  #   八字排盘 + 五行分析
│   │   ├── calendar/              #   黄历生成
│   │   ├── qimen/                 #   奇门遁甲排盘 + 解读
│   │   ├── liuren/                #   大小六壬起课 + 解读
│   │   └── destiny/               #   命格解析 + 关键词匹配
│   ├── config/                    # 配置
│   │   ├── env.ts                 #   环境变量
│   │   ├── database.ts            #   Prisma 客户端
│   │   └── cache.ts               #   内存缓存
│   ├── controllers/               # 控制器
│   │   ├── authController.ts
│   │   ├── userController.ts
│   │   ├── calendarController.ts
│   │   ├── divinationController.ts
│   │   └── destinyController.ts
│   ├── middleware/                 # 中间件
│   │   ├── auth.ts                #   JWT 认证
│   │   ├── rateLimiter.ts         #   速率限制
│   │   ├── errorHandler.ts        #   全局错误处理
│   │   └── requestLogger.ts       #   请求日志
│   ├── routes/                    # 路由
│   │   ├── index.ts               #   路由汇总
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── calendar.ts
│   │   ├── divination.ts
│   │   └── destiny.ts
│   ├── services/                  # 服务层
│   │   ├── authService.ts         #   JWT 生成/验证
│   │   ├── calendarService.ts     #   黄历生成 + 缓存
│   │   ├── divinationService.ts   #   运势问询编排
│   │   └── destinyService.ts      #   命格解析编排
│   ├── utils/                     # 工具
│   │   ├── encryption.ts          #   密码哈希
│   │   └── validator.ts           #   Zod 校验 schema
│   ├── types/index.ts             # 共享类型
│   ├── app.ts                     # Express 应用
│   └── server.ts                  # 启动入口
├── .env                           # 环境变量（不入库）
├── .env.example                   # 环境变量模板
├── package.json
└── tsconfig.json
```

## 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户账号（邮箱/手机/密码/昵称） |
| `destiny_profiles` | 用户档案（八字/五行/出生信息） |
| `divination_records` | 运势问询记录（奇门/六壬） |
| `daily_calendars` | 每日黄历缓存 |
| `destiny_histories` | 命格解析历史 |

## 环境变量

```env
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
```
