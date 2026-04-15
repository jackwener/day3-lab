# CI/CD Pipeline 最佳实践

## 概述

GitHub Actions 和 GitLab CI 自动化部署完整方案。多环境管理、蓝绿发布、金丝雀发布、自动回滚策略，构建可靠的持续交付流水线。

## GitHub Actions 示例

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v4

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: kubectl set image deployment/app app=$IMAGE

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: |
          kubectl set image deployment/app app=$IMAGE
          kubectl rollout status deployment/app --timeout=300s
```

## 发布策略

### 蓝绿部署

```
[用户] → [Load Balancer]
              ├── [Blue: v1.0] ← 当前生产
              └── [Green: v1.1] ← 新版本待切换
```

### 金丝雀发布

```
[用户] → [Ingress Controller]
              ├── 90% → [v1.0 Pods x 9]
              └── 10% → [v1.1 Pods x 1]  ← 逐步增加
```

## 质量门禁

| 检查项 | 阈值 | 阶段 |
|--------|------|------|
| 单元测试通过率 | 100% | PR |
| 代码覆盖率 | ≥ 80% | PR |
| Lint 错误 | 0 | PR |
| 安全扫描 | 无高危 | Build |
| E2E 测试 | 100% | Staging |
