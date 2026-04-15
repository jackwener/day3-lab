"""
Agent 编排模块 — 对齐 Spec 08 §4 三级降级编排
Route → Agent → Provider 分层，Agent 不感知 HTTP
"""

import time


class ReportAgent:
    """三级降级编排引擎：CoPaw → 百炼 → Demo"""

    def ask(self, query, session_id, file_content=None, provider=None):
        """
        对齐 Spec 08 §4 降级链：
        [1] CoPaw  → {source:"copaw",  llm:true}
        [2] 百炼   → {source:"bailian",llm:true}
        [3] Demo   → {source:"demo",   llm:false}
        """
        start = time.time()

        # 如果指定了 provider，直接调用
        if provider:
            result = self._call_provider(provider, query, file_content)
            if result:
                result["response_time_ms"] = int((time.time() - start) * 1000)
                return result

        # 三级降级
        # [1] CoPaw（20s 超时）
        try:
            from copaw_bridge import copaw_bridge
            result = copaw_bridge.ask(query, file_content)
            if result:
                result["response_time_ms"] = int((time.time() - start) * 1000)
                return result
        except Exception:
            pass  # 静默降级

        # [2] 百炼（120s 超时）
        try:
            from bailian_qa import bailian_qa
            result = bailian_qa.ask(query, file_content)
            if result:
                result["response_time_ms"] = int((time.time() - start) * 1000)
                return result
        except Exception:
            pass  # 静默降级

        # [3] Demo 兜底（0s）
        result = self._demo_answer(query)
        result["response_time_ms"] = int((time.time() - start) * 1000)
        return result

    def _call_provider(self, provider, query, file_content):
        """按指定 provider 调用"""
        if provider == "copaw":
            from copaw_bridge import copaw_bridge
            return copaw_bridge.ask(query, file_content)
        elif provider == "bailian":
            from bailian_qa import bailian_qa
            return bailian_qa.ask(query, file_content)
        return self._demo_answer(query)

    def _demo_answer(self, query):
        """Demo 模式兜底 — 对齐 Spec 08 §4 [3]"""
        return {
            "answer": f"[离线演示] 您的问题「{query}」已收到。"
                      f"当前为演示模式，未连接真实 LLM 服务。\n\n"
                      f"如需获取真实回答，请配置 CoPaw 或百炼 API Key。",
            "llm_used": False,
            "model": None,
            "answer_source": "demo",
        }


# 单例
report_agent = ReportAgent()
