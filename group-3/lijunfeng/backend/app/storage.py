"""
JSON 文件存储层
提供对数据文件的读写操作
"""
import json
import os
from typing import List, Dict, Optional, Any
from pathlib import Path

# 数据文件目录
DATA_DIR = Path(__file__).parent.parent / "data"


def _get_file_path(filename: str) -> Path:
    """获取数据文件的完整路径"""
    return DATA_DIR / filename


def _read_json_file(filename: str) -> Any:
    """
    读取 JSON 文件
    
    Args:
        filename: 文件名
        
    Returns:
        解析后的 JSON 数据
        
    Raises:
        FileNotFoundError: 文件不存在
        json.JSONDecodeError: JSON 解析错误
    """
    file_path = _get_file_path(filename)
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def _write_json_file(filename: str, data: Any) -> None:
    """
    写入 JSON 文件
    
    Args:
        filename: 文件名
        data: 要写入的数据
    """
    file_path = _get_file_path(filename)
    # 确保目录存在
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ==================== Timeline 操作 ====================

def get_all_timeline() -> List[Dict]:
    """获取所有时间线数据"""
    return _read_json_file("timeline.json")


def get_timeline_by_week(week: int) -> Optional[Dict]:
    """
    根据周编号获取时间线数据
    
    Args:
        week: 周编号
        
    Returns:
        周数据，如果不存在返回 None
    """
    timeline = get_all_timeline()
    for item in timeline:
        if item.get("weekNumber") == week:
            return item
    return None


def get_latest_week() -> int:
    """获取最新的周编号"""
    timeline = get_all_timeline()
    if not timeline:
        return 1
    return max(item.get("weekNumber", 0) for item in timeline)


# ==================== Thematic Funds 操作 ====================

def get_all_thematic_funds() -> List[Dict]:
    """获取所有主题基金数据"""
    return _read_json_file("thematic_funds.json")


def get_thematic_funds_by_week(week: int) -> List[Dict]:
    """
    根据周编号获取主题基金数据
    
    Args:
        week: 周编号
        
    Returns:
        该周的主题基金列表
    """
    funds = get_all_thematic_funds()
    return [f for f in funds if f.get("weekNumber") == week]


# ==================== Small Scale Funds 操作 ====================

def get_all_small_scale_funds() -> List[Dict]:
    """获取所有小规模基金数据"""
    return _read_json_file("small_scale_funds.json")


def get_small_scale_funds_by_week(week: int, limit: int = 5) -> List[Dict]:
    """
    根据周编号获取小规模基金数据
    
    Args:
        week: 周编号
        limit: 返回数量限制
        
    Returns:
        该周的小规模基金列表
    """
    funds = get_all_small_scale_funds()
    week_funds = [f for f in funds if f.get("weekNumber") == week]
    return week_funds[:limit]


# ==================== Fund NAV 操作 ====================

def get_all_fund_nav() -> List[Dict]:
    """获取所有基金净值数据"""
    return _read_json_file("fund_nav.json")


def get_fund_nav_by_code(fund_code: str) -> List[Dict]:
    """
    根据基金代码获取净值数据
    
    Args:
        fund_code: 基金代码
        
    Returns:
        该基金的净值数据列表
    """
    nav_data = get_all_fund_nav()
    return [n for n in nav_data if n.get("fundCode") == fund_code]


def get_fund_nav_by_code_and_period(fund_code: str, period: str) -> List[Dict]:
    """
    根据基金代码和时间段获取净值数据
    
    Args:
        fund_code: 基金代码
        period: 时间段 (1m/3m/6m/1y)
        
    Returns:
        该时间段内的净值数据列表
    """
    all_nav = get_fund_nav_by_code(fund_code)
    
    # 按日期排序
    all_nav.sort(key=lambda x: x.get("navDate", ""), reverse=True)
    
    # 根据 period 限制返回数量
    period_days = {
        "1m": 22,   # 约1个月交易日
        "3m": 66,   # 约3个月交易日
        "6m": 132,  # 约6个月交易日
        "1y": 252   # 约1年交易日
    }
    
    days = period_days.get(period, 66)  # 默认3个月
    return all_nav[:days]


def get_fund_name_by_code(fund_code: str) -> Optional[str]:
    """
    根据基金代码获取基金名称
    
    Args:
        fund_code: 基金代码
        
    Returns:
        基金名称，如果不存在返回 None
    """
    # 从主题基金中查找
    thematic = get_all_thematic_funds()
    for f in thematic:
        if f.get("fundCode") == fund_code:
            return f.get("fundName")
    
    # 从小规模基金中查找
    small_scale = get_all_small_scale_funds()
    for f in small_scale:
        if f.get("fundCode") == fund_code:
            return f.get("fundName")
    
    return None


# ==================== Situation 操作 ====================

def get_situation_data() -> Dict:
    """获取局势数据"""
    return _read_json_file("situation_cache.json")
