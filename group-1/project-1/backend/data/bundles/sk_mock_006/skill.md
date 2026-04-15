# Redis 缓存架构设计

## 概述

从单机到集群的 Redis 全面解决方案。涵盖缓存穿透/雪崩/击穿的防护策略、分布式锁实现、消息队列、延迟队列、限流器等高频使用场景。

## 快速开始

```bash
# Docker 启动 Redis
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 连接测试
redis-cli ping  # → PONG
```

## 缓存策略

### 缓存穿透防护

```python
def get_user(user_id: str):
    # 1. 查缓存
    cached = redis.get(f"user:{user_id}")
    if cached == "NULL":  # 空值标记
        return None
    if cached:
        return json.loads(cached)

    # 2. 布隆过滤器预判
    if not bloom_filter.exists(user_id):
        return None

    # 3. 查数据库
    user = db.query(User).get(user_id)
    if user is None:
        redis.setex(f"user:{user_id}", 60, "NULL")  # 缓存空值
        return None

    redis.setex(f"user:{user_id}", 3600, user.json())
    return user
```

### 分布式锁 (Redlock)

```python
import redis
lock = redis.lock("resource:order:123", timeout=10)
if lock.acquire(blocking_timeout=5):
    try:
        process_order()
    finally:
        lock.release()
```

## 集群拓扑

| 模式 | 节点数 | 数据分片 | 适用场景 |
|------|--------|----------|----------|
| 单机 | 1 | 否 | 开发/小型项目 |
| 主从 | 2+ | 否 | 读多写少 |
| 哨兵 | 3+ | 否 | 高可用 |
| Cluster | 6+ | 是 | 大规模数据 |

## 监控指标

- `used_memory` — 内存使用率
- `hit_rate` — 缓存命中率 (目标 > 95%)
- `connected_clients` — 连接数
- `keyspace_misses` — 未命中次数
