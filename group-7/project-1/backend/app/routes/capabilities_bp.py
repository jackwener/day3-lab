"""
routes/capabilities_bp.py — 能力探测 & 健康检查
对齐规格:
  - 09-API接口规格 §3 GET /capabilities
  - 09-API接口规格 §14 GET /health
  - task-backend-capabilities.md §1/2/5
  - 13-测试策略 TC-M01-045 / TC-M01-080
"""
import os
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, current_app
from app.agents.ollama_agent import get_ollama_agent

capabilities_bp = Blueprint("capabilities", __name__)


def _trace() -> str:
    """生成链路追踪 ID，格式 tr_{16位hex}"""
    return f"tr_{uuid.uuid4().hex[:16]}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ------------------------------------------------------------------ #
# GET /capabilities — 能力探测 (TC-M01-045)
# ------------------------------------------------------------------ #
@capabilities_bp.route("/capabilities", methods=["GET"])
def get_capabilities():
    """
    返回系统当前 LLM 配置状态，用于前端 Header 芯片展示。

    响应字段（对齐 09-API §3 + task 文档 §1）:
      traceId, ollama_configured, copaw_configured, bailian_configured, demo_available, version
    附加字段（前端芯片展示用）:
      model — 当前使用的模型名称
    """
    copaw_key = os.environ.get("COPAW_API_KEY", "").strip()
    bailian_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    bailian_model = os.environ.get("DASHSCOPE_MODEL", "qwen-plus").strip()

    copaw_configured = bool(copaw_key)
    bailian_configured = bool(bailian_key)

    # 进一步确认 dashscope 包是否已安装
    if bailian_configured:
        try:
            import dashscope  # noqa: F401
        except ImportError:
            bailian_configured = False

    # 检查 Ollama 可用性
    ollama_agent = get_ollama_agent()
    ollama_configured = ollama_agent.is_available()
    ollama_model = ollama_agent.model if ollama_configured else None

    # 确定当前使用的模型
    current_model = None
    if ollama_configured:
        current_model = ollama_model
    elif bailian_configured:
        current_model = bailian_model

    return (
        jsonify(
            {
                "traceId": _trace(),
                "ollama_configured": ollama_configured,
                "copaw_configured": copaw_configured,
                "bailian_configured": bailian_configured,
                "demo_available": True,
                "version": "v1.0",
                "model": current_model,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# GET /health — 健康检查 (TC-M01-080)
# ------------------------------------------------------------------ #
@capabilities_bp.route("/health", methods=["GET"])
def get_health():
    """
    返回系统健康状态和运行指标。

    LLM 健康状态判断（对齐 task §2 / 08-架构 §4）:
      - 百炼已配置且包可用 → provider=bailian
      - 否则 Demo 兜底   → provider=demo（始终 available）

    整体 status 判断（对齐 task §2）:
      - 所有服务正常     → healthy
      - 数据文件不可读   → degraded
      - （本版本不出现 unhealthy）
    """
    storage = current_app.config["STORAGE"]

    # ── LLM 健康 ──────────────────────────────────────────────────────
    copaw_key = os.environ.get("COPAW_API_KEY", "").strip()
    bailian_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()

    # 检查 Ollama 可用性
    ollama_agent = get_ollama_agent()
    ollama_available = ollama_agent.is_available()

    llm_status = "available"
    if ollama_available:
        provider = "ollama"
    elif copaw_key:
        provider = "copaw"
    elif bailian_key:
        try:
            import dashscope  # noqa: F401
            provider = "bailian"
        except ImportError:
            provider = "demo"
    else:
        provider = "demo"

    # ── 数据库（JSON 文件）健康 ───────────────────────────────────────
    try:
        storage.get_sessions()
        db_status = "ok"
    except Exception:
        db_status = "error"

    # ── 运行指标 ─────────────────────────────────────────────────────
    try:
        metrics = storage.get_metrics()
    except Exception:
        metrics = {
            "active_sessions": 0,
            "total_queries": 0,
            "avg_response_time_ms": 0,
            "total_reports": 0,
        }

    # ── 综合 status ──────────────────────────────────────────────────
    if db_status == "error":
        overall_status = "degraded"
    else:
        overall_status = "healthy"

    return (
        jsonify(
            {
                "traceId": _trace(),
                "status": overall_status,
                "timestamp": _now_iso(),
                "services": {
                    "llm": {"status": llm_status, "provider": provider},
                    "database": db_status,
                },
                "metrics": metrics,
            }
        ),
        200,
    )
