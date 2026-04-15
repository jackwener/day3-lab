"""
agents/demo_agent.py — 默认应答 Agent
对齐规格: 08-系统架构 §4 LLM降级 / 07-非功能需求 AC-LLM-02（响应 ≤ 500ms）
"""
import random
import time

_DEFAULT_TEMPLATES = [
    "根据现有市场数据，{query_snippet}相关分析如下：\n\n"
    "1. **市场概况**：当前市场处于震荡调整阶段，投资者情绪偏谨慎。\n"
    "2. **核心指标**：行业整体市盈率处于历史均值水平，估值相对合理。\n"
    "3. **风险提示**：需关注宏观政策变化、原材料价格波动及汇率风险。\n\n"
    "> 以上分析基于公开信息整理，仅供参考，不构成投资建议。",

    "针对您关于「{query_snippet}」的提问，以下是参考分析：\n\n"
    "**行业趋势**：近期相关行业呈现稳健增长态势，头部企业市占率持续提升。\n\n"
    "**财务亮点**\n"
    "- 营收增速：预计同比增长 12%–18%\n"
    "- 毛利率：维持在 25%–35% 区间\n"
    "- 净利润率：同比改善约 2–3 个百分点\n\n"
    "**投资建议**：综合基本面与技术面，维持**关注**评级，建议等待更多数据确认。\n\n"
    "> 数据来源于行业研报及公开信息，请以最新研报为准。",

    "您好！关于「{query_snippet}」，以下是投研问答助手的分析：\n\n"
    "从近期行业报告来看，该领域主要关注以下几个维度：\n\n"
    "| 维度 | 评估 | 说明 |\n"
    "|------|------|------|\n"
    "| 成长性 | ★★★★☆ | 中长期逻辑清晰，短期受政策扰动 |\n"
    "| 盈利能力 | ★★★☆☆ | 竞争加剧导致毛利率小幅承压 |\n"
    "| 估值水平 | ★★★★☆ | 相对历史中位数具有一定吸引力 |\n\n"
    "> 以上内容基于研报数据分析，仅供参考。",
]

_DEFAULT_SOURCES = [
    {
        "report_id": "rep_001",
        "report_title": "新能源行业深度研报",
        "institution": "中信证券",
        "date": "2025-01-15",
        "page": "第3页",
        "snippet": "行业增速预计维持在15%以上，头部企业竞争优势明显。",
    }
]


def ask(query: str, session_context: list | None = None) -> dict:
    """
    默认应答 Agent，无需外部 API，响应时间 ≤ 500ms。
    返回结构与 bailian_agent.ask() 完全一致，便于调用方统一处理。
    """
    t0 = time.time()

    # 取 query 前 15 字作为片段插入模板
    snippet = query[:15] + ("..." if len(query) > 15 else "")
    template = random.choice(_DEFAULT_TEMPLATES)
    answer = template.format(query_snippet=snippet)

    elapsed_ms = int((time.time() - t0) * 1000)

    return {
        "answer": answer,
        "llm_used": False,
        "model": None,
        "answer_source": "demo",
        "response_time_ms": elapsed_ms,
        "sources": _DEFAULT_SOURCES,
    }
