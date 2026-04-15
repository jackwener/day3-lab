# Node.js 性能调优

## 概述

Node.js 性能优化全面指南。深入理解事件循环机制、内存泄漏排查方法、Worker Threads 多线程、Cluster 集群模式、APM 监控接入。

## 事件循环深入

```
   ┌───────────────────────────┐
┌─►│           timers          │ ← setTimeout / setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll            │ ← I/O 回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           check           │ ← setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘
```

## 内存泄漏排查

```javascript
// 1. 生成堆快照
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshotStream = v8.writeHeapSnapshot();
  console.log(`Heap snapshot written to: ${snapshotStream}`);
}

// 2. 监控内存使用
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
  });
}, 10000);
```

## Worker Threads

```javascript
const { Worker, isMainThread, parentPort } = require('worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  worker.on('message', (result) => console.log('Result:', result));
  worker.postMessage({ data: heavyData });
} else {
  parentPort.on('message', (msg) => {
    const result = cpuIntensiveTask(msg.data);
    parentPort.postMessage(result);
  });
}
```

## 性能对比

| 优化项 | 优化前 | 优化后 | 提升 |
|--------|--------|--------|------|
| JSON 序列化 | 50ms | 8ms | 6x |
| 数据库连接池 | 200ms | 15ms | 13x |
| 流式处理大文件 | OOM | 50MB RSS | ∞ |
| Cluster 模式 | 5k QPS | 18k QPS | 3.6x |
