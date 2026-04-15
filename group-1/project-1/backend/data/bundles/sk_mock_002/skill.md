# Python FastAPI 全栈实战

## 概述

从零搭建生产级 FastAPI 服务，涵盖异步处理、SQLAlchemy 集成、JWT 鉴权、自动生成 OpenAPI 文档。包含完整的项目模板和部署方案。

## 快速开始

```bash
# 创建项目
pip install cookiecutter
cookiecutter gh:skillhub/fastapi-template

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

## 项目结构

```
app/
├── api/
│   ├── v1/
│   │   ├── endpoints/
│   │   │   ├── auth.py      # 认证接口
│   │   │   ├── users.py     # 用户管理
│   │   │   └── items.py     # 业务接口
│   │   └── router.py
├── core/
│   ├── config.py             # 配置管理
│   ├── security.py           # JWT + OAuth2
│   └── database.py           # 异步数据库连接
├── models/                   # SQLAlchemy 模型
├── schemas/                  # Pydantic 校验
└── main.py
```

## 核心功能

### 异步路由 + 依赖注入

```python
@router.get("/users/{user_id}", response_model=UserOut)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = await crud.user.get(db, id=user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

### JWT 鉴权流程

```python
@router.post("/login", response_model=Token)
async def login(form: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate(form.username, form.password)
    access_token = create_access_token(sub=str(user.id))
    return {"access_token": access_token, "token_type": "bearer"}
```

## 部署方案

- Docker + Gunicorn + Uvicorn Workers
- Alembic 数据库迁移管理
- GitHub Actions CI/CD 自动部署

## 性能基准

| 指标 | 数值 |
|------|------|
| QPS (单核) | 12,000+ |
| P99 延迟 | < 15ms |
| 内存占用 | ~ 80MB |
