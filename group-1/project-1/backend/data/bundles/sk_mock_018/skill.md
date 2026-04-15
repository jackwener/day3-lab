# AWS 云架构师认证

## 概述

AWS Solutions Architect Associate (SAA-C03) 认证备考全攻略。覆盖 VPC 网络设计、EC2 计算方案、S3 存储策略、Lambda 无服务器、RDS 数据库选型等核心服务。

## 考试概览

| 领域 | 占比 | 重点 |
|------|------|------|
| 弹性架构设计 | 30% | 多 AZ、Auto Scaling |
| 高性能架构 | 28% | CloudFront、ElastiCache |
| 安全架构 | 24% | IAM、KMS、VPC |
| 成本优化 | 18% | 实例选型、存储分层 |

## 核心服务速查

### VPC 网络设计

```
Region: ap-east-1
├── VPC: 10.0.0.0/16
│   ├── Public Subnet 1a:  10.0.1.0/24  → IGW
│   ├── Public Subnet 1b:  10.0.2.0/24  → IGW
│   ├── Private Subnet 1a: 10.0.10.0/24 → NAT GW
│   ├── Private Subnet 1b: 10.0.20.0/24 → NAT GW
│   └── DB Subnet 1a/1b:   10.0.100.0/24 (隔离)
```

### EC2 实例选型

| 系列 | 适用场景 | 示例 |
|------|----------|------|
| t3 | 通用/突发 | Web 服务器 |
| c6g | 计算密集 | 视频编码 |
| r6g | 内存密集 | 数据库缓存 |
| m6g | 均衡 | 应用服务器 |

### S3 存储分层

```
S3 Standard        → 频繁访问 ($0.023/GB)
S3 IA              → 低频访问 ($0.0125/GB)
S3 Glacier Instant → 归档即时取 ($0.004/GB)
S3 Glacier Deep    → 深度归档 ($0.00099/GB)
```

## 架构模式

1. **三层架构**: ALB → EC2 ASG → RDS Multi-AZ
2. **无服务器**: API Gateway → Lambda → DynamoDB
3. **事件驱动**: SNS → SQS → Lambda → S3
4. **微服务**: ECS Fargate + Service Mesh (App Mesh)

## 备考建议

- 刷完官方 Practice Exam + Tutorials Dojo 题库
- 动手实验每个核心服务（Free Tier 足够）
- 理解 Well-Architected Framework 五大支柱
