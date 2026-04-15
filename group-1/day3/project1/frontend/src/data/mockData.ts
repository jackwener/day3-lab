import type { SkillSummary, Category, TagItem } from '../types/skill';

/* ---- 作者类型 ---- */
export interface Author {
  name: string;
  avatar: string;
  skill_count: number;
  total_likes: number;
}

/* ---- Mock 作者排行 ---- */
export const mockAuthors: Author[] = [
  { name: '张三丰', avatar: '🧙', skill_count: 15, total_likes: 4520 },
  { name: 'CodeMaster', avatar: '👨‍💻', skill_count: 12, total_likes: 3890 },
  { name: '技术小姐姐', avatar: '👩‍💻', skill_count: 10, total_likes: 3210 },
  { name: 'DevOps老王', avatar: '🦸', skill_count: 8, total_likes: 2780 },
  { name: 'AI研究员', avatar: '🤖', skill_count: 7, total_likes: 2450 },
  { name: '前端艺术家', avatar: '🎨', skill_count: 11, total_likes: 2100 },
  { name: '架构师老李', avatar: '🏗️', skill_count: 6, total_likes: 1890 },
  { name: '数据魔法师', avatar: '🔮', skill_count: 9, total_likes: 1650 },
  { name: '安全专家', avatar: '🛡️', skill_count: 5, total_likes: 1420 },
  { name: '全栈小王子', avatar: '👑', skill_count: 13, total_likes: 1200 },
];

/* ---- Mock 分类 ---- */
export const mockCategories: Category[] = [
  { key: 'frontend', label: '前端开发', count: 8 },
  { key: 'backend', label: '后端开发', count: 6 },
  { key: 'devops', label: 'DevOps', count: 4 },
  { key: 'ai-ml', label: 'AI / ML', count: 5 },
  { key: 'database', label: '数据库', count: 3 },
  { key: 'testing', label: '测试', count: 2 },
  { key: 'security', label: '安全', count: 2 },
  { key: 'mobile', label: '移动开发', count: 3 },
  { key: 'tools', label: '效率工具', count: 4 },
  { key: 'cloud', label: '云原生', count: 3 },
];

/* ---- Mock 标签 ---- */
export const mockTags: TagItem[] = [
  { tag: 'react', count: 45 }, { tag: 'typescript', count: 38 },
  { tag: 'python', count: 35 }, { tag: 'docker', count: 28 },
  { tag: 'nextjs', count: 25 }, { tag: 'vue', count: 22 },
  { tag: 'rust', count: 20 }, { tag: 'go', count: 18 },
  { tag: 'graphql', count: 16 }, { tag: 'redis', count: 15 },
  { tag: 'mongodb', count: 14 }, { tag: 'aws', count: 13 },
  { tag: 'kubernetes', count: 12 }, { tag: 'terraform', count: 11 },
  { tag: 'tailwind', count: 10 }, { tag: 'node', count: 9 },
  { tag: 'ci-cd', count: 8 }, { tag: 'performance', count: 7 },
  { tag: 'design-patterns', count: 6 }, { tag: 'microservices', count: 5 },
];

/* ---- Mock 技能列表 ---- */
export const mockSkills: SkillSummary[] = [
  {
    skill_id: '1', name: 'React 组件设计模式',
    description: '深入理解 React 高阶组件、Render Props、Compound Components、自定义 Hooks 等现代开发最佳实践',
    category: 'frontend', tags: ['react', 'typescript', 'design-patterns'],
    rating_avg: 4.8, rating_count: 156, view_count: 12580, download_count: 3420,
    like_count: 892, favorite_count: 456, hot_score: 95.2, has_bundle: true,
    updated_at: '2024-04-10T08:30:00Z',
  },
  {
    skill_id: '2', name: 'Python FastAPI 全栈实战',
    description: '从零搭建高性能 API 服务，涵盖异步处理、数据库集成、JWT 鉴权、OpenAPI 文档自动生成',
    category: 'backend', tags: ['python', 'performance'],
    rating_avg: 4.7, rating_count: 203, view_count: 15420, download_count: 4210,
    like_count: 1024, favorite_count: 567, hot_score: 93.8, has_bundle: true,
    updated_at: '2024-04-09T14:20:00Z',
  },
  {
    skill_id: '3', name: 'Docker + K8s 生产部署指南',
    description: '容器化应用从开发到生产的完整流程，包含 CI/CD Pipeline、服务编排、监控告警',
    category: 'devops', tags: ['docker', 'kubernetes', 'ci-cd'],
    rating_avg: 4.9, rating_count: 89, view_count: 8760, download_count: 2890,
    like_count: 645, favorite_count: 312, hot_score: 91.5, has_bundle: true,
    updated_at: '2024-04-08T10:15:00Z',
  },
  {
    skill_id: '4', name: 'LLM 应用开发入门',
    description: '大语言模型应用开发实战，涵盖 Prompt Engineering、RAG、Agent 框架、Fine-tuning 策略',
    category: 'ai-ml', tags: ['python', 'performance'],
    rating_avg: 4.6, rating_count: 312, view_count: 23100, download_count: 5670,
    like_count: 1580, favorite_count: 890, hot_score: 98.1, has_bundle: true,
    updated_at: '2024-04-12T09:00:00Z',
  },
  {
    skill_id: '5', name: 'TypeScript 高级类型体操',
    description: '掌握条件类型、映射类型、模板字面量类型等高级特性，写出类型安全的代码',
    category: 'frontend', tags: ['typescript', 'design-patterns'],
    rating_avg: 4.5, rating_count: 178, view_count: 9870, download_count: 2340,
    like_count: 567, favorite_count: 289, hot_score: 87.3, has_bundle: true,
    updated_at: '2024-04-07T16:45:00Z',
  },
  {
    skill_id: '6', name: 'Redis 缓存架构设计',
    description: '从单机到集群的 Redis 方案设计，涵盖缓存穿透/雪崩/击穿的解决方案和分布式锁实现',
    category: 'database', tags: ['redis', 'performance', 'microservices'],
    rating_avg: 4.7, rating_count: 95, view_count: 7650, download_count: 1980,
    like_count: 423, favorite_count: 198, hot_score: 84.6, has_bundle: true,
    updated_at: '2024-04-06T11:30:00Z',
  },
  {
    skill_id: '7', name: 'Next.js 14 全栈开发',
    description: 'App Router、Server Components、Server Actions、ISR/SSG/SSR 混合渲染策略实战',
    category: 'frontend', tags: ['nextjs', 'react', 'typescript'],
    rating_avg: 4.8, rating_count: 234, view_count: 18900, download_count: 4560,
    like_count: 1120, favorite_count: 645, hot_score: 96.7, has_bundle: true,
    updated_at: '2024-04-11T13:20:00Z',
  },
  {
    skill_id: '8', name: 'Go 微服务架构实践',
    description: 'Go 语言微服务开发全流程，gRPC + Protobuf、服务注册发现、链路追踪、熔断降级',
    category: 'backend', tags: ['go', 'microservices', 'performance'],
    rating_avg: 4.6, rating_count: 87, view_count: 6540, download_count: 1670,
    like_count: 345, favorite_count: 178, hot_score: 82.1, has_bundle: true,
    updated_at: '2024-04-05T09:10:00Z',
  },
  {
    skill_id: '9', name: 'Vue 3 + Pinia 企业实战',
    description: 'Vue 3 Composition API 深度使用，Pinia 状态管理、VueRouter 4、Vite 构建优化',
    category: 'frontend', tags: ['vue', 'typescript', 'performance'],
    rating_avg: 4.4, rating_count: 145, view_count: 10230, download_count: 2780,
    like_count: 678, favorite_count: 345, hot_score: 85.9, has_bundle: true,
    updated_at: '2024-04-04T15:30:00Z',
  },
  {
    skill_id: '10', name: 'Terraform 基础设施即代码',
    description: '用代码管理云基础设施，多云部署策略、模块化设计、状态管理和团队协作最佳实践',
    category: 'cloud', tags: ['terraform', 'aws', 'ci-cd'],
    rating_avg: 4.3, rating_count: 67, view_count: 4320, download_count: 1120,
    like_count: 234, favorite_count: 112, hot_score: 76.4, has_bundle: true,
    updated_at: '2024-04-03T10:00:00Z',
  },
  {
    skill_id: '11', name: 'GraphQL API 设计艺术',
    description: 'Schema 设计哲学、N+1 问题解决、实时订阅、Federation 分布式架构',
    category: 'backend', tags: ['graphql', 'node', 'typescript'],
    rating_avg: 4.5, rating_count: 78, view_count: 5430, download_count: 1340,
    like_count: 289, favorite_count: 145, hot_score: 79.8, has_bundle: true,
    updated_at: '2024-04-02T14:45:00Z',
  },
  {
    skill_id: '12', name: 'Rust 系统编程入门',
    description: '所有权系统、生命周期、零成本抽象、并发安全，从入门到实战的 Rust 学习路径',
    category: 'backend', tags: ['rust', 'performance'],
    rating_avg: 4.9, rating_count: 56, view_count: 7890, download_count: 1560,
    like_count: 456, favorite_count: 234, hot_score: 88.2, has_bundle: true,
    updated_at: '2024-04-01T08:20:00Z',
  },
  {
    skill_id: '13', name: 'MongoDB 数据建模',
    description: '文档数据库建模模式，嵌入 vs 引用、聚合管道、索引优化、分片集群设计',
    category: 'database', tags: ['mongodb', 'performance'],
    rating_avg: 4.2, rating_count: 43, view_count: 3210, download_count: 890,
    like_count: 178, favorite_count: 89, hot_score: 71.3, has_bundle: true,
    updated_at: '2024-03-30T12:00:00Z',
  },
  {
    skill_id: '14', name: 'React Native 跨平台开发',
    description: '一套代码构建 iOS 和 Android 应用，导航、原生模块、性能优化、发布上架全流程',
    category: 'mobile', tags: ['react', 'typescript'],
    rating_avg: 4.3, rating_count: 112, view_count: 8900, download_count: 2340,
    like_count: 534, favorite_count: 267, hot_score: 83.5, has_bundle: true,
    updated_at: '2024-03-29T16:30:00Z',
  },
  {
    skill_id: '15', name: 'Web 安全攻防实战',
    description: 'XSS、CSRF、SQL 注入、SSRF 等常见漏洞的攻击手法与防御策略，OWASP Top 10 实践',
    category: 'security', tags: ['performance'],
    rating_avg: 4.8, rating_count: 67, view_count: 5670, download_count: 1890,
    like_count: 389, favorite_count: 201, hot_score: 86.1, has_bundle: true,
    updated_at: '2024-03-28T09:15:00Z',
  },
  {
    skill_id: '16', name: 'Tailwind CSS 高效开发',
    description: '原子化 CSS 实战，自定义设计系统、响应式布局、暗色模式、组件库搭建',
    category: 'frontend', tags: ['tailwind', 'react', 'design-patterns'],
    rating_avg: 4.4, rating_count: 189, view_count: 11200, download_count: 3120,
    like_count: 756, favorite_count: 389, hot_score: 89.4, has_bundle: true,
    updated_at: '2024-03-27T11:40:00Z',
  },
  {
    skill_id: '17', name: 'Jest + Testing Library 测试指南',
    description: '前端单元测试、集成测试最佳实践，TDD 开发流程、Mock 策略、覆盖率优化',
    category: 'testing', tags: ['react', 'typescript', 'node'],
    rating_avg: 4.1, rating_count: 56, view_count: 3450, download_count: 890,
    like_count: 167, favorite_count: 89, hot_score: 68.7, has_bundle: true,
    updated_at: '2024-03-26T14:00:00Z',
  },
  {
    skill_id: '18', name: 'AWS 云架构师认证',
    description: 'AWS SAA 认证备考指南，VPC、EC2、S3、Lambda、RDS 核心服务架构设计',
    category: 'cloud', tags: ['aws', 'terraform'],
    rating_avg: 4.6, rating_count: 134, view_count: 9870, download_count: 2560,
    like_count: 623, favorite_count: 312, hot_score: 87.9, has_bundle: true,
    updated_at: '2024-03-25T08:30:00Z',
  },
  {
    skill_id: '19', name: 'Flutter 精美 UI 开发',
    description: 'Dart 语言 + Flutter 框架，自定义动画、响应式设计、状态管理（Riverpod）、平台适配',
    category: 'mobile', tags: ['design-patterns'],
    rating_avg: 4.3, rating_count: 78, view_count: 5670, download_count: 1340,
    like_count: 312, favorite_count: 156, hot_score: 78.2, has_bundle: true,
    updated_at: '2024-03-24T10:20:00Z',
  },
  {
    skill_id: '20', name: 'Vim/Neovim 高效编辑',
    description: '从入门到精通的 Vim 之道，配置 LSP、Telescope、Treesitter 打造现代化 IDE',
    category: 'tools', tags: ['performance'],
    rating_avg: 4.7, rating_count: 98, view_count: 7890, download_count: 1230,
    like_count: 567, favorite_count: 289, hot_score: 81.4, has_bundle: false,
    updated_at: '2024-03-23T15:00:00Z',
  },
  {
    skill_id: '21', name: 'Prompt Engineering 高级技巧',
    description: '系统化的 Prompt 设计方法论，思维链、Few-shot、Self-consistency、ReAct 框架',
    category: 'ai-ml', tags: ['python'],
    rating_avg: 4.5, rating_count: 267, view_count: 19800, download_count: 4230,
    like_count: 1340, favorite_count: 678, hot_score: 94.3, has_bundle: true,
    updated_at: '2024-04-13T07:00:00Z',
  },
  {
    skill_id: '22', name: 'CI/CD Pipeline 最佳实践',
    description: 'GitHub Actions / GitLab CI 自动化部署，多环境管理、蓝绿发布、金丝雀发布',
    category: 'devops', tags: ['ci-cd', 'docker', 'kubernetes'],
    rating_avg: 4.4, rating_count: 45, view_count: 3890, download_count: 1120,
    like_count: 234, favorite_count: 112, hot_score: 74.6, has_bundle: true,
    updated_at: '2024-03-22T09:30:00Z',
  },
  {
    skill_id: '23', name: 'Node.js 性能调优',
    description: '事件循环深入理解、内存泄漏排查、Worker Threads、Cluster 模式、APM 监控',
    category: 'backend', tags: ['node', 'performance', 'typescript'],
    rating_avg: 4.6, rating_count: 67, view_count: 5430, download_count: 1560,
    like_count: 345, favorite_count: 178, hot_score: 80.3, has_bundle: true,
    updated_at: '2024-03-21T13:45:00Z',
  },
  {
    skill_id: '24', name: 'Stable Diffusion 创作指南',
    description: 'AI 绘画从入门到进阶，ControlNet、LoRA 训练、ComfyUI 工作流、商业应用场景',
    category: 'ai-ml', tags: ['python'],
    rating_avg: 4.7, rating_count: 189, view_count: 14500, download_count: 3890,
    like_count: 1120, favorite_count: 567, hot_score: 92.1, has_bundle: true,
    updated_at: '2024-04-11T10:00:00Z',
  },
];
