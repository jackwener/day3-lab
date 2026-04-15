"""
CoPaw HTTP 桥接模块
对齐: 08 §4 三级降级编排
"""
import os
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

# 超时设置: 4500ms
TIMEOUT_MS = 4.5


def is_copaw_configured() -> bool:
    """检测 CoPaw 是否已配置"""
    return bool(os.environ.get("IRA_COPAW_ASK_URL"))


def ask_copaw(query: str, session_id: str) -> Optional[dict]:
    """
    调用 CoPaw 问答接口
    
    Returns:
        成功: {"answer": str, "cited_passages": list, "model": str}
        失败: None (静默降级)
    """
    url = os.environ.get("IRA_COPAW_ASK_URL")
    if not url:
        logger.debug("CoPaw not configured, skipping")
        return None
    
    try:
        response = requests.post(
            url,
            json={
                "query": query,
                "session_id": session_id
            },
            timeout=TIMEOUT_MS
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "answer": data.get("answer", ""),
                "cited_passages": data.get("cited_passages"),
                "model": data.get("model", "copaw")
            }
        else:
            logger.warning(f"CoPaw returned {response.status_code}")
            return None
            
    except requests.Timeout:
        logger.warning(f"CoPaw timeout after {TIMEOUT_MS}s")
        return None
    except requests.RequestException as e:
        logger.warning(f"CoPaw request failed: {e}")
        return None
    except Exception as e:
        logger.warning(f"CoPaw unexpected error: {e}")
        return None


def get_copaw_capabilities() -> dict:
    """获取 CoPaw 能力状态"""
    url = os.environ.get("IRA_COPAW_CAPS_URL")
    if not url:
        return {"configured": False}
    
    try:
        response = requests.get(url, timeout=2)
        if response.status_code == 200:
            return {"configured": True, "status": "ok", **response.json()}
        return {"configured": True, "status": "error"}
    except:
        return {"configured": True, "status": "unreachable"}
