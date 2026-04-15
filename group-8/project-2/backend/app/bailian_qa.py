import os
import time


def ask_bailian(query):
    """
    百炼 DashScope API 调用封装。
    - 检测 DASHSCOPE_API_KEY 环境变量非空
    - 超时 120s
    - 区分多类错误码，失败返回 None
    - 成功返回 {"answer": str, "model": str}
    """
    api_key = os.environ.get("DASHSCOPE_API_KEY", "")
    if not api_key:
        return None

    try:
        import dashscope
        from dashscope import Generation

        dashscope.api_key = api_key
        model = "qwen-plus"

        response = Generation.call(
            model=model,
            prompt=query,
            result_format="message",
            timeout=120,
        )

        if response.status_code == 200:
            answer = response.output.choices[0].message.content
            return {"answer": answer, "model": model}
        else:
            return None
    except Exception:
        return None
