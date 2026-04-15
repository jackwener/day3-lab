import os
import time
import requests


def ask_copaw(query):
    """
    CoPaw HTTP 调用封装。
    - 检测 IRA_COPAW_AUTH_URL 和 IRA_COPAW_QA_URL 环境变量非空
    - 超时 20s
    - 任何异常返回 None（静默降级）
    - 成功返回 {"answer": str, "model": str|None}
    """
    auth_url = os.environ.get("IRA_COPAW_AUTH_URL", "")
    qa_url = os.environ.get("IRA_COPAW_QA_URL", "")

    if not auth_url or not qa_url:
        return None

    try:
        # 1. 获取 token
        auth_resp = requests.post(auth_url, timeout=20)
        auth_resp.raise_for_status()
        token = auth_resp.json().get("token")
        if not token:
            return None

        # 2. 发送问答请求
        qa_resp = requests.post(
            qa_url,
            json={"query": query},
            headers={"Authorization": f"Bearer {token}"},
            timeout=20,
        )
        qa_resp.raise_for_status()
        data = qa_resp.json()
        return {
            "answer": data.get("answer", ""),
            "model": data.get("model"),
        }
    except Exception:
        return None
