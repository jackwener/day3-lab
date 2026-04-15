# MongoDB 数据建模

## 概述

MongoDB 文档数据库建模模式全解析。嵌入 vs 引用决策框架、聚合管道实战、索引优化策略、分片集群设计与运维。

## 快速开始

```bash
# Docker 启动 MongoDB
docker run -d --name mongo -p 27017:27017 mongo:7

# 连接
mongosh "mongodb://localhost:27017"
```

## 建模决策

### 嵌入模式（1:Few）

```javascript
// 用户与地址 — 地址数量有限，一起读取
{
  _id: ObjectId("..."),
  name: "张三",
  addresses: [
    { type: "home", city: "北京", street: "长安街1号" },
    { type: "work", city: "北京", street: "中关村大街" }
  ]
}
```

### 引用模式（1:Many）

```javascript
// 作者与文章 — 文章数量多，独立查询
// authors collection
{ _id: "author1", name: "张三" }

// posts collection
{ _id: "post1", title: "MongoDB入门", author_id: "author1" }
```

## 聚合管道

```javascript
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: startOfMonth } } },
  { $group: {
      _id: "$category",
      totalRevenue: { $sum: "$amount" },
      avgOrder: { $avg: "$amount" },
      count: { $sum: 1 }
  }},
  { $sort: { totalRevenue: -1 } },
  { $limit: 10 }
]);
```

## 索引策略

| 索引类型 | 使用场景 | 示例 |
|----------|----------|------|
| 单字段 | 等值/范围查询 | `{ email: 1 }` |
| 复合索引 | 多条件查询 | `{ category: 1, price: -1 }` |
| 文本索引 | 全文搜索 | `{ title: "text", body: "text" }` |
| TTL 索引 | 自动过期 | `{ createdAt: 1 }, { expireAfterSeconds: 86400 }` |
