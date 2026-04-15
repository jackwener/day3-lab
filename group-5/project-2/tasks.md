# 命理测算工具 MVP - 前端任务清单

## 项目信息
- 技术栈: Next.js 14 + TypeScript + Tailwind CSS + Zustand
- 代码目录: `frontend/`

## 任务列表

### TASK-001: 项目初始化与基础架构 [已完成]
- 阶段: S1
- 内容: Next.js 项目搭建、Tailwind 主题配置、TypeScript 类型定义、API 客户端(含 Mock 降级)、Zustand Auth Store
- DoD: 项目可启动，主题色正确，API 客户端可调用 Mock

### TASK-002: 公共 UI 组件库 [已完成]
- 阶段: S1
- 内容: Button(4变体) / Input(底部边框) / Card(标准+玻璃态) / Modal / DatePicker+ShichenPicker / Tabs
- DoD: 深色主题渲染正确，44px 最小点击区域

### TASK-003: 布局与导航组件 [已完成]
- 阶段: S1
- 内容: Header / Sidebar(PC固定+平板折叠) / TabNavigation(移动端底部) / MockBanner / AuthGuard / PageLayout
- DoD: 三端响应式布局正常，Mock 提示可控

### TASK-004: 用户系统 [已完成]
- 阶段: S1
- 内容: 注册页(5字段+Zod) / 登录页(2字段) / 档案页(八字信息+五行条形图)
- DoD: 注册→登录→档案流程跑通

### TASK-005: 个性化黄历日历 [已完成]
- 阶段: S2
- 内容: CalendarCard(宜忌+颜色+方向) / 日期切换(前后7天) / calendarStore
- DoD: 首页黄历展示正常，日期切换流畅

### TASK-006: 运势问询 [已完成]
- 阶段: S3
- 内容: 奇门遁甲(GPS+次数限制) / 大小六壬(3数字输入) / 九宫格可视化 / 成功率圆环
- DoD: 两种起卦方式正常，结果展示完整

### TASK-007: 命格解析 [已完成]
- 阶段: S4
- 内容: 解析本人(读档案) / 解析他人(表单) / 五行雷达图 / 分段结果展示
- DoD: 本人/他人解析流程跑通，无时辰精度提示

### TASK-008: 整体集成与优化 [已完成]
- 阶段: S5
- 内容: ErrorBoundary / 性能优化(字体+代码分割) / 可访问性增强 / 全流程验证
- DoD: Mock 模式全流程可用，build 无报错

## 依赖关系
TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005/006/007(并行) → TASK-008
