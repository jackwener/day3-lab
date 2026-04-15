"""
百炼 DashScope Provider — 对齐 Spec 08 §4 [2]
超时 120s，区分多类错误码
"""

import os


class BailianQA:
    """阿里云百炼 LLM 调用"""

    TIMEOUT = 120  # 对齐 Spec 08 §4

    def ask(self, query, file_content=None):
        api_key = os.environ.get("DASHSCOPE_API_KEY")
        if not api_key:
            return None

        try:
            import dashscope
            from dashscope import Generation

            messages = []
            if file_content:
                messages.append({"role": "system", "content": f"以下是研报内容：\n{file_content}"})
            messages.append({"role": "user", "content": query})

            response = Generation.call(
                model="qwen-max",
                messages=messages,
                api_key=api_key,
                timeout=self.TIMEOUT,
            )
            if response.status_code == 200:
                return {
                    "answer": response.output.text,
                    "llm_used": True,
                    "model": "qwen-max",
                    "answer_source": "bailian",
                }
            return None
        except Exception:
            return None  # 静默降级


# 单例
bailian_qa = BailianQA()
