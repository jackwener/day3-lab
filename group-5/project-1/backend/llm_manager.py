"""
LLM Manager — 对齐 Spec 08 §2 LLM Manager 层
管理多 Provider 配置、可用列表、切换逻辑
"""

import os
from dotenv import load_dotenv

load_dotenv()


class LLMManager:
    """多 Provider 管理，对齐 Spec 09 §11"""

    # Provider 注册表
    PROVIDERS = [
        {
            "id": "copaw",
            "name": "CoPaw 桥接",
            "model": "copaw-bridge",
            "env_key": "IRA_COPAW_BASE_URL",
        },
        {
            "id": "bailian",
            "name": "阿里云百炼",
            "model": "qwen-max",
            "env_key": "DASHSCOPE_API_KEY",
        },
    ]

    def get_capabilities(self):
        """对齐 Spec 09 §3 能力探测"""
        copaw_ok = bool(os.environ.get("IRA_COPAW_BASE_URL"))
        bailian_ok = bool(os.environ.get("DASHSCOPE_API_KEY"))

        model = None
        if copaw_ok:
            model = "copaw-bridge"
        elif bailian_ok:
            model = "qwen-max"

        return {
            "copaw_configured": copaw_ok,
            "bailian_configured": bailian_ok,
            "model": model,
        }

    def list_providers(self):
        """对齐 Spec 09 §11 — 不含 API Key"""
        providers = []
        default = None
        for p in self.PROVIDERS:
            available = bool(os.environ.get(p["env_key"]))
            providers.append({
                "id": p["id"],
                "name": p["name"],
                "model": p["model"],
                "available": available,
            })
            if available and not default:
                default = p["id"]

        return {
            "providers": providers,
            "default": default or "demo",
        }

    def get_default_provider(self):
        data = self.list_providers()
        return data["default"]


# 单例
llm_manager = LLMManager()
