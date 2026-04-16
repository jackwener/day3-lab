"""
assess_risk_level 函数单元测试
"""
from app.routers.situation import assess_risk_level


def test_high_risk_by_stock_ratio():
    """股票占比 > 70% → 高风险"""
    result = assess_risk_level({"stock_ratio": 80, "keywords": ["成长"]})
    assert result == "高风险"


def test_medium_risk_by_stock_ratio():
    """股票占比 30%-70% → 中风险"""
    result = assess_risk_level({"stock_ratio": 50})
    assert result == "中风险"


def test_low_risk_by_stock_ratio():
    """股票占比 < 30% → 低风险"""
    result = assess_risk_level({"stock_ratio": 20})
    assert result == "低风险"


def test_high_risk_by_keyword():
    """包含"杠杆"关键词 → 直接高风险（即使股票占比很低）"""
    result = assess_risk_level({"stock_ratio": 10, "keywords": ["杠杆"]})
    assert result == "高风险"
