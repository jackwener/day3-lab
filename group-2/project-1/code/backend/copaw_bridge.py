"""
CoPaw Provider — CoPaw 桥接层
对齐 Spec: 08 SS2/SS4, 07 SS1.2 降级策略

统一接口: ask(query, session_id) -> dict | None
- 成功返回标准化 dict
- 失败返回 None（触发降级到下一级）
- 所有异常静默处理，不抛异常到上层
"""

import logging
import os

import requests

logger = logging.getLogger(__name__)

# 环境变量配置检测
IRA_COPAW_CHAT_URL = os.getenv("IRA_COPAW_CHAT_URL")
IRA_COPAW_DOC_URL = os.getenv("IRA_COPAW_DOC_URL")

# 超时阈值（秒），对齐 07 SS1.2 / 08 SS4
COPAW_TIMEOUT = 20


def ask(query: str, session_id: str) -> dict | None:
    """
    向 CoPaw 桥接服务发送问答请求。

    Args:
        query: 用户查询文本
        session_id: 会话 ID

    Returns:
        成功 -> dict:
            {
                "answer": str,
                "llm_used": True,
                "model": "copaw",
                "answer_source": "copaw",
                "references": list
            }
        失败 -> None（触发降级到下一级）
    """
    # 配置检测：IRA_COPAW_CHAT_URL 未配置则直接跳过
    copaw_chat_url = os.getenv("IRA_COPAW_CHAT_URL")
    if not copaw_chat_url:
        logger.info("CoPaw 未配置: IRA_COPAW_CHAT_URL 为空，跳过本级")
        return None

    try:
        payload = {
            "query": query,
            "session_id": session_id,
        }

        resp = requests.post(
            copaw_chat_url,
            json=payload,
            timeout=COPAW_TIMEOUT,
            headers={"Content-Type": "application/json"},
        )

        # HTTP 非 200 -> 降级
        if resp.status_code != 200:
            logger.warning(
                "CoPaw 返回非 200 状态码: %d, body=%s",
                resp.status_code,
                resp.text[:200],
            )
            return None

        # JSON 解析
        data = resp.json()

        # 提取回答文本
        answer = data.get("answer", "")
        if not answer:
            logger.warning("CoPaw 返回空 answer, data=%s", str(data)[:200])
            return None

        # 提取引用出处
        references = data.get("references", [])

        return {
            "answer": answer,
            "llm_used": True,
            "model": "copaw",
            "answer_source": "copaw",
            "references": references,
        }

    except requests.exceptions.Timeout:
        logger.warning("CoPaw 请求超时 (%ds)", COPAW_TIMEOUT)
        return None

    except requests.exceptions.ConnectionError:
        logger.warning("CoPaw 连接失败: %s", copaw_chat_url)
        return None

    except requests.exceptions.JSONDecodeError:
        logger.warning("CoPaw 返回非法 JSON")
        return None

    except Exception:
        logger.exception("CoPaw 调用发生未预期异常")
        return None
