"""AkShare 真实数据 Provider — 带缓存"""
import time
import traceback
import akshare as ak
import pandas as pd

# ============ 简易内存缓存 ============
_cache = {}
CACHE_TTL = 300  # 5 分钟


def _get_cached(key, fetcher):
    """带 TTL 的缓存包装"""
    now = time.time()
    if key in _cache and now - _cache[key]["ts"] < CACHE_TTL:
        return _cache[key]["data"]
    try:
        data = fetcher()
        _cache[key] = {"data": data, "ts": now}
        return data
    except Exception as e:
        print(f"[akshare_provider] {key} fetch error: {e}")
        traceback.print_exc()
        # 如果缓存里有旧数据，返回旧数据
        if key in _cache:
            return _cache[key]["data"]
        return None


# ============ 基金基本信息 ============
def get_fund_info(fund_code: str) -> dict | None:
    """获取基金基本信息（雪球数据源）"""
    def fetch():
        df = ak.fund_individual_basic_info_xq(symbol=fund_code)
        info = {}
        for _, row in df.iterrows():
            info[row["item"]] = row["value"]
        return info

    raw = _get_cached(f"fund_info_{fund_code}", fetch)
    if not raw:
        return None

    fund_type_raw = raw.get("基金类型", "混合型")
    if "混合" in fund_type_raw:
        fund_type = "混合型"
    elif "股票" in fund_type_raw:
        fund_type = "股票型"
    elif "指数" in fund_type_raw:
        fund_type = "指数型"
    elif "债券" in fund_type_raw:
        fund_type = "债券型"
    elif "货币" in fund_type_raw:
        fund_type = "货币型"
    else:
        fund_type = fund_type_raw

    return {
        "fund_code": fund_code,
        "fund_name": raw.get("基金名称", ""),
        "fund_type": fund_type,
        "manager": raw.get("基金经理", ""),
        "company": raw.get("基金公司", "").replace("管理有限公司", ""),
        "scale": raw.get("最新规模", ""),
        "established": raw.get("成立时间", ""),
    }


# ============ 基金净值(最新) ============
_fund_daily_cache = {"data": None, "ts": 0}


def _get_fund_daily_df():
    """获取全部开放基金每日净值表（缓存5分钟）"""
    now = time.time()
    if _fund_daily_cache["data"] is not None and now - _fund_daily_cache["ts"] < CACHE_TTL:
        return _fund_daily_cache["data"]
    try:
        df = ak.fund_open_fund_daily_em()
        _fund_daily_cache["data"] = df
        _fund_daily_cache["ts"] = now
        return df
    except Exception as e:
        print(f"[akshare_provider] fund_open_fund_daily_em error: {e}")
        return _fund_daily_cache.get("data")


def get_fund_nav(fund_code: str) -> dict | None:
    """获取基金最新净值和日涨幅"""
    df = _get_fund_daily_df()
    if df is None:
        return None
    row = df[df["基金代码"] == fund_code]
    if row.empty:
        return None
    r = row.iloc[0]
    nav = r.iloc[2]  # 最新单位净值
    change_str = r.get("日增长率", "0")
    try:
        nav_change = float(change_str) if pd.notna(change_str) else 0
    except (ValueError, TypeError):
        nav_change = 0
    try:
        nav_val = float(nav) if pd.notna(nav) else 0
    except (ValueError, TypeError):
        nav_val = 0
    return {"nav": nav_val, "nav_change": nav_change}


# ============ 基金排行（含收益率）============
_fund_rank_cache = {"data": None, "ts": 0}


def _get_fund_rank_df():
    """获取基金排行数据"""
    now = time.time()
    if _fund_rank_cache["data"] is not None and now - _fund_rank_cache["ts"] < CACHE_TTL:
        return _fund_rank_cache["data"]
    try:
        df = ak.fund_open_fund_rank_em(symbol="全部")
        _fund_rank_cache["data"] = df
        _fund_rank_cache["ts"] = now
        return df
    except Exception as e:
        print(f"[akshare_provider] fund_open_fund_rank_em error: {e}")
        return _fund_rank_cache.get("data")


def get_fund_returns(fund_code: str) -> dict | None:
    """从排行表获取基金收益率"""
    df = _get_fund_rank_df()
    if df is None:
        return None
    row = df[df["基金代码"] == fund_code]
    if row.empty:
        return None
    r = row.iloc[0]

    def safe_float(val):
        try:
            return round(float(val), 2) if pd.notna(val) else 0
        except (ValueError, TypeError):
            return 0

    return {
        "month_1": safe_float(r.get("近1月")),
        "month_3": safe_float(r.get("近3月")),
        "month_6": safe_float(r.get("近6月")),
        "year_1": safe_float(r.get("近1年")),
        "year_3": safe_float(r.get("近3年")),
        "since_inception": safe_float(r.get("成立来")),
    }


def get_fund_rank_list(page=1, page_size=10) -> dict:
    """获取基金排行列表"""
    df = _get_fund_rank_df()
    if df is None:
        return {"list": [], "total": 0, "page": page, "page_size": page_size}

    total = len(df)
    start = (page - 1) * page_size
    end = start + page_size
    subset = df.iloc[start:end]

    def safe_float(val):
        try:
            return round(float(val), 2) if pd.notna(val) else 0
        except (ValueError, TypeError):
            return 0

    result = []
    for _, r in subset.iterrows():
        result.append({
            "fund_code": r.get("基金代码", ""),
            "fund_name": r.get("基金简称", ""),
            "fund_type": "混合型",  # 排行接口无类型字段，后续可补
            "nav": safe_float(r.get("单位净值")),
            "day_change": safe_float(r.get("日增长率")),
            "week_change": safe_float(r.get("近1周")),
            "month_change": safe_float(r.get("近1月")),
            "year_change": safe_float(r.get("近1年")),
            "scale": "",
            "risk_level": "中",
        })

    return {"list": result, "total": total, "page": page, "page_size": page_size}


# ============ 基金持仓 ============
def get_fund_holdings(fund_code: str) -> list:
    """获取基金前十大持仓"""
    def fetch():
        df = ak.fund_portfolio_hold_em(symbol=fund_code, date="2024")
        if df is None or df.empty:
            return []
        # 取最新一个季度的数据
        latest_q = df["季度"].iloc[0]
        df_q = df[df["季度"] == latest_q].head(10)
        holdings = []
        for _, r in df_q.iterrows():
            weight = r.get("占净值比例", 0)
            try:
                weight = round(float(weight), 2)
            except (ValueError, TypeError):
                weight = 0
            
            stock_code = str(r.get("股票代码", ""))
            # 通过股票代码获取行业信息
            industry = _get_stock_industry(stock_code)
            
            holdings.append({
                "stock_name": r.get("股票名称", ""),
                "stock_code": stock_code,
                "industry": industry,
                "weight": weight,
            })
        return holdings

    result = _get_cached(f"fund_holdings_{fund_code}", fetch)
    return result or []


# ============ 股票行业信息 ============
def _get_stock_industry(stock_code: str) -> str:
    """获取股票所属行业（带缓存）"""
    if not stock_code:
        return ""
    
    def fetch():
        try:
            # 使用东财个股资料接口获取行业信息
            df = ak.stock_individual_info_em(symbol=stock_code)
            if df is not None and not df.empty:
                # 查找行业相关字段
                industry_row = df[df["item"].str.contains("行业", na=False)]
                if not industry_row.empty:
                    return industry_row.iloc[0]["value"]
            return ""
        except Exception as e:
            print(f"[akshare_provider] get stock industry error for {stock_code}: {e}")
            return ""
    
    return _get_cached(f"stock_industry_{stock_code}", fetch) or ""


# ============ 指数行情（备用方案：直接请求东财接口） ============
def get_market_indices() -> list:
    """获取大盘指数"""
    def fetch():
        import requests
        indices = [
            {"code": "1.000001", "name": "上证指数"},
            {"code": "0.399001", "name": "深证成指"},
            {"code": "0.399006", "name": "创业板指"},
            {"code": "1.000300", "name": "沪深300"},
        ]
        codes = ",".join([i["code"] for i in indices])
        url = f"https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f2,f3,f6,f12,f14&secids={codes}"
        headers = {"User-Agent": "Mozilla/5.0", "Referer": "https://quote.eastmoney.com/"}
        resp = requests.get(url, headers=headers, timeout=10)
        data = resp.json()
        result = []
        if data.get("data") and data["data"].get("diff"):
            for item in data["data"]["diff"]:
                result.append({
                    "name": item.get("f14", ""),
                    "value": item.get("f2", 0) / 100 if isinstance(item.get("f2"), int) else item.get("f2", 0),
                    "change": item.get("f3", 0) / 100 if isinstance(item.get("f3"), int) else item.get("f3", 0),
                    "volume": f"{item.get('f6', 0) / 100000000:.0f}亿" if item.get("f6") else "0亿",
                })
        return result

    result = _get_cached("market_indices", fetch)
    return result or []
