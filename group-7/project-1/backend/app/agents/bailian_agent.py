"""
agents/bailian_agent.py — 百炼(DashScope) LLM Agent
对齐规格: 08-系统架构 §4 LLM降级 / 09-API规格 §4 POST /ask
"""
import os
import time

try:
    import dashscope
    from dashscope import Generation

    _HAS_DASHSCOPE = True
except ImportError:
    _HAS_DASHSCOPE = False

# 默认模型名称，可通过环境变量覆盖
_DEFAULT_MODEL = "qwen-plus"


def _get_model() -> str:
    return os.environ.get("DASHSCOPE_MODEL", _DEFAULT_MODEL).strip()


def is_available() -> bool:
    """检查百炼是否已配置（环境变量 + 包已安装）。"""
    key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    return bool(key) and _HAS_DASHSCOPE


def ask(query: str, session_context: list | None = None) -> dict:
    """
    调用百炼 API 回答问题。
    返回:
        {
            "answer": str,
            "llm_used": True,
            "model": str,
            "answer_source": "bailian",
            "response_time_ms": int,
            "sources": [],
        }
    抛出: RuntimeError — 当调用失败时，由调用方捕获并降级到 Demo。
    """
    api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    model = _get_model()

    messages = [
        {
            "role": "system",
            "content": (
                "你是一位专业的投研助手，擅长分析股票、行业趋势和研究报告。"
                "请基于专业知识给出客观、准确的分析。"
                "回答请使用中文，格式清晰，重点突出。"
            ),
        }
    ]

    # 注入历史上下文（最近 5 轮）
    if session_context:
        for rec in session_context[-5:]:
            messages.append({"role": "user", "content": rec.get("query", "")})
            messages.append({"role": "assistant", "content": rec.get("answer", "")})

    messages.append({"role": "user", "content": query})

    t0 = time.time()
    try:
        response = Generation.call(
            model=model,
            messages=messages,
            api_key=api_key,
            result_format="message",
        )
    except Exception as exc:
        raise RuntimeError(f"百炼 API 调用失败: {exc}") from exc

    elapsed_ms = int((time.time() - t0) * 1000)

    if response.status_code != 200:
        raise RuntimeError(
            f"百炼 API 返回非 200: {response.status_code} — {response.message}"
        )

    answer = response.output.choices[0].message.content.strip()
    return {
        "answer": answer,
        "llm_used": True,
        "model": model,
        "answer_source": "bailian",
        "response_time_ms": elapsed_ms,
        "sources": [],
    }
