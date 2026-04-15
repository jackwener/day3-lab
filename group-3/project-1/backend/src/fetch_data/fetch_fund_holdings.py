import akshare as ak
import pandas as pd
import os
from datetime import datetime
from src.utils import (
    format_fund_code,
    retry_decorator,
    save_to_csv,
    load_csv
)


@retry_decorator(max_retries=3, delay=2)
def fetch_fund_holdings(fund_code, year):
    """获取基金持仓数据
    
    Args:
        fund_code: 基金代码
        year: 年份
    
    Returns:
        DataFrame: 基金持仓数据
    """
    # 使用fund_portfolio_hold_em接口获取基金持仓数据
    df = ak.fund_portfolio_hold_em(symbol=fund_code, date=str(year))
    return df


def process_fund_holdings(df, fund_code, year):
    """处理基金持仓数据
    
    Args:
        df: 基金持仓数据
        fund_code: 基金代码
        year: 年份
    
    Returns:
        DataFrame: 处理后的基金持仓数据
    """
    if df is None:
        return None
    
    # 添加基金代码和年份列
    df['fund_code'] = fund_code
    df['year'] = year
    
    return df


def save_fund_holdings(df, fund_code, year, output_dir):
    """保存基金持仓数据到CSV文件
    
    Args:
        df: 处理后的基金持仓数据
        fund_code: 基金代码
        year: 年份
        output_dir: 输出目录
    """
    if df is None:
        return False
    
    # 确保输出目录存在
    output_dir = os.path.join(output_dir, "fund_holdings")
    
    # 生成输出文件路径
    output_path = os.path.join(output_dir, f"fund_holdings_{fund_code}_{year}.csv")
    
    # 保存到CSV文件
    return save_to_csv(df, output_path)


def load_fund_codes(input_path):
    """从fund_info_use.csv文件中加载基金代码
    
    Args:
        input_path: fund_info_use.csv文件路径
    
    Returns:
        list: 基金代码列表
    """
    df = load_csv(input_path)
    if df is not None and 'fund_code' in df.columns:
        # 确保基金代码为6位数字
        fund_codes = df['fund_code'].apply(format_fund_code).tolist()
        return fund_codes
    else:
        print("fund_info_use.csv文件中没有fund_code列")
        return []


def main():
    """主函数
    
    从fund_info_use.csv中读取基金代码，下载每个基金近5年每年的持仓数据，并保存到对应的CSV文件中
    """
    # 输入文件路径
    input_path = "data/mutual_fund/fund_info_use.csv"
    # 输出目录
    output_dir = "data/mutual_fund"
    
    # 加载基金代码
    fund_codes = load_fund_codes(input_path)
    print(f"共加载到 {len(fund_codes)} 个基金代码")
    
    # 计算近5年的年份
    current_year = datetime.now().year
    years = list(range(current_year - 4, current_year + 1))
    print(f"下载近5年的持仓数据: {years}")
    
    # 下载并保存基金持仓数据
    for i, fund_code in enumerate(fund_codes):
        print(f"\n处理第 {i+1}/{len(fund_codes)} 个基金: {fund_code}")
        
        for year in years:
            print(f"\n下载 {year} 年持仓数据...")
            # 获取基金持仓数据
            holdings_df = fetch_fund_holdings(fund_code, year)
            
            # 处理基金持仓数据
            processed_df = process_fund_holdings(holdings_df, fund_code, year)
            
            # 保存基金持仓数据
            save_fund_holdings(processed_df, fund_code, year, output_dir)


if __name__ == "__main__":
    main()
