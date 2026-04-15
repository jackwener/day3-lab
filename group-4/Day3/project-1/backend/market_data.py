"""
实时行情数据 — 新浪财经接口代理
"""
import re
import logging
import requests

logger = logging.getLogger(__name__)

SINA_HQ_URL = "http://hq.sinajs.cn/list="

# 字段顺序（新浪接口标准格式）
FIELD_NAMES = [
    "name", "open", "prev_close", "current", "high", "low",
    "bid", "ask", "volume", "amount",
    "bid1_vol", "bid1_price", "bid2_vol", "bid2_price",
    "bid3_vol", "bid3_price", "bid4_vol", "bid4_price",
    "bid5_vol", "bid5_price",
    "ask1_vol", "ask1_price", "ask2_vol", "ask2_price",
    "ask3_vol", "ask3_price", "ask4_vol", "ask4_price",
    "ask5_vol", "ask5_price",
    "date", "time"
]

# 常见股票/指数别名
STOCK_ALIASES = {
    "贵州茅台": "sh600519", "茅台": "sh600519",
    "宁德时代": "sz300750", "宁德": "sz300750",
    "中国平安": "sh601318", "平安": "sh601318",
    "招商银行": "sh600036", "招商": "sh600036",
    "比亚迪": "sz002594",
    "工商银行": "sh601398", "工行": "sh601398",
    "建设银行": "sh601939", "建行": "sh601939",
    "中国银行": "sh601988",
    "农业银行": "sh601288",
    "中国石油": "sh601857",
    "中国石化": "sh600028",
    "中国移动": "sh600941",
    "格力电器": "sz000651", "格力": "sz000651",
    "美的集团": "sz000333", "美的": "sz000333",
    "隆基绿能": "sh601012", "隆基": "sh601012",
    "五粮液": "sz000858",
    "泸州老窖": "sz000568",
    "长江电力": "sh600900",
    "中国建筑": "sh601668",
    "海天味业": "sh603288",
    "恒瑞医药": "sh600276",
    "大秦铁路": "sh601006",
    "东方财富": "sz300059",
    "迈瑞医疗": "sz300760",
    "三一重工": "sh600031",
    "上证指数": "sh000001", "上证": "sh000001",
    "深证成指": "sz399001", "深证": "sz399001",
    "创业板指": "sz399006", "创业板": "sz399006",
    "沪深300": "sh000300",
    "科创50": "sh000688",
    "中证500": "sh000905",
}


def normalize_code(raw: str) -> str:
    """将输入（名称/代码）标准化为新浪格式，如 sh600519"""
    # 先查别名
    for alias, code in STOCK_ALIASES.items():
        if alias in raw:
            return code

    s = raw.strip().lower()
    # 已有前缀
    if s.startswith(("sh", "sz", "hk")):
        return s

    # 提取数字部分
    digits = re.sub(r"\D", "", s)
    if digits:
        if digits.startswith("6"):
            return f"sh{digits}"
        elif digits.startswith(("0", "3", "2")):
            return f"sz{digits}"
        elif digits.startswith("8"):
            return f"sz{digits}"
        return f"sh{digits}"

    return raw.strip()


def parse_query_codes(query: str) -> list:
    """从自然语言中提取一到多个股票代码"""
    found = []
    for alias, code in STOCK_ALIASES.items():
        if alias in query and code not in found:
            found.append(code)

    # 再提取 6 位数字
    for m in re.finditer(r"\b\d{6}\b", query):
        code = normalize_code(m.group())
        if code not in found:
            found.append(code)

    return found or ["sh000001"]  # 默认上证指数


def fetch_one(stock_code: str) -> dict | None:
    """获取单只股票/指数实时行情"""
    normalized = normalize_code(stock_code)
    url = f"{SINA_HQ_URL}{normalized}"
    headers = {
        "Referer": "https://finance.sina.com.cn",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.encoding = "gbk"

        # 解析: var hq_str_sh600519="贵州茅台,1800.00,...";
        m = re.search(r'"([^"]+)"', resp.text)
        if not m or not m.group(1).strip():
            return None

        values = [v.strip() for v in m.group(1).split(",")]
        if len(values) < 32:
            return None

        data = {FIELD_NAMES[i]: values[i] for i in range(min(len(FIELD_NAMES), len(values)))}
        data["code"] = normalized

        try:
            curr = float(data.get("current", 0))
            prev = float(data.get("prev_close", 0))
            data["change"] = round(curr - prev, 2)
            data["change_pct"] = round((curr - prev) / prev * 100, 2) if prev else 0.0
        except (ValueError, ZeroDivisionError):
            data["change"] = 0
            data["change_pct"] = 0.0

        return data

    except Exception as e:
        logger.warning(f"fetch_one({stock_code}) failed: {e}")
        return None


def fetch_market_data(query: str) -> dict:
    """
    主入口：解析查询 → 批量获取行情 → 返回结构化结果

    Returns:
        {
          "query": str,
          "stocks": [
            {
              "code": str, "name": str, "current": str, "change": float,
              "change_pct": float, "open": str, "high": str, "low": str,
              "prev_close": str, "volume": str, "amount": str,
              "date": str, "time": str
            }, ...
          ],
          "demo": bool   # True 表示接口无数据，返回演示数据
        }
    """
    codes = parse_query_codes(query)
    stocks = []
    for code in codes:
        data = fetch_one(code)
        if data:
            stocks.append({
                "code": data.get("code"),
                "name": data.get("name", ""),
                "current": data.get("current", "0"),
                "change": data.get("change", 0),
                "change_pct": data.get("change_pct", 0),
                "open": data.get("open", "0"),
                "high": data.get("high", "0"),
                "low": data.get("low", "0"),
                "prev_close": data.get("prev_close", "0"),
                "volume": data.get("volume", "0"),
                "amount": data.get("amount", "0"),
                "date": data.get("date", ""),
                "time": data.get("time", ""),
            })

    if stocks:
        return {"query": query, "stocks": stocks, "demo": False}

    # 接口不可用时返回演示数据
    return {
        "query": query,
        "demo": True,
        "stocks": [
            {
                "code": "sh600519",
                "name": "贵州茅台",
                "current": "1780.50",
                "change": 12.30,
                "change_pct": 0.70,
                "open": "1770.00",
                "high": "1795.00",
                "low": "1768.00",
                "prev_close": "1768.20",
                "volume": "3521600",
                "amount": "6261000000",
                "date": "2024-03-15",
                "time": "15:00:00",
            }
        ],
    }
