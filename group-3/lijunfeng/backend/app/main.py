"""
FastAPI 应用入口
"""
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import timeline, funds, situation

# 创建 FastAPI 应用
app = FastAPI(
    title="Investment Analysis API",
    description="投资分析后端服务 API",
    version="1.0.0"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # 前端开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 统一响应处理
@app.middleware("http")
async def add_trace_id(request: Request, call_next):
    """
    为每个请求添加 traceId 和时间戳
    """
    # 生成 traceId
    trace_id = str(uuid.uuid4())[:16]
    request.state.trace_id = trace_id
    
    # 记录请求开始时间
    start_time = datetime.now(timezone.utc)
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        # 全局异常处理
        timestamp = datetime.now(timezone.utc).isoformat()
        return JSONResponse(
            status_code=500,
            content={
                "traceId": trace_id,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "服务器内部错误",
                    "details": {"error": str(e)}
                },
                "timestamp": timestamp
            }
        )


# 注册路由
app.include_router(timeline.router, prefix="/api")
app.include_router(funds.router, prefix="/api")
app.include_router(situation.router, prefix="/api")


@app.get("/")
async def root():
    """根路径 - API 信息"""
    return {
        "name": "Investment Analysis API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}
