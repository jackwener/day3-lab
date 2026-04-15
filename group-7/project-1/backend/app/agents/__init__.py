"""
agents/__init__.py
"""
from .bailian_agent import is_available, ask as bailian_ask
from .demo_agent import ask as demo_ask
from .ollama_agent import OllamaAgent, get_ollama_agent, is_available as ollama_is_available, ask as ollama_ask

__all__ = ['bailian_agent', 'demo_agent', 'ollama_agent', 'OllamaAgent', 'get_ollama_agent']

# 模块别名，便于路由中使用
class _BailianAgent:
    is_available = staticmethod(is_available)
    ask = staticmethod(bailian_ask)

class _DemoAgent:
    ask = staticmethod(demo_ask)

class _OllamaAgent:
    is_available = staticmethod(ollama_is_available)
    ask = staticmethod(ollama_ask)

bailian_agent = _BailianAgent()
demo_agent = _DemoAgent()
ollama_agent = _OllamaAgent()
