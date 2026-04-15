"""
Ollama Provider - 本地 Ollama 服务
调用本地 Ollama 服务，使用 gemma4:e2b 模型
降级策略: Ollama 失败时返回 None，触发 Demo 兜底
"""
from typing import Optional, Dict
from app.agents.ollama_agent import get_ollama_agent


class OllamaProvider:
    """Ollama 本地模型 Provider"""
    
    def __init__(self):
        self.name = "ollama"
        self._agent = get_ollama_agent()
    
    def is_configured(self) -> bool:
        """检查是否已配置（Ollama 服务是否可用）"""
        return self._agent.is_available()
    
    def ask(self, query: str) -> Optional[Dict]:
        """
        调用 Ollama 服务
        
        Args:
            query: 用户提问
            
        Returns:
            {
                "answer": str,
                "llm_used": True,
                "model": str,
                "answer_source": "ollama"
            }
            失败返回 None（触发降级到 Demo）
        """
        result = self._agent.ask(query)
        if result is None:
            return None
        
        # 转换为统一格式
        return {
            "answer": result["answer"],
            "llm_used": result["llm_used"],
            "model": result["model"],
            "answer_source": result["answer_source"]
        }


# 全局 Ollama Provider 实例
_ollama_provider = None


def get_ollama_provider() -> OllamaProvider:
    """获取 Ollama Provider 单例"""
    global _ollama_provider
    if _ollama_provider is None:
        _ollama_provider = OllamaProvider()
    return _ollama_provider
