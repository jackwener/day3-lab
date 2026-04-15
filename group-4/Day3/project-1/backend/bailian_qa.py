"""
百炼（DashScope）LLM 集成模块
对齐: 08 §4 三级降级编排
"""
import os
import logging
import time
from typing import Optional

logger = logging.getLogger(__name__)

# 超时设置: 4500ms
TIMEOUT_MS = 4.5

# DashScope API 配置
DASHSCOPE_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"


def is_bailian_configured() -> bool:
    """检测百炼是否已配置"""
    return bool(os.environ.get("DASHSCOPE_API_KEY"))


def _call_bailian(messages: list, model: str, api_key: str) -> Optional[dict]:
    """内部调用百炼接口"""
    try:
        import requests

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "input": {"messages": messages},
            "parameters": {"result_format": "message"}
        }
        response = requests.post(
            DASHSCOPE_API_URL, headers=headers, json=payload, timeout=TIMEOUT_MS
        )

        if response.status_code == 200:
            data = response.json()
            choices = data.get("output", {}).get("choices", [])
            if choices:
                return {
                    "answer": choices[0].get("message", {}).get("content", ""),
                    "cited_passages": None,
                    "model": model
                }
            return None
        elif response.status_code == 401:
            logger.warning("Bailian authentication failed")
        elif response.status_code == 429:
            logger.warning("Bailian rate limit exceeded")
        else:
            logger.warning(f"Bailian returned {response.status_code}")
        return None

    except ImportError:
        logger.warning("requests not installed")
        return None
    except Exception as e:
        logger.warning(f"Bailian request failed: {e}")
        return None


def ask_bailian(query: str, session_id: str, system_prompt: Optional[str] = None) -> Optional[dict]:
    """
    调用百炼问答接口

    Args:
        query: 用户提问
        session_id: 会话 ID
        system_prompt: 可选系统提示词（自定义智能体/专业分析师角色）

    Returns:
        成功: {"answer": str, "cited_passages": list, "model": str}
        失败: None (静默降级)
    """
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        logger.debug("Bailian not configured, skipping")
        return None

    model = os.environ.get("DASHSCOPE_MODEL", "qwen-turbo")
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": query})

    return _call_bailian(messages, model, api_key)


def ask_bailian_with_prompt(prompt: str, session_id: str) -> Optional[dict]:
    """
    以完整 prompt 字符串调用百炼（用于研报解析等场景，不区分 system/user）
    """
    api_key = os.environ.get("DASHSCOPE_API_KEY")
    if not api_key:
        return None
    model = os.environ.get("DASHSCOPE_MODEL", "qwen-turbo")
    messages = [{"role": "user", "content": prompt}]
    return _call_bailian(messages, model, api_key)
