"""
CoPaw Provider - CoPaw桥接服务
"""
import os
import json
import urllib.request
import urllib.error
from typing import Optional, Dict


class CopawProvider:
    """CoPaw桥接Provider"""
    
    def __init__(self):
        self.name = "copaw"
        self.base_url = os.environ.get("IRA_COPAW_BASE_URL", "").rstrip("/")
        self.api_key = os.environ.get("IRA_COPAW_API_KEY", "")
        self.timeout = 20  # 20秒超时
    
    def is_configured(self) -> bool:
        """检查是否已配置"""
        return bool(self.base_url)
    
    def ask(self, query: str) -> Optional[Dict]:
        """
        调用CoPaw服务
        
        Args:
            query: 用户提问
            
        Returns:
            {
                "answer": str,
                "llm_used": True,
                "model": str,
                "answer_source": "copaw"
            }
            失败返回None（触发降级）
        """
        if not self.is_configured():
            return None
        
        try:
            # 构建请求
            url = f"{self.base_url}/ask"
            
            headers = {
                "Content-Type": "application/json",
            }
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            data = json.dumps({
                "query": query,
                "stream": False
            }).encode("utf-8")
            
            req = urllib.request.Request(
                url,
                data=data,
                headers=headers,
                method="POST"
            )
            
            # 发送请求
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                
                return {
                    "answer": result.get("answer", ""),
                    "llm_used": True,
                    "model": result.get("model", "copaw-default"),
                    "answer_source": "copaw"
                }
                
        except urllib.error.HTTPError as e:
            print(f"CoPaw HTTP错误: {e.code} - {e.reason}")
            return None
        except urllib.error.URLError as e:
            print(f"CoPaw URL错误: {e.reason}")
            return None
        except TimeoutError:
            print("CoPaw请求超时")
            return None
        except Exception as e:
            print(f"CoPaw调用失败: {e}")
            return None


# 全局CoPaw Provider实例
_copaw_provider = None


def get_copaw_provider() -> CopawProvider:
    """获取CoPaw Provider单例"""
    global _copaw_provider
    if _copaw_provider is None:
        _copaw_provider = CopawProvider()
    return _copaw_provider
