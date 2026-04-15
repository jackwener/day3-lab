"""
研报解析模块 - 解析 PDF/HTML 研报文件，提取关键信息

支持提取：评级(rating)、目标价(target_price)、股票代码(stock_codes)、
         核心观点(key_points含位置)、摘要(summary)、原文(raw_text)

V2 新增：
- T-01: 股票代码提取正则优化
- T-02: 核心观点原文定位算法
"""

import re
import signal
import os


PARSE_TIMEOUT = 60  # 秒


# ============== T-01: 股票代码提取正则 ==============

# 股票代码匹配模式（多格式支持）
STOCK_CODE_PATTERNS = [
    (r'(SH|SZ)(\d{6})', 'prefix_code'),       # SH600519, SZ000858 - 前缀+代码
    (r'(\d{6})\.(SH|SZ)', 'code_prefix'),      # 600519.SH, 000858.SZ - 代码.后缀
    (r'(?:股票代码|证券代码)[：:]\s*(\d{6})', 'code_only'),  # 股票代码：600519
    (r'(?:代码)[：:]?\s*(\d{6})', 'code_only'),  # 代码 688256
]


def _is_valid_stock_code(code: str) -> bool:
    """
    验证是否为有效股票代码（排除债券代码等）
    
    有效股票代码规则：
    - 60xxxx: 上海主板
    - 688xxx: 上海科创板
    - 00xxxx: 深圳主板
    - 30xxxx: 深圳创业板
    """
    if not code or len(code) != 6:
        return False
    
    # 上海
    if code.startswith(('60', '688', '689')):
        return True
    # 深圳
    if code.startswith(('00', '30', '301')):
        return True
    
    return False


def _normalize_stock_code(code: str, prefix: str = None) -> str:
    """
    标准化股票代码为 SH/SZ + 6位数字格式
    
    Args:
        code: 原始代码（如 600519）
        prefix: 市场前缀（SH/SZ），如未提供则根据代码规则推断
    Returns:
        标准化代码如 "SH600519"
    """
    # 清理代码
    code = code.strip()
    
    # 如果已有前缀，直接返回
    if prefix:
        return f"{prefix}{code}"
    
    # 根据代码规则推断市场
    # 60/68 开头 -> 上海(SH), 00/30 开头 -> 深圳(SZ)
    if code.startswith(('60', '68')):
        return f"SH{code}"
    elif code.startswith(('00', '30')):
        return f"SZ{code}"
    else:
        # 默认返回上海
        return f"SH{code}"


def _extract_stock_codes(text: str) -> list:
    """
    从研报文本中提取股票代码
    
    Args:
        text: 原始文本内容
    Returns:
        标准化股票代码数组，如 ["SH600519", "SZ000858"]
    """
    codes = set()
    
    for pattern, pattern_type in STOCK_CODE_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if pattern_type == 'prefix_code':
                # (SH, 600519) 格式
                prefix, code = match
                if _is_valid_stock_code(code):
                    codes.add(f"{prefix}{code}")
            elif pattern_type == 'code_prefix':
                # (600519, SH) 格式
                code, prefix = match
                if _is_valid_stock_code(code):
                    codes.add(f"{prefix}{code}")
            elif pattern_type == 'code_only':
                # 纯代码，需要推断市场
                if _is_valid_stock_code(match):
                    codes.add(_normalize_stock_code(match))
    
    # 额外扫描：查找独立的6位数字代码（在文本中未被其他模式捕获的）
    # 但需要更严格的上下文判断
    for match in re.finditer(r'\((\d{6})\)|股票[:：]\s*(\d{6})|证券[:：]\s*(\d{6})', text):
        for code in match.groups():
            if code and _is_valid_stock_code(code):
                codes.add(_normalize_stock_code(code))
    
    # 清理文本中的表格标签后再次扫描（处理如 [Table_XXX] 688256 的情况）
    # 移除常见的表格标签
    cleaned_text = re.sub(r'\[Table_[^\]]+\]', ' ', text)
    cleaned_text = re.sub(r'[【\[\]】]', ' ', cleaned_text)
    # 在清理后的文本中查找股票代码模式
    for match in re.finditer(r'[^\d](60\d{4}|00\d{4}|30\d{4}|688\d{3}|689\d{3})[^\d]', cleaned_text):
        code = match.group(1)
        if _is_valid_stock_code(code):
            codes.add(_normalize_stock_code(code))
    
    return sorted(list(codes))


# ============== T-02: 核心观点原文定位算法 ==============

def _find_position_in_text(viewpoint: str, raw_text: str) -> dict:
    """
    定位观点在原文中的位置
    
    Args:
        viewpoint: 观点文本
        raw_text: 原始研报文本
    Returns:
        {text, source_text, position} 对象
        - text: 观点文本
        - source_text: 观点前后各200字符的上下文
        - position: 观点在原文中的字符偏移，未找到时为 None
    """
    position = raw_text.find(viewpoint)
    if position == -1:
        return {
            "text": viewpoint,
            "source_text": "",
            "position": None
        }
    
    # 提取前后各200字符作为上下文
    start = max(0, position - 200)
    end = min(len(raw_text), position + len(viewpoint) + 200)
    source_text = raw_text[start:end]
    
    return {
        "text": viewpoint,
        "source_text": source_text,
        "position": position
    }


def _extract_key_info(text, raw_text=None):
    """
    从文本中提取关键信息：评级、目标价、核心观点（含位置信息）
    
    Args:
        text: 原始文本内容（用于提取评级、目标价）
        raw_text: 原始文本（用于观点定位，如不提供则使用 text）
    Returns:
        dict 包含 rating, target_price, key_points(含位置), summary
    """
    if raw_text is None:
        raw_text = text
    
    # 评级提取 - 支持更多格式
    rating = None
    rating_patterns = [
        r'评级[：:]\s*(买入|增持|持有|中性|减持|卖出|推荐|谨慎推荐|强烈推荐)',
        r'投资评级[：:]\s*(买入|增持|持有|中性|减持|卖出|推荐|谨慎推荐|强烈推荐)',
        r'(买入|增持|持有|中性|减持|卖出)\s*评级',
        r'["""](买入|增持|持有|中性|减持|卖出|推荐|谨慎推荐|强烈推荐)["""]\s*评级',  # "增持"评级
        r'给予[\s"""]*(买入|增持|持有|中性|减持|卖出|推荐|谨慎推荐|强烈推荐)[\s"""]*评级',  # 给予"增持"评级
        r'评级[\s（(]*(买入|增持|持有|中性|减持|卖出|推荐|谨慎推荐|强烈推荐)[\s）)]',  # 评级（增持）
    ]
    for pattern in rating_patterns:
        match = re.search(pattern, text)
        if match:
            rating = match.group(1)
            break

    # 目标价提取
    target_price = None
    price_patterns = [
        r'目标价[：:]\s*(\d+\.?\d*)\s*元',
        r'目标价位[：:]\s*(\d+\.?\d*)\s*元',
        r'目标价\s*(\d+\.?\d*)',
    ]
    for pattern in price_patterns:
        match = re.search(pattern, text)
        if match:
            target_price = match.group(1)
            break

    # 核心观点提取（按句号/换行分割，取前 5 个有意义的句子）
    # T-02: 返回结构改为 object[] 含 text/source_text/position
    key_points = []
    sentences = re.split(r'[。\n]', text)
    for s in sentences:
        s = s.strip()
        if len(s) > 10 and len(s) < 200:
            # 添加位置信息
            position_info = _find_position_in_text(s, raw_text)
            key_points.append(position_info)
            if len(key_points) >= 5:
                break

    # 摘要：取前 500 字符
    summary = text[:500].strip() if text else ""

    return {
        "rating": rating,
        "target_price": target_price,
        "key_points": key_points,
        "summary": summary,
    }


def _parse_pdf(file_path):
    """
    使用 pdfplumber 解析 PDF 文件
    
    Args:
        file_path: PDF 文件路径
    Returns:
        提取的文本内容
    """
    import pdfplumber
    text_parts = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _parse_html(file_path):
    """
    使用 BeautifulSoup 解析 HTML 文件
    
    Args:
        file_path: HTML 文件路径
    Returns:
        提取的文本内容
    """
    from bs4 import BeautifulSoup
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        soup = BeautifulSoup(f.read(), "html.parser")
    # 移除 script 和 style 标签
    for tag in soup(["script", "style"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def normalize_v1_data(extracted_data):
    """
    将 V1 格式的 extracted_data 转换为 V2 格式
    
    V1 格式: key_points 是字符串数组
    V2 格式: key_points 是对象数组，每个元素包含 {text, source_text, position}
    
    Args:
        extracted_data: 原始提取数据字典
    Returns:
        规范化后的 extracted_data 字典
    """
    if not extracted_data:
        return {}
    
    # 确保 stock_codes 字段存在
    if "stock_codes" not in extracted_data:
        extracted_data["stock_codes"] = []
    
    # 检查并转换 key_points 格式
    key_points = extracted_data.get("key_points", [])
    if key_points and isinstance(key_points, list):
        # 检查第一个元素判断格式
        if key_points and isinstance(key_points[0], str):
            # V1 格式: 字符串数组，需要转换为对象数组
            extracted_data["key_points"] = [
                {"text": str_value, "source_text": "", "position": None}
                for str_value in key_points
            ]
        # 如果已经是对象数组（V2格式），直接保留
    
    return extracted_data


def parse_report(file_path, file_type):
    """
    解析研报文件，提取关键信息
    
    Args:
        file_path: 文件路径
        file_type: 文件类型 ('pdf' 或 'html')
    Returns:
        dict: {
            "status": "parsed" | "failed",
            "extracted_data": {
                rating, target_price, stock_codes,
                key_points[{text, source_text, position}],
                summary, raw_text
            } | None,
            "error_message": str | None
        }
    """
    try:
        if not os.path.exists(file_path):
            return {
                "status": "failed",
                "extracted_data": None,
                "error_message": f"文件不存在: {file_path}"
            }

        # 根据文件类型选择解析器
        if file_type == "pdf":
            raw_text = _parse_pdf(file_path)
        elif file_type == "html":
            raw_text = _parse_html(file_path)
        else:
            return {
                "status": "failed",
                "extracted_data": None,
                "error_message": f"不支持的文件类型: {file_type}"
            }

        if not raw_text or not raw_text.strip():
            return {
                "status": "failed",
                "extracted_data": None,
                "error_message": "文件内容为空"
            }

        # T-01: 提取股票代码
        stock_codes = _extract_stock_codes(raw_text)
        
        # 提取关键信息（含位置）
        key_info = _extract_key_info(raw_text, raw_text)
        
        extracted_data = {
            "rating": key_info["rating"],
            "target_price": key_info["target_price"],
            "stock_codes": stock_codes,
            "key_points": key_info["key_points"],
            "summary": key_info["summary"],
            "raw_text": raw_text,
        }

        return {
            "status": "parsed",
            "extracted_data": extracted_data,
            "error_message": None,
        }

    except Exception as e:
        return {
            "status": "failed",
            "extracted_data": None,
            "error_message": str(e),
        }
