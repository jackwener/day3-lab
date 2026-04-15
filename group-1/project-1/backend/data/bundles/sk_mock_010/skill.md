# Terraform 基础设施即代码

## 概述

用代码管理云基础设施的完整指南。涵盖多云部署策略、模块化设计、远程状态管理、团队协作工作流，实现基础设施的版本控制和自动化交付。

## 快速开始

```bash
# 安装 Terraform
brew install terraform

# 初始化项目
terraform init
terraform plan
terraform apply
```

## AWS VPC 完整示例

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-east-1a", "ap-east-1b", "ap-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false
}
```

## 模块化设计

```
infrastructure/
├── modules/
│   ├── networking/     # VPC, Subnets, NAT
│   ├── compute/        # EC2, ASG, ALB
│   ├── database/       # RDS, ElastiCache
│   └── monitoring/     # CloudWatch, SNS
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
└── backend.tf          # 远程状态配置
```

## 最佳实践

1. **远程状态**: 使用 S3 + DynamoDB 存储和锁定状态文件
2. **模块版本**: 为每个模块打版本号，环境引用固定版本
3. **变量管理**: 敏感信息使用 Vault 或 AWS Secrets Manager
4. **PR Review**: 在 CI 中自动运行 `terraform plan` 并展示变更
