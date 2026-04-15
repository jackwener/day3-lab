"""百炼 LLM Provider — OpenAI 兼容模式，qwen-plus 模型"""
import os
from openai import OpenAI

_client = None

SYSTEM_PROMPT = """你是"基金管家"智能助手，专门为用户提供基金投资方面的咨询服务。
你的能力包括：
1. 解读基金诊断报告，帮助用户理解各项评分的含义
2. 分析基金的收益表现和持仓结构
3. 提供投资策略建议（定投、配置、止盈止损等）
4. 解答基金投资基础知识
5. 分析市场行情走势对基金的影响

回答要求：
- 简洁专业，控制在300字以内
- 使用中文回答
- 涉及投资建议时加上风险提示
- 不做任何收益承诺"""


def get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=os.getenv("DASHSCOPE_API_KEY"),
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        )
    return _client


def chat_completion(messages, stream=False):
    """调用百炼 qwen-plus 模型"""
    client = get_client()
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    if stream:
        return client.chat.completions.create(
            model="qwen-plus",
            messages=full_messages,
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )
    else:
        response = client.chat.completions.create(
            model="qwen-plus",
            messages=full_messages,
            stream=False,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content
