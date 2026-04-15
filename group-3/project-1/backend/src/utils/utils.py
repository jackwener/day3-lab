import pandas as pd
import os
import time
from datetime import datetime


def format_date(date_str, output_format='%Y%m%d'):
    """格式化日期字符串
    
    Args:
        date_str: 日期字符串
        output_format: 输出日期格式，默认为'yyyyMMdd'
    
    Returns:
        str: 格式化后的日期字符串
    """
    try:
        if isinstance(date_str, str):
            # 处理不同格式的日期
            for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y', '%Y%m%d']:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime(output_format)
                except ValueError:
                    continue
        elif isinstance(date_str, pd.Timestamp):
            return date_str.strftime(output_format)
        return date_str
    except Exception as e:
        return date_str


def format_fund_code(code):
    """格式化基金代码为6位数字
    
    Args:
        code: 基金代码
    
    Returns:
        str: 6位数字的基金代码
    """
    try:
        if isinstance(code, str):
            # 提取所有数字
            digits = ''.join(filter(str.isdigit, code))
        elif isinstance(code, (int, float)):
            # 转换为字符串
            digits = str(int(code))
        else:
            return code
        
        # 补0到6位
        return digits.zfill(6)
    except Exception as e:
        return code


def retry_decorator(max_retries=3, delay=2):
    """重试装饰器
    
    Args:
        max_retries: 最大重试次数
        delay: 重试间隔（秒）
    
    Returns:
        装饰后的函数
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            for retry in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    print(f"{func.__name__} 失败 (尝试 {retry+1}/{max_retries}): {e}")
                    if retry < max_retries - 1:
                        print(f"等待{delay}秒后重试...")
                        time.sleep(delay)
                    else:
                        return None
        return wrapper
    return decorator


def save_to_csv(df, file_path, encoding='utf-8-sig'):
    """保存DataFrame到CSV文件
    
    Args:
        df: DataFrame对象
        file_path: 文件路径
        encoding: 编码格式，默认为utf-8-sig
    
    Returns:
        bool: 保存是否成功
    """
    if df is None:
        return False
    
    try:
        # 确保输出目录存在
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        # 保存到CSV文件
        df.to_csv(file_path, index=False, encoding=encoding)
        print(f"数据已保存到 {file_path}")
        return True
    except Exception as e:
        print(f"保存文件 {file_path} 失败: {e}")
        return False


def load_csv(file_path, encoding='utf-8-sig'):
    """读取CSV文件到DataFrame
    
    Args:
        file_path: 文件路径
        encoding: 编码格式，默认为utf-8-sig
    
    Returns:
        DataFrame: 读取的数据
    """
    try:
        df = pd.read_csv(file_path, encoding=encoding)
        return df
    except Exception as e:
        print(f"读取文件 {file_path} 失败: {e}")
        return None


def print_progress(current, total, prefix="", suffix=""):
    """打印进度
    
    Args:
        current: 当前进度
        total: 总进度
        prefix: 前缀
        suffix: 后缀
    """
    if (current + 1) % 100 == 0 or (current + 1) == total:
        print(f"{prefix} 已处理 {current+1}/{total} {suffix}")


def parse_scale(scale_str):
    """解析规模字符串为数字（单位：亿）
    
    Args:
        scale_str: 规模字符串
    
    Returns:
        float: 规模数字（单位：亿）
    """
    try:
        if isinstance(scale_str, str):
            # 移除逗号并去除首尾空格
            scale_str = scale_str.replace(',', '').strip()
            
            # 处理不同单位
            if '亿' in scale_str:
                # 移除"亿"单位并转换为数字
                scale = float(scale_str.replace('亿', ''))
            elif '万' in scale_str:
                # 移除"万"单位并转换为数字，再除以10000转换为亿
                scale = float(scale_str.replace('万', '')) / 10000
            else:
                # 没有单位，直接转换为数字
                scale = float(scale_str)
            
            return scale
        elif isinstance(scale_str, (int, float)):
            return float(scale_str)
        else:
            return 0
    except Exception as e:
        return 0


def ensure_dir_exists(directory):
    """确保目录存在
    
    Args:
        directory: 目录路径
    """
    os.makedirs(directory, exist_ok=True)


def get_trade_date_map():
    """获取交易日映射
    
    Returns:
        tuple: (trade_date_map, trade_date_before_map)
    """
    try:
        trade_date_df = pd.read_csv(r"e:\codes\fund_analysis\data\trade_date.csv")
        trade_date_df['nature_date'] = pd.to_datetime(trade_date_df['nature_date'])
        trade_date_df['trade_date'] = pd.to_datetime(trade_date_df['trade_date'])
        trade_date_df['trade_date_before'] = pd.to_datetime(trade_date_df['trade_date_before'])
        
        # 创建nature_date到trade_date的映射
        trade_date_map = dict(zip(trade_date_df['nature_date'], trade_date_df['trade_date']))
        # 创建nature_date到trade_date_before的映射
        trade_date_before_map = dict(zip(trade_date_df['nature_date'], trade_date_df['trade_date_before']))
        
        return trade_date_map, trade_date_before_map, trade_date_df
    except Exception as e:
        print(f"获取交易日映射失败: {e}")
        return None, None, None
