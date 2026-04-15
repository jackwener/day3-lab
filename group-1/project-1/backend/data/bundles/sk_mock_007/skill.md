# Next.js 14 全栈开发

## 概述

Next.js 14 App Router 全栈开发实战。深入 Server Components、Server Actions、流式渲染、ISR/SSG/SSR 混合策略，构建高性能全栈 Web 应用。

## 快速开始

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app && npm run dev
```

## App Router 核心

### Server Components（默认）

```tsx
// app/users/page.tsx — 服务端组件，零客户端 JS
async function UsersPage() {
  const users = await db.user.findMany(); // 直接访问数据库
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```

### Server Actions（表单处理）

```tsx
async function createPost(formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  await db.post.create({ data: { title } });
  revalidatePath("/posts");
}

export default function NewPost() {
  return (
    <form action={createPost}>
      <input name="title" required />
      <button type="submit">发布</button>
    </form>
  );
}
```

### 流式渲染 + Suspense

```tsx
import { Suspense } from "react";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<Skeleton />}>
        <AsyncStats />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <AsyncChart />
      </Suspense>
    </div>
  );
}
```

## 渲染策略选择

| 策略 | 缓存 | 适用场景 |
|------|------|----------|
| SSG | 构建时生成 | 博客、文档 |
| ISR | 按需重验证 | 电商商品页 |
| SSR | 每次请求 | 用户仪表盘 |
| CSR | 客户端 | 高交互组件 |

## 性能优化

1. 使用 `next/image` 自动图片优化
2. `next/font` 字体子集化 + 预加载
3. Route Groups 实现按需加载
4. Parallel Routes 并行数据获取
