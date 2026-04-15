import akshare as ak
import pandas as pd
import os
import time
from datetime import datetime


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
    def format_fund_code(code):
        try:
            if isinstance(code, str):
                digits = ''.join(filter(str.isdigit, code))
            elif isinstance(code, (int, float)):
                digits = str(int(code))
            else:
                return code
            return digits.zfill(6)
        except Exception as e:
            return code
    
    fund_info_path = os.path.join(data_dir, "fund_info_use.csv")
    fund_purchase_path = os.path.join(data_dir, "fund_purchase.csv")
    fund_rank_path = os.path.join(data_dir, "fund_rank.csv")
    
    if os.path.exists(fund_info_path):
        try:
            df = pd.read_csv(fund_info_path, encoding='utf-8-sig')
            if 'fund_code' in df.columns:
                fund_codes = df['fund_code'].apply(format_fund_code).tolist()
                print(f"从fund_info_use.csv加载 {len(fund_codes)} 个基金代码")
                return fund_codes
        except Exception as e:
            print(f"读取fund_info_use.csv文件失败: {e}")
    
    if os.path.exists(fund_purchase_path):
        try:
            df = pd.read_csv(fund_purchase_path, encoding='utf-8-sig')
            if '基金代码' in df.columns:
                fund_codes = df['基金代码'].apply(format_fund_code).tolist()
                print(f"从fund_purchase.csv加载 {len(fund_codes)} 个基金代码")
                return fund_codes
        except Exception as e:
            print(f"读取fund_purchase.csv文件失败: {e}")
    
    if os.path.exists(fund_rank_path):
        try:
            df = pd.read_csv(fund_rank_path, encoding='utf-8-sig')
            if '基金代码' in df.columns:
                fund_codes = df['基金代码'].apply(format_fund_code).tolist()
                print(f"从fund_rank.csv加载 {len(fund_codes)} 个基金代码")
                return fund_codes
        except Exception as e:
            print(f"读取fund_rank.csv文件失败: {e}")
    
    print("未找到基金代码数据文件")
    return []


def fetch_fund_portfolio_hold(fund_code, year):
    """获取基金持仓数据
    
    Args:
        fund_code: 基金代码
        year: 年份
    
    Returns:
        DataFrame: 基金持仓数据
    """
    max_retries = 3
    for retry in range(max_retries):
        try:
            df = ak.fund_portfolio_hold_em(symbol=fund_code, date=str(year))
            return df
        except Exception as e:
            if retry < max_retries - 1:
                time.sleep(1)
            else:
                return None


def main():
    """主函数
    
    根据基金代码文件，逐个下载单个基金的重仓股数据，并保存到 data/mutual_fund 目录
    """
    print("开始获取基金重仓股数据...")
    
    project_root = get_project_root()
    data_dir = os.path.join(project_root, "data", "mutual_fund")
    output_dir = data_dir
    os.makedirs(output_dir, exist_ok=True)
    
    fund_codes = load_fund_codes(data_dir)
    print(f"共加载到 {len(fund_codes)} 个基金代码")
    
    current_year = datetime.now().year
    years = list(range(current_year - 4, current_year + 1))
    print(f"下载近5年的持仓数据: {years}")
    
    all_data = []
    
    for i, fund_code in enumerate(fund_codes):
        print(f"处理第 {i+1}/{len(fund_codes)} 个基金: {fund_code}")
        
        for year in years:
            df = fetch_fund_portfolio_hold(fund_code, year)
            
            if df is not None and not df.empty:
                df['fund_code'] = fund_code
                df['year'] = year
                if '股票代码' in df.columns:
                    df['股票代码'] = df['股票代码'].apply(lambda x: str(x).zfill(6))
                all_data.append(df)
        
        if (i + 1) % 10 == 0:
            time.sleep(0.5)
    
    if all_data:
        result_df = pd.concat(all_data, ignore_index=True)
        
        output_path = os.path.join(output_dir, "fund_stock.csv")
        result_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"基金重仓股数据已保存到: {output_path}")
        print(f"共保存 {len(result_df)} 条数据")
    else:
        print("未获取到任何基金重仓股数据")


if __name__ == "__main__":
    main()
