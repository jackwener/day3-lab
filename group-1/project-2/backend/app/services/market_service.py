"""
金价服务模块
提供金价查询和历史数据生成功能
使用 AKShare 获取上海黄金交易所真实数据
"""
import json
import os
import random
from datetime import datetime, timedelta

import akshare as ak

from config import Config

CACHE_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'price_cache.json')
CACHE_TTL = 300  # 5分钟缓存


def _read_cache(key, ignore_ttl=False):
    """读取JSON缓存"""
    try:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
            if key in cache:
                entry = cache[key]
                if ignore_ttl:
                    return entry.get('data')
                cached_at = datetime.fromisoformat(entry.get('cached_at', ''))
                ttl = entry.get('ttl', CACHE_TTL)
                if (datetime.now() - cached_at).total_seconds() < ttl:
                    return entry.get('data')
    except Exception:
        pass
    return None


def _write_cache(key, data, ttl=None):
    """写入JSON缓存"""
    try:
        cache = {}
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache = json.load(f)
        cache[key] = {
            'data': data,
            'cached_at': datetime.now().isoformat(),
            'ttl': ttl or CACHE_TTL
        }
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"写入缓存失败: {e}")


def _get_mock_price():
    """
    获取模拟当前金价（降级方案）
    
    Returns:
        dict: 包含价格、货币和更新时间的信息
    """
    base_price = Config.GOLD_BASE_PRICE
    variance = Config.GOLD_PRICE_VARIANCE
    price = round(base_price + random.uniform(-variance, variance), 2)
    
    return {
        "price": price,
        "currency": "CNY",
        "updated_at": datetime.now().isoformat(),
        "source": "MOCK"
    }


def _get_mock_history(range_type):
    """
    获取模拟金价历史数据（降级方案）
    
    Args:
        range_type: 时间范围，可选值："realtime", "1month", "3month"
    
    Returns:
        list: 包含时间戳和价格的点列表
    """
    base_price = Config.GOLD_BASE_PRICE
    now = datetime.now()
    points = []
    
    if range_type == "realtime":
        # 当日24个小时点的分时数据
        date_seed = now.strftime('%Y%m%d')
        random.seed(date_seed)
        
        for hour in range(24):
            timestamp = now.replace(hour=hour, minute=0, second=0, microsecond=0)
            hour_effect = (hour - 12) * 0.3
            price = round(base_price + random.uniform(-3, 3) + hour_effect, 2)
            points.append({
                "timestamp": timestamp.isoformat(),
                "price": price
            })
        
        random.seed()
        
    elif range_type == "1month":
        for day in range(30, 0, -1):
            date = now - timedelta(days=day)
            date_seed = date.strftime('%Y%m%d')
            random.seed(date_seed)
            
            daily_change = random.uniform(-8, 8)
            price = round(base_price + daily_change, 2)
            
            points.append({
                "timestamp": date.strftime('%Y-%m-%d'),
                "price": price
            })
        
        random.seed()
        
    elif range_type == "3month":
        for day in range(90, 0, -1):
            date = now - timedelta(days=day)
            date_seed = date.strftime('%Y%m%d')
            random.seed(date_seed)
            
            daily_change = random.uniform(-12, 12)
            price = round(base_price + daily_change, 2)
            
            points.append({
                "timestamp": date.strftime('%Y-%m-%d'),
                "price": price
            })
        
        random.seed()
    
    return points


def get_current_price():
    """
    获取上海黄金交易所 Au99.99 实时金价
    
    Returns:
        dict: 包含价格、货币和更新时间的信息
    """
    # 先检查缓存
    cached = _read_cache('current_price')
    if cached:
        return cached
    
    try:
        # 调用AKShare获取SGE实时行情
        df = ak.spot_quotations_sge(symbol="Au99.99")
        if df is not None and not df.empty:
            latest = df.iloc[-1]
            # AKShare返回的列名可能是中文，需要适配
            price = float(latest.get('现价', latest.get('最新价', latest.get('close', 0))))
            update_time = str(latest.get('更新时间', datetime.utcnow().isoformat()))
            
            result = {
                'price': round(price, 2),
                'currency': 'CNY',
                'updated_at': update_time,
                'source': 'SGE'
            }
            _write_cache('current_price', result)
            return result
    except Exception as e:
        print(f"AKShare获取金价失败: {e}")
    
    # 降级：返回缓存数据（即使过期）
    expired_cache = _read_cache('current_price', ignore_ttl=True)
    if expired_cache:
        expired_cache['is_cached'] = True
        return expired_cache
    
    # 最终降级：返回模拟数据
    return _get_mock_price()


def get_price_history(range_type):
    """
    获取金价历史数据
    
    Args:
        range_type: 时间范围，可选值："realtime", "1month", "3month"
    
    Returns:
        list: 包含时间戳和价格的点列表
    """
    cached = _read_cache(f'history_{range_type}')
    if cached:
        return cached.get('points', cached)
    
    try:
        if range_type == 'realtime':
            # 实时分时数据 - 尝试获取当日数据
            df = ak.spot_quotations_sge(symbol="Au99.99")
            if df is not None and not df.empty:
                points = []
                for _, row in df.iterrows():
                    points.append({
                        'timestamp': str(row.get('更新时间', '')),
                        'price': float(row.get('现价', row.get('最新价', 0)))
                    })
                result = {'range': range_type, 'points': points}
                _write_cache(f'history_{range_type}', result, ttl=60)
                return points
        else:
            # 历史日线数据
            df = ak.spot_hist_sge(symbol="Au99.99")
            if df is not None and not df.empty:
                # 根据range筛选天数
                days = 30 if range_type == '1month' else 90
                df = df.tail(days)
                points = []
                for _, row in df.iterrows():
                    points.append({
                        'timestamp': str(row.get('date', row.get('日期', ''))),
                        'price': float(row.get('close', row.get('收盘价', 0)))
                    })
                result = {'range': range_type, 'points': points}
                _write_cache(f'history_{range_type}', result, ttl=300)
                return points
    except Exception as e:
        print(f"AKShare获取历史数据失败: {e}")
    
    # 降级：返回模拟数据
    return _get_mock_history(range_type)
