"""
研报文件解析器
支持 PDF / Word / HTML，LLM 提取结构化信息
"""
import io
import json
import re
import logging

logger = logging.getLogger(__name__)


# ==================== 文本提取 ====================

def extract_text(file_bytes: bytes, filename: str, mimetype: str = "") -> str:
    """从上传文件中提取纯文本"""
    fn = filename.lower()
    if fn.endswith(".pdf") or "pdf" in mimetype:
        return _from_pdf(file_bytes)
    if fn.endswith((".docx", ".doc")) or "word" in mimetype or "openxmlformat" in mimetype:
        return _from_word(file_bytes)
    if fn.endswith((".html", ".htm")) or "html" in mimetype:
        return _from_html(file_bytes)
    # fallback: plain text
    return file_bytes.decode("utf-8", errors="ignore")


def _from_pdf(data: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except ImportError:
        pass
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except ImportError:
        pass
    return "[PDF解析失败：请安装 pdfplumber 库（pip install pdfplumber）]"


def _from_word(data: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    except ImportError:
        return "[Word解析失败：请安装 python-docx 库（pip install python-docx）]"
    except Exception as e:
        return f"[Word解析错误: {e}]"


def _from_html(data: bytes) -> str:
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(data, "html.parser")
        for tag in soup(["script", "style"]):
            tag.decompose()
        return soup.get_text(separator="\n", strip=True)
    except ImportError:
        import html as htmllib
        text = data.decode("utf-8", errors="ignore")
        text = re.sub(r"<script[\s\S]*?</script>", "", text, flags=re.IGNORECASE)
        text = re.sub(r"<style[\s\S]*?</style>", "", text, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", "", text)
        return htmllib.unescape(text)


# ==================== LLM 提示词 ====================

_PARSE_PROMPT = """\
你是专业研报分析师。请从以下研报内容中提取关键信息，严格以JSON格式返回，不要有任何其他文字：

研报内容：
{content}

返回格式（无该信息时字段值为 null）：
{{
  "title": "研报标题",
  "institution": "发布机构/券商",
  "publish_date": "发布日期(YYYY-MM-DD)",
  "target_company": "目标公司名称",
  "stock_code": "股票代码",
  "rating": "评级(买入/增持/中性/减持/卖出)",
  "target_price": "目标价(如 25.50)",
  "current_price": "报告时股价",
  "summary": "核心观点摘要(300字以内)",
  "financial_forecasts": {{
    "revenue_growth_2024": "2024营收增速",
    "revenue_growth_2025": "2025营收增速",
    "net_profit_2024": "2024净利润(亿元)",
    "net_profit_2025": "2025净利润(亿元)",
    "pe_2024": "2024年PE",
    "pe_2025": "2025年PE",
    "pb": "PB预测"
  }},
  "risks": ["风险提示1", "风险提示2", "风险提示3"]
}}"""

_COMPARE_PROMPT = """\
你是专业研报分析师。请对以下多份研报进行深度对比分析，严格以JSON格式返回，不要有其他文字：

{reports_content}

返回格式：
{{
  "target_company": "目标公司",
  "reports": [
    {{
      "filename": "文件名",
      "institution": "券商机构",
      "publish_date": "发布日期",
      "rating": "评级",
      "target_price": "目标价",
      "net_profit_2024": "2024净利润预测",
      "net_profit_2025": "2025净利润预测",
      "pe_2024": "2024PE",
      "core_view": "核心观点(100字以内)"
    }}
  ],
  "rating_summary": "评级差异总结",
  "price_summary": "目标价差异总结",
  "profit_summary": "盈利预测差异总结",
  "view_consensus": "观点共识",
  "view_divergence": "主要分歧",
  "most_bullish": "最乐观机构",
  "most_bearish": "最悲观机构",
  "risk_highlights": ["共同风险1", "共同风险2"]
}}"""


# ==================== LLM 调用 ====================

def _call_llm(prompt: str, session_id: str = None) -> str | None:
    try:
        from copaw_bridge import ask_copaw, is_copaw_configured
        if is_copaw_configured():
            r = ask_copaw(prompt, session_id or "report_parser")
            if r:
                return r.get("answer")
    except Exception:
        pass
    try:
        from bailian_qa import ask_bailian_with_prompt, is_bailian_configured
        if is_bailian_configured():
            r = ask_bailian_with_prompt(prompt, session_id or "report_parser")
            if r:
                return r.get("answer")
    except Exception:
        pass
    return None


def _extract_json(text: str) -> dict | None:
    try:
        return json.loads(text)
    except Exception:
        pass
    try:
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            return json.loads(m.group())
    except Exception:
        pass
    return None


# ==================== 解析入口 ====================

def parse_single(text: str, filename: str = "", session_id: str = None) -> dict:
    """解析单份研报，返回结构化数据"""
    content = text[:5000]
    prompt = _PARSE_PROMPT.format(content=content)
    answer = _call_llm(prompt, session_id)
    if answer:
        parsed = _extract_json(answer)
        if parsed:
            return parsed

    # Demo 兜底
    return {
        "title": f"研报解析演示（{filename}）" if filename else "研报解析演示",
        "institution": "某证券研究院",
        "publish_date": "2024-03-15",
        "target_company": "示例科技股份有限公司",
        "stock_code": "000001.SZ",
        "rating": "买入",
        "target_price": "25.50",
        "current_price": "20.00",
        "summary": "（离线演示）公司基本面稳健，营收保持两位数增长，AI 业务快速放量，维持买入评级，目标价25.50元，对应上行空间约27.5%。核心逻辑：①AI产品矩阵持续丰富；②海外市场布局加速；③盈利能力持续改善。",
        "financial_forecasts": {
            "revenue_growth_2024": "18%",
            "revenue_growth_2025": "15%",
            "net_profit_2024": "52亿元",
            "net_profit_2025": "61亿元",
            "pe_2024": "20x",
            "pe_2025": "17x",
            "pb": "2.8x"
        },
        "risks": ["宏观经济下行风险", "市场竞争持续加剧", "政策监管趋严", "汇率波动风险"]
    }


def compare_reports(reports: list, session_id: str = None) -> dict:
    """
    对比多份研报
    reports: [{"filename": str, "text": str}, ...]
    """
    parts = []
    for i, r in enumerate(reports, 1):
        parts.append(f"=== 研报{i}（{r['filename']}）===\n{r['text'][:2000]}")
    reports_content = "\n\n".join(parts)
    prompt = _COMPARE_PROMPT.format(reports_content=reports_content)

    answer = _call_llm(prompt, session_id)
    if answer:
        parsed = _extract_json(answer)
        if parsed:
            return parsed

    # Demo 兜底
    ratings = ["买入", "增持", "中性"]
    return {
        "target_company": "示例科技股份有限公司",
        "reports": [
            {
                "filename": r.get("filename", f"研报{i}"),
                "institution": f"{'中信证券' if i == 1 else '华泰证券' if i == 2 else '国泰君安'}",
                "publish_date": f"2024-0{i}-15",
                "rating": ratings[(i - 1) % 3],
                "target_price": str(22 + i * 2),
                "net_profit_2024": f"{48 + i * 3}亿元",
                "net_profit_2025": f"{56 + i * 3}亿元",
                "pe_2024": f"{18 + i}x",
                "core_view": f"（离线演示）{['中信证券', '华泰证券', '国泰君安'][i-1]}认为公司AI业务有望加速落地，维持{ratings[(i-1)%3]}评级，目标价{22 + i * 2}元。"
            }
            for i, r in enumerate(reports, 1)
        ],
        "rating_summary": "（离线演示）三份研报评级存在一定分歧：中信证券最为乐观（买入），国泰君安相对保守（中性）。",
        "price_summary": "目标价区间24-28元，差异约4元（~16%），反映各家对成长空间判断不一。",
        "profit_summary": "2024年净利润预测区间51-54亿元，2025年预测区间59-62亿元，整体分歧较小。",
        "view_consensus": "公司核心竞争力强，AI业务布局积极，管理层执行力获认可。",
        "view_divergence": "主要分歧在于AI产品商业化落地速度及海外市场拓展节奏。",
        "most_bullish": "中信证券",
        "most_bearish": "国泰君安",
        "risk_highlights": ["宏观经济不确定性", "行业竞争加剧", "汇率波动"]
    }
