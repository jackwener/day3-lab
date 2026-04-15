# LLM 应用开发入门

## 概述

大语言模型应用开发实战指南，涵盖 Prompt Engineering 系统化方法、RAG 检索增强生成、Agent 框架设计、Fine-tuning 策略选择。帮助开发者快速构建生产级 AI 应用。

## 快速开始

```bash
pip install openai langchain chromadb

# 设置 API Key
export OPENAI_API_KEY="sk-..."
python examples/chat_demo.py
```

## 核心架构

### RAG 检索增强生成

```python
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA

# 1. 文档向量化
vectorstore = Chroma.from_documents(docs, OpenAIEmbeddings())

# 2. 检索 + 生成
qa_chain = RetrievalQA.from_chain_type(
    llm=ChatOpenAI(model="gpt-4"),
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
)
answer = qa_chain.run("什么是 RAG？")
```

### Agent 工具调用

```python
from langchain.agents import create_openai_tools_agent

tools = [search_tool, calculator_tool, code_interpreter]
agent = create_openai_tools_agent(llm, tools, prompt)
result = agent.invoke({"input": "帮我分析这份销售数据"})
```

## Prompt 设计模式

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| Zero-shot | 无示例直接提问 | 简单任务 |
| Few-shot | 提供示例引导 | 格式化输出 |
| Chain-of-Thought | 思维链推理 | 复杂推理 |
| ReAct | 推理 + 行动循环 | 工具调用 |

## 最佳实践

1. **System Prompt 结构化**: 角色 → 能力 → 约束 → 输出格式
2. **Temperature 调参**: 创意任务用 0.7-1.0，精确任务用 0-0.3
3. **Token 预算控制**: 合理设置 max_tokens 避免成本失控
4. **错误处理**: 实现重试、降级、超时保护机制
