import akshare as ak
import pandas as pd
import os
import time
from src.utils import (
    format_fund_code,
    retry_decorator,
    save_to_csv,
    load_csv
)


def get_project_root():
    """获取项目根目录"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    return project_root


def load_fund_codes(data_dir):
    """从基金数据文件中加载基金代码
    
    优先从fund_info_use.csv加载，如果不存在则从fund_purchase.csv或fund_rank.csv加载
    
    Args:
        data_dir: 数据目录路径
    
    Returns:
        list: 基金代码列表
    """
    fund_info_path = os.path.join(data_dir, "fund_info_use.csv")
    fund_purchase_path = os.path.join(data_dir, "fund_purchase.csv")
    fund_rank_path = os.path.join(data_dir, "fund_rank.csv")
    
    if os.path.exists(fund_info_path):
        df = load_csv(fund_info_path)
        if df is not None and 'fund_code' in df.columns:
            fund_codes = df['fund_code'].apply(format_fund_code).tolist()
            print(f"从fund_info_use.csv加载 {len(fund_codes)} 个基金代码")
            return fund_codes
    
    if os.path.exists(fund_purchase_path):
        df = load_csv(fund_purchase_path)
        if df is not None and '基金代码' in df.columns:
            fund_codes = df['基金代码'].apply(format_fund_code).tolist()
            print(f"从fund_purchase.csv加载 {len(fund_codes)} 个基金代码")
            return fund_codes
    
    if os.path.exists(fund_rank_path):
        df = load_csv(fund_rank_path)
        if df is not None and '基金代码' in df.columns:
            fund_codes = df['基金代码'].apply(format_fund_code).tolist()
            print(f"从fund_rank.csv加载 {len(fund_codes)} 个基金代码")
            return fund_codes
    
    print("未找到基金代码数据文件")
    return []


@retry_decorator(max_retries=3, delay=1)
def fetch_fund_fee(fund_code, indicator="申购费率（前端）"):
    """获取基金交易费率
    
    Args:
        fund_code: 基金代码
        indicator: 费率类型，可选值: "交易状态", "申购与赎回金额", "交易确认日", 
                   "运作费用", "认购费率（前端）", "认购费率（后端）", "申购费率（前端）", "赎回费率"
    
    Returns:
        DataFrame: 基金交易费率数据
    """
    df = ak.fund_fee_em(symbol=fund_code, indicator=indicator)
    return df


def main():
    """主函数
    
    根据基金数据文件，逐个下载单个基金的交易费率，所有基金的交易费率保存为一个文件
    """
    print("开始获取基金交易费率数据...")
    
    project_root = get_project_root()
    data_dir = os.path.join(project_root, "data", "mutual_fund")
    output_dir = data_dir
    os.makedirs(output_dir, exist_ok=True)
    
    fund_codes = load_fund_codes(data_dir)
    print(f"共加载到 {len(fund_codes)} 个基金代码")
    
    indicators = ["申购费率（前端）", "赎回费率"]
    
    all_fee_data = []
    
    for i, fund_code in enumerate(fund_codes):
        print(f"处理第 {i+1}/{len(fund_codes)} 个基金: {fund_code}")
        
        for indicator in indicators:
            df = fetch_fund_fee(fund_code, indicator)
            
            if df is not None and not df.empty:
                df['fund_code'] = fund_code
                df['fee_type'] = indicator
                all_fee_data.append(df)
        
        if (i + 1) % 10 == 0:
            time.sleep(0.5)
    
    if all_fee_data:
        result_df = pd.concat(all_fee_data, ignore_index=True)
        
        output_path = os.path.join(output_dir, "fund_fee.csv")
        save_to_csv(result_df, output_path)
        print(f"共保存 {len(result_df)} 条费率数据")
    else:
        print("未获取到任何基金费率数据")


if __name__ == "__main__":
    main()
