import time
from .copaw_bridge import ask_copaw
from .bailian_qa import ask_bailian


class CoPawAgent:
    """三级降级编排：CoPaw → 百炼 → Demo"""

    def ask(self, query, session_id):
        """
        执行三级降级问答。
        返回: {
            "answer": str,
            "llm_used": bool,
            "model": str|None,
            "response_time_ms": int,
            "answer_source": "copaw"|"bailian"|"demo"
        }
        """
        start = time.time()

        # Level 1: CoPaw
        result = ask_copaw(query)
        if result is not None:
            elapsed = int((time.time() - start) * 1000)
            return {
                "answer": result["answer"],
                "llm_used": True,
                "model": result.get("model"),
                "response_time_ms": elapsed,
                "answer_source": "copaw",
            }

        # Level 2: 百炼 DashScope
        result = ask_bailian(query)
        if result is not None:
            elapsed = int((time.time() - start) * 1000)
            return {
                "answer": result["answer"],
                "llm_used": True,
                "model": result.get("model"),
                "response_time_ms": elapsed,
                "answer_source": "bailian",
            }

        # Level 3: Demo 离线模式
        elapsed = int((time.time() - start) * 1000)
        return {
            "answer": f"[演示模式] 您的问题是：「{query}」。这是一条离线演示回复，实际部署后将由 AI 模型生成专业回答。",
            "llm_used": False,
            "model": None,
            "response_time_ms": elapsed,
            "answer_source": "demo",
        }
