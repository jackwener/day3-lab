"""
agents/ollama_agent.py — Ollama 本地 LLM Agent
对齐规格: 08-系统架构 §4 LLM降级 / 09-API规格 §4 POST /ask
调用本地 Ollama 服务，使用 gemma4:e2b 模型
"""
import os
import time
import json
import urllib.request
import urllib.error
from typing import Optional, Dict, List

# 默认配置
_DEFAULT_MODEL = "gemma4:e2b"
_DEFAULT_HOST = "http://localhost:11434"
_DEFAULT_TIMEOUT = 60  # 60秒超时


class OllamaAgent:
    """Ollama 本地模型 Agent"""
    
    def __init__(self):
        self.name = "ollama"
        self.host = os.environ.get("OLLAMA_HOST", _DEFAULT_HOST).strip()
        self.model = os.environ.get("OLLAMA_MODEL", _DEFAULT_MODEL).strip()
        self.timeout = int(os.environ.get("OLLAMA_TIMEOUT", str(_DEFAULT_TIMEOUT)))
        self._available = None  # 缓存可用性检查结果
    
    def is_available(self) -> bool:
        """检查 Ollama 服务是否可用"""
        if self._available is not None:
            return self._available
        
        try:
            # 尝试连接 Ollama 服务
            req = urllib.request.Request(
                f"{self.host}/api/tags",
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    # 检查模型是否存在
                    data = json.loads(response.read().decode("utf-8"))
                    models = data.get("models", [])
                    model_names = [m.get("name", "") for m in models]
                    # 支持模型名称匹配（gemma4:e2b 或 gemma4）
                    self._available = any(
                        self.model in name or name in self.model 
                        for name in model_names
                    )
                    if not self._available:
                        print(f"[Ollama] 模型 {self.model} 未找到，可用模型: {model_names}")
                    return self._available
        except Exception as e:
            print(f"[Ollama] 服务不可用: {e}")
            self._available = False
            return False
        
        self._available = False
        return False
    
    def is_configured(self) -> bool:
        """检查是否已配置（兼容 Agent 编排层接口）"""
        return self.is_available()
    
    def ask(self, query: str, session_context: Optional[List[dict]] = None) -> Optional[Dict]:
        """
        调用 Ollama 本地模型回答问题
        
        Args:
            query: 用户提问
            session_context: 历史会话上下文
            
        Returns:
            {
                "answer": str,
                "llm_used": True,
                "model": str,
                "answer_source": "ollama",
                "response_time_ms": int,
                "sources": [],
            }
            失败返回 None（触发降级到 Demo）
        """
        if not self.is_available():
            return None
        
        # 构建消息历史
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
            url = f"{self.host}/api/chat"
            
            data = json.dumps({
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_predict": 2000,
                }
            }).encode("utf-8")
            
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                
                # 解析 Ollama 响应
                message = result.get("message", {})
                answer = message.get("content", "").strip()
                
                elapsed_ms = int((time.time() - t0) * 1000)
                
                return {
                    "answer": answer,
                    "llm_used": True,
                    "model": self.model,
                    "answer_source": "ollama",
                    "response_time_ms": elapsed_ms,
                    "sources": [],
                }
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"[Ollama] HTTP错误: {e.code} - {error_body}")
            return None
        except urllib.error.URLError as e:
            print(f"[Ollama] URL错误: {e.reason}")
            return None
        except TimeoutError:
            print("[Ollama] 请求超时")
            return None
        except Exception as e:
            print(f"[Ollama] 调用失败: {e}")
            return None


# 全局 Ollama Agent 实例
_ollama_agent = None


def get_ollama_agent() -> OllamaAgent:
    """获取 Ollama Agent 单例"""
    global _ollama_agent
    if _ollama_agent is None:
        _ollama_agent = OllamaAgent()
    return _ollama_agent


# 兼容旧版函数接口
def is_available() -> bool:
    """检查 Ollama 是否可用"""
    return get_ollama_agent().is_available()


def ask(query: str, session_context: Optional[List[dict]] = None) -> Optional[Dict]:
    """调用 Ollama 回答问题"""
    return get_ollama_agent().ask(query, session_context)
