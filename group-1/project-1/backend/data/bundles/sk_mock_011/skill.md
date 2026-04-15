# GraphQL API 设计艺术

## 概述

GraphQL Schema 设计哲学与实战指南。深入解决 N+1 问题、实现实时订阅、Federation 分布式架构、权限控制和性能优化。

## 快速开始

```bash
npm install @apollo/server graphql
npx ts-node src/server.ts
# GraphQL Playground: http://localhost:4000/graphql
```

## Schema 设计

```graphql
type Query {
  user(id: ID!): User
  users(filter: UserFilter, pagination: Pagination): UserConnection!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts(first: Int = 10): PostConnection!
  avatar(size: ImageSize = MEDIUM): String
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

## DataLoader 解决 N+1

```typescript
const userLoader = new DataLoader<string, User>(async (ids) => {
  const users = await db.user.findMany({ where: { id: { in: [...ids] } } });
  const userMap = new Map(users.map(u => [u.id, u]));
  return ids.map(id => userMap.get(id)!);
});

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId),
  },
};
```

## 实时订阅

```graphql
type Subscription {
  messageAdded(channelId: ID!): Message!
  userStatusChanged: UserStatus!
}
```

## 安全防护

- **深度限制**: 限制查询嵌套深度（建议 ≤ 7 层）
- **复杂度分析**: 根据字段权重计算查询成本
- **速率限制**: 基于用户的 QPM 限制
- **字段级权限**: 使用 directive 控制字段访问
