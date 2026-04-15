"""
Agent 编排层 — CoPawAgent
对齐 Spec: 08 §2/§4, 07 §1.2, 04 R-03/R-04

三级降级编排: CoPaw → 百炼 → Demo
- 允许做: 三级降级编排、结果组装、引用出处拼接
- 禁止做: 感知 HTTP 请求/响应（对齐 08 §2）
"""

import logging
import os
import time

import copaw_bridge
import bailian_qa
from storage import Storage

logger = logging.getLogger(__name__)


class CoPawAgent:
    """Agent 编排层，是 Route 与 Provider/Storage 之间的核心协调层。"""

    def __init__(self, storage: Storage):
        self.storage = storage

    def ask(self, query: str, session_id: str) -> dict:
        """
        三级降级编排: CoPaw → 百炼 → Demo
        返回标准化结果 dict。

        降级规则（对齐 07 §1.2）:
        - 不可跳级: 必须按 CoPaw → 百炼 → Demo 顺序尝试
        - 静默执行: Provider 返回 None 时直接尝试下一级，不抛异常
        - Demo 始终可用: 纯字符串拼接，无外部依赖
        """
        start_time = time.time()

        # ── 第 1 级: CoPaw ────────────────────────────────
        result = copaw_bridge.ask(query, session_id)
        if result is not None:
            logger.info("ask(): CoPaw 返回成功，answer_source=copaw")
            result["response_time_ms"] = int((time.time() - start_time) * 1000)
            self._save_record(session_id, query, result)
            return result

        # ── 第 2 级: 百炼 ─────────────────────────────────
        result = bailian_qa.ask(query, session_id)
        if result is not None:
            logger.info("ask(): 百炼返回成功，answer_source=bailian")
            result["response_time_ms"] = int((time.time() - start_time) * 1000)
            self._save_record(session_id, query, result)
            return result

        # ── 第 3 级: Demo 兜底 ────────────────────────────
        logger.info("ask(): CoPaw + 百炼均不可用，降级到 Demo 模式")
        result = self._demo_answer(query)
        result["response_time_ms"] = int((time.time() - start_time) * 1000)
        self._save_record(session_id, query, result)
        return result

    def _demo_answer(self, query: str) -> dict:
        """
        Demo 模式兜底: 纯字符串拼接，无外部依赖。
        answer_source='demo', llm_used=False
        对齐 04 R-04, 07 §1.2
        """
        return {
            "answer": f"【演示模式】您的问题\u201c{query}\u201d已收到。当前为离线演示模式，未连接真实 LLM 服务。",
            "llm_used": False,
            "model": None,
            "answer_source": "demo",
            "references": [],
        }

    def _save_record(self, session_id: str, query: str, result: dict) -> None:
        """将问答结果写入 Storage。"""
        self.storage.add_record(
            session_id=session_id,
            query=query,
            answer=result["answer"],
            llm_used=result["llm_used"],
            model=result.get("model"),
            response_time_ms=result["response_time_ms"],
            answer_source=result["answer_source"],
            references=result.get("references"),
        )

    def check_health(self) -> dict:
        """
        健康检查: 检测 storage / llm_copaw / llm_bailian 各组件状态。
        对齐 09 §8 GET /health 响应规格。
        """
        components = {
            "storage": "UP" if self._check_storage() else "DOWN",
            "llm_copaw": "UP" if os.getenv("IRA_COPAW_CHAT_URL") else "DOWN",
            "llm_bailian": "UP" if os.getenv("DASHSCOPE_API_KEY") else "DOWN",
        }

        status = "UP"
        if components["storage"] == "DOWN":
            status = "DEGRADED"
        elif components["llm_copaw"] == "DOWN" and components["llm_bailian"] == "DOWN":
            status = "DEGRADED"

        return {"status": status, "components": components}

    def _check_storage(self) -> bool:
        """检测 Storage 是否可用。"""
        try:
            self.storage.get_sessions()
            return True
        except Exception:
            logger.warning("Storage 健康检查失败")
            return False

    def get_capabilities(self) -> dict:
        """
        能力探测: 返回各 LLM 配置状态。
        对齐 06 §2.1 能力状态芯片。
        """
        return {
            "copaw_configured": bool(os.getenv("IRA_COPAW_CHAT_URL")),
            "bailian_configured": bool(os.getenv("DASHSCOPE_API_KEY")),
        }
