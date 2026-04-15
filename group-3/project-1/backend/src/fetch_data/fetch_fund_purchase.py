import akshare as ak
import pandas as pd
import os


def get_project_root():
    """获取项目根目录"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    return project_root


def fetch_fund_purchase():
    """获取基金申赎状态数据
    
    Returns:
        DataFrame: 基金申赎状态数据
    """
    try:
        df = ak.fund_purchase_em()
        return df
    except Exception as e:
        print(f"获取基金申赎状态数据失败: {e}")
        return None


def save_fund_purchase(df, output_dir):
    """保存基金申赎状态数据到CSV文件
    
    Args:
        df: 基金申赎状态数据
        output_dir: 输出目录
    """
    if df is None:
        return False
    
    os.makedirs(output_dir, exist_ok=True)
    
    if '基金代码' in df.columns:
        df['基金代码'] = df['基金代码'].apply(lambda x: str(x).zfill(6))
    
    output_path = os.path.join(output_dir, "fund_purchase.csv")
    
    try:
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"基金申赎状态数据已保存到: {output_path}")
        return True
    except Exception as e:
        print(f"保存基金申赎状态数据失败: {e}")
        return False


def main():
    """主函数
    
    调用 fund_purchase_em 接口下载全量基金申赎状态数据，并保存到 data/mutual_fund 目录
    """
    print("开始获取基金申赎状态数据...")
    
    df = fetch_fund_purchase()
    
    if df is not None:
        print(f"成功获取 {len(df)} 条基金申赎状态数据")
        
        project_root = get_project_root()
        output_dir = os.path.join(project_root, "data", "mutual_fund")
        success = save_fund_purchase(df, output_dir)
        
        if success:
            print("保存基金申赎状态数据成功！")
        else:
            print("保存基金申赎状态数据失败！")
    else:
        print("获取基金申赎状态数据失败！")


if __name__ == "__main__":
    main()
