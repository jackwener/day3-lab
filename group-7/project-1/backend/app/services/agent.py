"""
Agent编排层 - 四级降级编排
降级顺序: Ollama → CoPaw → 百炼 → Demo
"""
import time
import psutil
import os
from typing import Dict
from datetime import datetime
from app.services.copaw_bridge import get_copaw_provider
from app.services.bailian_qa import get_bailian_provider
from app.services.ollama_provider import get_ollama_provider
from app.services.demo_provider import get_demo_provider


class Agent:
    """Agent编排器"""
    
    def __init__(self):
        self.ollama = get_ollama_provider()
        self.copaw = get_copaw_provider()
        self.bailian = get_bailian_provider()
        self.demo = get_demo_provider()
    
    def ask(self, query: str) -> Dict:
        """
        执行问答，按四级降级顺序调用
        
        Args:
            query: 用户提问
            
        Returns:
            {
                "answer": str,
                "llm_used": bool,
                "model": str|None,
                "answer_source": str,
                "response_time_ms": int
            }
        """
        start_time = time.time()
        result = None
        
        # [1] 尝试 Ollama（本地优先）
        if self.ollama.is_configured():
            print(f"[Agent] 尝试Ollama...")
            result = self.ollama.ask(query)
            if result:
                print(f"[Agent] Ollama成功")
        
        # [2] Ollama失败，尝试CoPaw
        if result is None and self.copaw.is_configured():
            print(f"[Agent] Ollama失败或未配置，尝试CoPaw...")
            result = self.copaw.ask(query)
            if result:
                print(f"[Agent] CoPaw成功")
        
        # [3] CoPaw失败，尝试百炼
        if result is None and self.bailian.is_configured():
            print(f"[Agent] CoPaw失败或未配置，尝试百炼...")
            result = self.bailian.ask(query)
            if result:
                print(f"[Agent] 百炼成功")
        
        # [4] 全部失败，使用Demo兜底
        if result is None:
            print(f"[Agent] LLM服务均不可用，使用Demo兜底")
            result = self.demo.ask(query)
        
        # 计算响应时间
        response_time_ms = int((time.time() - start_time) * 1000)
        
        return {
            "answer": result["answer"],
            "llm_used": result["llm_used"],
            "model": result.get("model"),
            "answer_source": result["answer_source"],
            "response_time_ms": response_time_ms
        }
    
    def get_capabilities(self) -> Dict:
        """
        获取系统能力状态
        
        Returns:
            {
                "ollama_configured": bool,
                "ollama_model": str|None,
                "copaw_configured": bool,
                "bailian_configured": bool,
                "bailian_model": str|None
            }
        """
        return {
            "ollama_configured": self.ollama.is_configured(),
            "ollama_model": self.ollama._agent.model if self.ollama.is_configured() else None,
            "copaw_configured": self.copaw.is_configured(),
            "bailian_configured": self.bailian.is_configured(),
            "bailian_model": self.bailian.model if self.bailian.is_configured() else None
        }
    
    def get_system_status(self) -> Dict:
        """
        获取系统健康状态和资源监控
        
        Returns:
            {
                "status": str,
                "timestamp": str,
                "cpu_percent": float,
                "memory_percent": float,
                "memory_used_mb": float,
                "memory_total_mb": float,
                "disk_percent": float
            }
        """
        try:
            # CPU使用率
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # 内存信息
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used_mb = memory.used / (1024 * 1024)
            memory_total_mb = memory.total / (1024 * 1024)
            
            # 磁盘使用率
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            
            return {
                "status": "healthy" if cpu_percent < 90 and memory_percent < 90 else "warning",
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory_percent, 1),
                "memory_used_mb": round(memory_used_mb, 1),
                "memory_total_mb": round(memory_total_mb, 1),
                "disk_percent": round(disk_percent, 1)
            }
        except Exception as e:
            return {
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "error": str(e)
            }


# 全局Agent实例
_agent_instance = None


def get_agent() -> Agent:
    """获取Agent单例"""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = Agent()
    return _agent_instance
