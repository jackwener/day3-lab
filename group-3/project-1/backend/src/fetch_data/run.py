import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from src.fetch_data.fetch_fund_info import fetch_all_fund_basic_info, save_fund_info_to_csv

def main():
    """主函数"""
    print("开始获取基金基础信息...")
    
    # 获取所有基金的基本信息
    fund_info_df = fetch_all_fund_basic_info()
    
    # 保存到CSV文件
    output_path = "data/mutual_fund/fund_info.csv"
    save_fund_info_to_csv(fund_info_df, output_path)
    
    print("基金基础信息获取完成！")

if __name__ == "__main__":
    main()
