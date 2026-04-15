"""
Agent 编排 — 三级降级
对齐: 08 §4 三级降级编排, 07 §1.2 降级策略

降级链: CoPaw → 百炼 → Demo
"""
import os
import logging
import time
from typing import Optional

from copaw_bridge import ask_copaw, is_copaw_configured
from bailian_qa import ask_bailian, is_bailian_configured

logger = logging.getLogger(__name__)


def _demo_response(query: str) -> dict:
    """
    Demo 模式兜底
    始终可用，不抛异常
    """
    return {
        "answer": f"[Demo 模式] 您的问题是：「{query}」。这是一个模拟回答，用于演示目的。请在生产环境中配置 LLM API 以获得真实回答。",
        "cited_passages": None,
        "model": None,
        "answer_source": "demo"
    }


def ask(
    query: str,
    session_id: str,
    system_prompt: Optional[str] = None,
    context: Optional[str] = None
) -> dict:
    """
    三级降级问答

    顺序: CoPaw → 百炼 → Demo

    Args:
        query: 用户提问
        session_id: 会话 ID
        system_prompt: 可选系统提示词（自定义智能体/专业角色）
        context: 可选上下文文本（研报内容等）

    Returns:
        {
            "answer": str,
            "answer_source": "copaw" | "bailian" | "demo",
            "llm_used": bool,
            "model": str | None,
            "cited_passages": list | None,
            "response_time_ms": int
        }
    """
    start_time = time.time()

    # 将上下文融入查询
    full_query = query
    if context:
        full_query = f"[参考资料]:\n{context[:3000]}\n\n[用户问题]:\n{query}"

    # 第一级: CoPaw
    if is_copaw_configured():
        result = ask_copaw(full_query, session_id)
        if result:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Answer from CoPaw, elapsed={elapsed_ms}ms")
            return {
                "answer": result["answer"],
                "answer_source": "copaw",
                "llm_used": True,
                "model": result.get("model", "copaw"),
                "cited_passages": result.get("cited_passages"),
                "response_time_ms": elapsed_ms
            }
        logger.warning("CoPaw failed, falling back to Bailian")

    # 第二级: 百炼
    if is_bailian_configured():
        result = ask_bailian(full_query, session_id, system_prompt=system_prompt)
        if result:
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Answer from Bailian, elapsed={elapsed_ms}ms")
            return {
                "answer": result["answer"],
                "answer_source": "bailian",
                "llm_used": True,
                "model": result.get("model", "qwen-turbo"),
                "cited_passages": result.get("cited_passages"),
                "response_time_ms": elapsed_ms
            }
        logger.warning("Bailian failed, falling back to Demo")

    # 第三级: Demo 兜底
    result = _demo_response(query)
    elapsed_ms = int((time.time() - start_time) * 1000)
    logger.info(f"Answer from Demo, elapsed={elapsed_ms}ms")

    return {
        "answer": result["answer"],
        "answer_source": "demo",
        "llm_used": False,
        "model": None,
        "cited_passages": None,
        "response_time_ms": elapsed_ms
    }


def get_capabilities() -> dict:
    """
    获取系统能力状态
    对齐: 09 §1 GET /capabilities
    """
    return {
        "copaw_configured": is_copaw_configured(),
        "bailian_configured": is_bailian_configured(),
        "model": os.environ.get("DASHSCOPE_MODEL", "qwen-turbo") if is_bailian_configured() else None
    }
