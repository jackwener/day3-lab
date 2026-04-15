from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from seed_data import run_seed
from routers import rituals, gallery

app = FastAPI(
    title="Vibe Oracle — Fate Cards API",
    version="0.3.0",
    description="命运仪式卡牌 FastAPI 后端",
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── 路由挂载 ─────────────────────────────────────────────────
app.include_router(rituals.router, prefix="/api/v1/rituals", tags=["Ritual"])
app.include_router(gallery.router, prefix="/api/v1/history",  tags=["Gallery"])


# ─── 启动事件 ─────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    init_db()
    run_seed()
    print("[startup] Database initialized and seed data checked.")


@app.get("/")
async def root():
    return {"code": "OK", "message": "Vibe Oracle API is running", "data": None}


@app.get("/health")
async def health():
    return {"code": "OK", "message": "healthy", "data": None}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
