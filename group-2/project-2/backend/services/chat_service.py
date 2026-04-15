"""问答服务 — 调用百炼 LLM"""
from providers.llm_provider import chat_completion


def ask(question, history=None):
    """非流式问答"""
    messages = []
    if history:
        for h in history[-10:]:  # 保留最近10轮
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": question})

    try:
        answer = chat_completion(messages, stream=False)
        return {"question": question, "answer": answer}
    except Exception as e:
        return {"question": question, "answer": f"抱歉，AI 服务暂时不可用：{str(e)}"}


def ask_stream(question, history=None):
    """流式问答，返回 generator"""
    messages = []
    if history:
        for h in history[-10:]:
            messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": question})

    try:
        stream = chat_completion(messages, stream=True)
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        yield f"抱歉，AI 服务暂时不可用：{str(e)}"
