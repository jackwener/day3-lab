"""
Bailian Provider - 百炼(DashScope)服务
"""
import os
import json
import urllib.request
import urllib.error
from typing import Optional, Dict


class BailianProvider:
    """百炼Provider"""
    
    def __init__(self):
        self.name = "bailian"
        self.api_key = os.environ.get("DASHSCOPE_API_KEY", "")
        self.base_url = "https://dashscope.aliyuncs.com/api/v1"
        self.model = "qwen-turbo"  # 默认模型
        self.timeout = 120  # 120秒超时
    
    def is_configured(self) -> bool:
        """检查是否已配置"""
        return bool(self.api_key)
    
    def ask(self, query: str) -> Optional[Dict]:
        """
        调用百炼服务
        
        Args:
            query: 用户提问
            
        Returns:
            {
                "answer": str,
                "llm_used": True,
                "model": str,
                "answer_source": "bailian"
            }
            失败返回None（触发降级）
        """
        if not self.is_configured():
            return None
        
        try:
            url = f"{self.base_url}/services/aigc/text-generation/generation"
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            data = json.dumps({
                "model": self.model,
                "input": {
                    "messages": [
                        {
                            "role": "system",
                            "content": "你是投研问答助手，专门帮助分析师和基金经理处理研报相关问题。"
                        },
                        {
                            "role": "user",
                            "content": query
                        }
                    ]
                },
                "parameters": {
                    "result_format": "message",
                    "max_tokens": 2000
                }
            }).encode("utf-8")
            
            req = urllib.request.Request(
                url,
                data=data,
                headers=headers,
                method="POST"
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                result = json.loads(response.read().decode("utf-8"))
                
                # 解析百炼响应
                output = result.get("output", {})
                choices = output.get("choices", [])
                
                if choices and len(choices) > 0:
                    message = choices[0].get("message", {})
                    answer = message.get("content", "")
                else:
                    answer = ""
                
                return {
                    "answer": answer,
                    "llm_used": True,
                    "model": self.model,
                    "answer_source": "bailian"
                }
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            print(f"百炼HTTP错误: {e.code} - {error_body}")
            return None
        except urllib.error.URLError as e:
            print(f"百炼URL错误: {e.reason}")
            return None
        except TimeoutError:
            print("百炼请求超时")
            return None
        except Exception as e:
            print(f"百炼调用失败: {e}")
            return None


# 全局百炼 Provider实例
_bailian_provider = None


def get_bailian_provider() -> BailianProvider:
    """获取百炼 Provider单例"""
    global _bailian_provider
    if _bailian_provider is None:
        _bailian_provider = BailianProvider()
    return _bailian_provider
