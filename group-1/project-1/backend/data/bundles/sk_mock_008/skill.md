# Go 微服务架构实践

## 概述

Go 语言微服务开发全流程指南。基于 gRPC + Protobuf 通信、Consul 服务发现、OpenTelemetry 链路追踪、go-kit 框架搭建生产级微服务体系。

## 快速开始

```bash
# 安装 protoc 编译器
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# 生成代码
protoc --go_out=. --go-grpc_out=. proto/user.proto
```

## 服务定义 (Protobuf)

```protobuf
syntax = "proto3";
package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser(CreateUserRequest) returns (User);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  int64 created_at = 4;
}
```

## 服务实现

```go
type userServer struct {
    pb.UnimplementedUserServiceServer
    repo UserRepository
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(attribute.String("user.id", req.Id))

    user, err := s.repo.FindByID(ctx, req.Id)
    if err != nil {
        return nil, status.Errorf(codes.NotFound, "user not found")
    }
    return toProto(user), nil
}
```

## 架构组件

| 组件 | 技术选型 | 作用 |
|------|----------|------|
| 通信 | gRPC + Protobuf | 高性能 RPC |
| 服务发现 | Consul | 注册与发现 |
| 网关 | Kong / Envoy | API 网关 |
| 追踪 | OpenTelemetry | 分布式追踪 |
| 熔断 | go-kit / Hystrix | 容错保护 |

## 最佳实践

- 每个服务独立数据库（Database per Service）
- 使用 Saga 模式处理分布式事务
- 实现健康检查和优雅关闭
- 统一日志格式（结构化 JSON）
