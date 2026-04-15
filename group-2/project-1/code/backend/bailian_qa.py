"""
百炼 Provider — DashScope 通义千问调用层
对齐 Spec: 08 SS2/SS4, 07 SS1.2 降级策略

统一接口: ask(query, session_id) -> dict | None
- 成功返回标准化 dict
- 失败返回 None（触发降级到下一级）
- 所有异常静默处理，不抛异常到上层
"""

import logging
import os

logger = logging.getLogger(__name__)

# 超时阈值（秒），对齐 08 SS4
BAILIAN_TIMEOUT = 120

# 默认模型，可通过环境变量覆盖
DEFAULT_MODEL = "qwen-turbo"


def ask(query: str, session_id: str) -> dict | None:
    """
    通过 DashScope SDK 调用通义千问模型进行问答。

    Args:
        query: 用户查询文本
        session_id: 会话 ID

    Returns:
        成功 -> dict:
            {
                "answer": str,
                "llm_used": True,
                "model": str,       # 如 "qwen-turbo"
                "answer_source": "bailian",
                "references": list
            }
        失败 -> None（触发降级到下一级）
    """
    # 配置检测：DASHSCOPE_API_KEY 未配置则直接跳过
    api_key = os.getenv("DASHSCOPE_API_KEY")
    if not api_key:
        logger.info("百炼未配置: DASHSCOPE_API_KEY 为空，跳过本级")
        return None

    try:
        import dashscope
        from dashscope import Generation

        # 设置 API Key
        dashscope.api_key = api_key

        # 模型可通过环境变量配置
        model = os.getenv("BAILIAN_MODEL", DEFAULT_MODEL)

        # 调用通义千问
        response = Generation.call(
            model=model,
            prompt=query,
            timeout=BAILIAN_TIMEOUT,
        )

        # 检查返回状态
        if response.status_code != 200:
            logger.warning(
                "百炼 API 返回错误: status=%s, code=%s, message=%s",
                response.status_code,
                getattr(response, "code", "N/A"),
                getattr(response, "message", "N/A"),
            )
            return None

        # 提取回答文本
        answer = response.output.get("text", "")
        if not answer:
            logger.warning("百炼返回空 answer, output=%s", str(response.output)[:200])
            return None

        return {
            "answer": answer,
            "llm_used": True,
            "model": model,
            "answer_source": "bailian",
            "references": [],
        }

    except ImportError:
        logger.warning("dashscope SDK 未安装，无法调用百炼")
        return None

    except Exception:
        logger.exception("百炼调用发生未预期异常")
        return None
