"""Mock 股票数据模块"""

import copy
from datetime import datetime, timedelta


def _generate_default_price_history():
    """生成默认的30天价格历史（价格均为0）"""
    history = []
    end_date = datetime(2026, 3, 17)
    for i in range(30):
        date = end_date - timedelta(days=29-i)
        history.append({"date": date.strftime("%Y-%m-%d"), "close": 0.0})
    return history


def _generate_price_history(base_price, volatility=0.02, days=30):
    """生成带波动的价格历史
    
    Args:
        base_price: 基准价格
        volatility: 波动率 (默认2%)
        days: 天数 (默认30天)
    """
    import random
    history = []
    end_date = datetime(2026, 3, 17)
    current_price = base_price
    
    for i in range(days):
        date = end_date - timedelta(days=days-1-i)
        # 随机波动
        change = random.uniform(-volatility, volatility)
        current_price *= (1 + change)
        history.append({"date": date.strftime("%Y-%m-%d"), "close": round(current_price, 2)})
    
    return history


STOCK_DATA = {
    "default": {
        "code": "UNKNOWN",
        "name": "未知股票",
        "current_price": 0.0,
        "change_percent": 0.0,
        "price_history": _generate_default_price_history(),
        "financial_summary": {
            "period": "N/A",
            "revenue": "N/A",
            "net_profit": "N/A",
            "yoy_growth": "N/A"
        },
        "key_events": []
    },
    "SH600519": {
        "code": "SH600519",
        "name": "贵州茅台",
        "current_price": 1688.5,
        "change_percent": 1.26,
        "price_history": [
            {"date": "2026-02-17", "close": 1602.3},
            {"date": "2026-02-18", "close": 1608.5},
            {"date": "2026-02-19", "close": 1615.2},
            {"date": "2026-02-20", "close": 1621.8},
            {"date": "2026-02-23", "close": 1616.4},
            {"date": "2026-02-24", "close": 1624.7},
            {"date": "2026-02-25", "close": 1632.1},
            {"date": "2026-02-26", "close": 1638.9},
            {"date": "2026-02-27", "close": 1645.5},
            {"date": "2026-02-28", "close": 1641.2},
            {"date": "2026-03-03", "close": 1648.6},
            {"date": "2026-03-04", "close": 1654.9},
            {"date": "2026-03-05", "close": 1661.7},
            {"date": "2026-03-06", "close": 1657.4},
            {"date": "2026-03-09", "close": 1665.2},
            {"date": "2026-03-10", "close": 1671.8},
            {"date": "2026-03-11", "close": 1678.4},
            {"date": "2026-03-12", "close": 1672.1},
            {"date": "2026-03-13", "close": 1679.6},
            {"date": "2026-03-16", "close": 1684.2},
            {"date": "2026-03-17", "close": 1680.5},
            {"date": "2026-03-18", "close": 1676.8},
            {"date": "2026-03-19", "close": 1682.9},
            {"date": "2026-03-20", "close": 1687.4},
            {"date": "2026-03-23", "close": 1691.6},
            {"date": "2026-03-24", "close": 1686.3},
            {"date": "2026-03-25", "close": 1683.7},
            {"date": "2026-03-26", "close": 1689.8},
            {"date": "2026-03-27", "close": 1693.2},
            {"date": "2026-03-30", "close": 1688.5},
        ],
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "1741.4亿元",
            "net_profit": "863.5亿元",
            "yoy_growth": "+15.4%",
            "gross_margin": "91.8%",
            "roe": "34.7%",
        },
        "key_events": [
            {"date": "2026-03-28", "event": "披露年度业绩快报，高端产品收入保持稳健增长。"},
            {"date": "2026-03-10", "event": "春季渠道调研显示终端动销平稳，库存维持健康水平。"},
            {"date": "2026-02-21", "event": "公司推进数字化渠道管理，强化直营体系建设。"},
            {"date": "2026-01-30", "event": "春节旺季前完成重点区域发货安排，市场关注批价表现。"},
        ],
    },
    "SZ000858": {
        "code": "SZ000858",
        "name": "五粮液",
        "current_price": 139.8,
        "change_percent": 0.94,
        "price_history": [
            {"date": "2026-02-17", "close": 132.6},
            {"date": "2026-02-18", "close": 133.1},
            {"date": "2026-02-19", "close": 133.8},
            {"date": "2026-02-20", "close": 134.4},
            {"date": "2026-02-23", "close": 133.9},
            {"date": "2026-02-24", "close": 134.7},
            {"date": "2026-02-25", "close": 135.2},
            {"date": "2026-02-26", "close": 135.8},
            {"date": "2026-02-27", "close": 136.3},
            {"date": "2026-02-28", "close": 135.7},
            {"date": "2026-03-03", "close": 136.6},
            {"date": "2026-03-04", "close": 137.1},
            {"date": "2026-03-05", "close": 137.8},
            {"date": "2026-03-06", "close": 137.2},
            {"date": "2026-03-09", "close": 138.1},
            {"date": "2026-03-10", "close": 138.7},
            {"date": "2026-03-11", "close": 139.4},
            {"date": "2026-03-12", "close": 138.8},
            {"date": "2026-03-13", "close": 139.2},
            {"date": "2026-03-16", "close": 139.9},
            {"date": "2026-03-17", "close": 140.4},
            {"date": "2026-03-18", "close": 139.7},
            {"date": "2026-03-19", "close": 139.1},
            {"date": "2026-03-20", "close": 138.6},
            {"date": "2026-03-23", "close": 139.3},
            {"date": "2026-03-24", "close": 139.8},
            {"date": "2026-03-25", "close": 140.2},
            {"date": "2026-03-26", "close": 139.6},
            {"date": "2026-03-27", "close": 140.1},
            {"date": "2026-03-30", "close": 139.8},
        ],
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "873.6亿元",
            "net_profit": "318.2亿元",
            "yoy_growth": "+12.1%",
            "gross_margin": "75.9%",
            "roe": "24.8%",
        },
        "key_events": [
            {"date": "2026-03-25", "event": "公司发布渠道反馈，普五批价整体稳定。"},
            {"date": "2026-03-06", "event": "核心单品春节动销符合预期，宴席场景需求恢复。"},
            {"date": "2026-02-18", "event": "加快经典五粮液市场培育，优化产品结构。"},
            {"date": "2026-01-22", "event": "披露年度经营数据，现金回款表现良好。"},
        ],
    },
    "SH688256": {
        "code": "SH688256",
        "name": "寒武纪",
        "current_price": 1066.0,
        "change_percent": 5.82,
        "price_history": [
            {"date": "2026-02-17", "close": 892.5},
            {"date": "2026-02-18", "close": 905.3},
            {"date": "2026-02-19", "close": 918.7},
            {"date": "2026-02-20", "close": 912.4},
            {"date": "2026-02-23", "close": 928.6},
            {"date": "2026-02-24", "close": 945.2},
            {"date": "2026-02-25", "close": 938.8},
            {"date": "2026-02-26", "close": 952.1},
            {"date": "2026-02-27", "close": 968.5},
            {"date": "2026-02-28", "close": 975.3},
            {"date": "2026-03-03", "close": 988.7},
            {"date": "2026-03-04", "close": 1002.4},
            {"date": "2026-03-05", "close": 995.6},
            {"date": "2026-03-06", "close": 1012.8},
            {"date": "2026-03-09", "close": 1028.3},
            {"date": "2026-03-10", "close": 1045.7},
            {"date": "2026-03-11", "close": 1038.2},
            {"date": "2026-03-12", "close": 1052.6},
            {"date": "2026-03-13", "close": 1068.9},
            {"date": "2026-03-16", "close": 1075.4},
            {"date": "2026-03-17", "close": 1062.8},
            {"date": "2026-03-18", "close": 1055.2},
            {"date": "2026-03-19", "close": 1042.6},
            {"date": "2026-03-20", "close": 1058.3},
            {"date": "2026-03-23", "close": 1072.5},
            {"date": "2026-03-24", "close": 1085.8},
            {"date": "2026-03-25", "close": 1078.4},
            {"date": "2026-03-26", "close": 1065.2},
            {"date": "2026-03-27", "close": 1052.8},
            {"date": "2026-03-30", "close": 1048.5},
            {"date": "2026-03-31", "close": 1055.6},
            {"date": "2026-04-01", "close": 1062.3},
            {"date": "2026-04-02", "close": 1066.0},
        ],
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "64.97亿元",
            "net_profit": "20.59亿元",
            "yoy_growth": "+555.2%",
            "gross_margin": "55.15%",
            "roe": "17.4%",
            "r_and_d_ratio": "20.8%",
            "eps": "4.88元",
        },
        "key_events": [
            {"date": "2026-03-18", "event": "发布2025年年报，营收64.97亿元，同比增长453.21%，净利润扭亏为盈。"},
            {"date": "2026-04-02", "event": "新一代思元芯片商业化落地，订单量大幅增长。"},
            {"date": "2026-03-19", "event": "市场关注国产算力景气度提升，公司订单预期改善。"},
            {"date": "2026-02-27", "event": "披露研发进展，持续投入大模型训练与推理芯片。"},
            {"date": "2026-01-16", "event": "多家券商上调行业景气判断，国产替代逻辑强化。"},
        ],
    },
    "SH600036": {
        "code": "SH600036",
        "name": "招商银行",
        "current_price": 39.26,
        "change_percent": 0.85,
        "price_history": [
            {"date": "2026-02-17", "close": 37.86},
            {"date": "2026-02-18", "close": 37.94},
            {"date": "2026-02-19", "close": 38.12},
            {"date": "2026-02-20", "close": 38.05},
            {"date": "2026-02-23", "close": 38.28},
            {"date": "2026-02-24", "close": 38.45},
            {"date": "2026-02-25", "close": 38.32},
            {"date": "2026-02-26", "close": 38.58},
            {"date": "2026-02-27", "close": 38.72},
            {"date": "2026-02-28", "close": 38.65},
            {"date": "2026-03-03", "close": 38.85},
            {"date": "2026-03-04", "close": 38.96},
            {"date": "2026-03-05", "close": 38.78},
            {"date": "2026-03-06", "close": 39.05},
            {"date": "2026-03-09", "close": 39.18},
            {"date": "2026-03-10", "close": 39.32},
            {"date": "2026-03-11", "close": 39.15},
            {"date": "2026-03-12", "close": 39.28},
            {"date": "2026-03-13", "close": 39.42},
            {"date": "2026-03-16", "close": 39.35},
            {"date": "2026-03-17", "close": 39.18},
            {"date": "2026-03-18", "close": 39.05},
            {"date": "2026-03-19", "close": 39.22},
            {"date": "2026-03-20", "close": 39.38},
            {"date": "2026-03-23", "close": 39.52},
            {"date": "2026-03-24", "close": 39.45},
            {"date": "2026-03-25", "close": 39.28},
            {"date": "2026-03-26", "close": 39.15},
            {"date": "2026-03-27", "close": 39.32},
            {"date": "2026-03-30", "close": 39.45},
            {"date": "2026-03-31", "close": 39.38},
            {"date": "2026-04-01", "close": 39.22},
            {"date": "2026-04-02", "close": 39.35},
            {"date": "2026-04-03", "close": 39.42},
            {"date": "2026-04-08", "close": 39.18},
            {"date": "2026-04-09", "close": 39.26},
        ],
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "3375.32亿元",
            "net_profit": "1501.81亿元",
            "yoy_growth": "+1.21%",
            "gross_margin": "N/A",
            "roe": "13.44%",
            "nonperforming_loan_ratio": "0.94%",
            "capital_adequacy_ratio": "18.4%",
            "dividend_yield": "5.13%",
            "eps": "5.95元",
            "bvps": "43.43元",
        },
        "key_events": [
            {"date": "2026-04-09", "event": "发布2025年年报，营业收入3375.32亿元，归母净利润1501.81亿元，同比+1.21%。"},
            {"date": "2026-03-29", "event": "年报显示零售业务韧性仍在，资产质量保持稳健，不良率0.94%。"},
            {"date": "2026-03-12", "event": "市场关注存款成本下行带来的净息差改善弹性。"},
            {"date": "2026-02-24", "event": "公司推进财富管理客户经营，AUM规模稳步增长。"},
            {"date": "2026-01-31", "event": "披露季度经营情况，不良生成率维持低位。"},
        ],
    },
    # 新增科技股
    "SZ300750": {
        "code": "SZ300750",
        "name": "宁德时代",
        "current_price": 198.5,
        "change_percent": 2.15,
        "price_history": _generate_price_history(190, 0.03),
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "4028.6亿元",
            "net_profit": "441.2亿元",
            "yoy_growth": "+35.2%",
            "gross_margin": "22.8%",
            "roe": "18.6%",
            "r_and_d_ratio": "6.2%",
        },
        "key_events": [
            {"date": "2026-04-05", "event": "发布新一代神行超充电池，充电速度提升40%。"},
            {"date": "2026-03-20", "event": "与欧洲某车企签订长期电池供应协议。"},
            {"date": "2026-03-08", "event": "匈牙利工厂投产，欧洲本地化产能进一步提升。"},
            {"date": "2026-02-15", "event": "披露年度业绩预告，净利润同比增长超35%。"},
        ],
    },
    # 新增医药股
    "SH600276": {
        "code": "SH600276",
        "name": "恒瑞医药",
        "current_price": 48.6,
        "change_percent": -1.2,
        "price_history": _generate_price_history(49, 0.025),
        "financial_summary": {
            "period": "2025年三季报",
            "revenue": "226.8亿元",
            "net_profit": "47.2亿元",
            "yoy_growth": "+8.6%",
            "gross_margin": "86.4%",
            "roe": "12.8%",
            "r_and_d_ratio": "24.1%",
        },
        "key_events": [
            {"date": "2026-04-01", "event": "创新药卡瑞利珠单抗新增适应症获批。"},
            {"date": "2026-03-18", "event": "与美国Biotech公司达成海外授权合作。"},
            {"date": "2026-02-28", "event": "披露研发管线进展，5款创新药进入临床III期。"},
            {"date": "2026-01-20", "event": "集采中标品种保持稳定，市场份额巩固。"},
        ],
    },
    # 新增消费股
    "SZ000333": {
        "code": "SZ000333",
        "name": "美的集团",
        "current_price": 68.9,
        "change_percent": 0.8,
        "price_history": _generate_price_history(68, 0.02),
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "3738.4亿元",
            "net_profit": "356.8亿元",
            "yoy_growth": "+14.3%",
            "gross_margin": "25.6%",
            "roe": "23.4%",
            "operating_cash_flow": "412.6亿元",
        },
        "key_events": [
            {"date": "2026-03-30", "event": "年报披露，ToB业务增长显著，机器人业务加速。"},
            {"date": "2026-03-15", "event": "家电以旧换新政策受益，国内销售恢复增长。"},
            {"date": "2026-02-22", "event": "完成对某机器人公司的战略投资。"},
            {"date": "2026-01-25", "event": "海外市场拓展，东南亚市场份额持续提升。"},
        ],
    },
    # 新增新能源股
    "SH601012": {
        "code": "SH601012",
        "name": "隆基绿能",
        "current_price": 24.8,
        "change_percent": -0.6,
        "price_history": _generate_price_history(25, 0.04),
        "financial_summary": {
            "period": "2025年三季报",
            "revenue": "986.4亿元",
            "net_profit": "-32.6亿元",
            "yoy_growth": "-75.2%",
            "gross_margin": "14.2%",
            "roe": "-5.8%",
            "debt_to_asset_ratio": "58.6%",
        },
        "key_events": [
            {"date": "2026-04-03", "event": "HPBC 2.0电池量产效率突破26.5%。"},
            {"date": "2026-03-22", "event": "光伏行业价格战持续，公司调整产能规划。"},
            {"date": "2026-03-05", "event": "与中东客户签订大额组件订单。"},
            {"date": "2026-02-10", "event": "披露业绩预告，受行业周期影响出现亏损。"},
        ],
    },
    # 新增金融股
    "SH601318": {
        "code": "SH601318",
        "name": "中国平安",
        "current_price": 46.2,
        "change_percent": 1.1,
        "price_history": _generate_price_history(45.5, 0.02),
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "11234.6亿元",
            "net_profit": "1086.4亿元",
            "yoy_growth": "+9.8%",
            "gross_margin": "N/A",
            "roe": "14.2%",
            "core_solvency_ratio": "186.4%",
        },
        "key_events": [
            {"date": "2026-03-28", "event": "年报披露，寿险新业务价值同比增长18.6%。"},
            {"date": "2026-03-10", "event": "综合金融战略成效显现，客户交叉销售率提升。"},
            {"date": "2026-02-20", "event": "平安银行资产质量改善，拨备覆盖率回升。"},
            {"date": "2026-01-18", "event": "推进医疗养老生态建设，赋能主业发展。"},
        ],
    },
    # 新增半导体股
    "SH688981": {
        "code": "SH688981",
        "name": "中芯国际",
        "current_price": 88.6,
        "change_percent": 3.2,
        "price_history": _generate_price_history(85, 0.035),
        "financial_summary": {
            "period": "2025年年报",
            "revenue": "456.8亿元",
            "net_profit": "38.4亿元",
            "yoy_growth": "+23.6%",
            "gross_margin": "21.6%",
            "roe": "5.8%",
            "r_and_d_ratio": "18.4%",
        },
        "key_events": [
            {"date": "2026-04-08", "event": "14nm工艺良率提升至95%，产能利用率满载。"},
            {"date": "2026-03-25", "event": "北京新厂开工建设，预计2027年投产。"},
            {"date": "2026-03-12", "event": "国产替代加速，国内客户订单持续增长。"},
            {"date": "2026-02-28", "event": "披露资本开支计划，全年预计投入420亿元。"},
        ],
    },
}


def get_stock_detail(code: str):
    """根据股票代码获取模拟详情数据
    
    格式非法时返回 None（API 层返回 400）
    格式合法但代码不存在时返回 default 兜底数据
    """
    if not isinstance(code, str):
        return None
    normalized_code = code.strip().upper()
    stock = STOCK_DATA.get(normalized_code)
    if stock is None:
        # 返回 default 兜底数据，但将 code 设置为查询的代码
        default_data = copy.deepcopy(STOCK_DATA["default"])
        default_data["code"] = normalized_code
        return default_data
    return copy.deepcopy(stock)
