# Docker + K8s 生产部署指南

## 概述

容器化应用从开发到生产的完整解决方案。涵盖 Dockerfile 最佳实践、K8s 资源编排、Helm Charts、CI/CD Pipeline 集成、监控告警体系搭建。

## 快速开始

```bash
# 构建镜像
docker build -t myapp:latest .

# 本地 K8s 测试
minikube start
kubectl apply -f k8s/

# Helm 部署
helm install myapp ./charts/myapp
```

## Dockerfile 最佳实践

```dockerfile
# 多阶段构建 — 最终镜像仅 ~25MB
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
RUN addgroup -g 1001 app && adduser -u 1001 -G app -s /bin/sh -D app
USER app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## K8s 资源清单

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        resources:
          requests: { cpu: 100m, memory: 128Mi }
          limits:   { cpu: 500m, memory: 512Mi }
        livenessProbe:
          httpGet: { path: /health, port: 3000 }
        readinessProbe:
          httpGet: { path: /ready, port: 3000 }
```

## 监控方案

- **Prometheus** — 指标采集
- **Grafana** — 可视化看板
- **AlertManager** — 告警通知
- **Loki** — 日志聚合

## 发布策略

| 策略 | 适用场景 | 风险等级 |
|------|----------|----------|
| 滚动更新 | 日常发布 | 低 |
| 蓝绿部署 | 重大版本 | 中 |
| 金丝雀发布 | 高风险变更 | 低 |
