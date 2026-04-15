import akshare as ak
import os
import pandas as pd
from datetime import datetime, timedelta


def fetch_trade_date():
    """获取交易日信息并保存到文件"""
    try:
        # 调用接口获取交易日信息
        trade_date_df = ak.tool_trade_date_hist_sina()
        
        # 确保数据目录存在
        data_dir = r"e:\codes\fund_analysis\data"
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        # 保存到文件
        output_path = os.path.join(data_dir, "trade_date.csv")
        trade_date_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"交易日信息已保存到: {output_path}")
        
        return True
    except Exception as e:
        print(f"获取交易日信息失败: {e}")
        return False


def process_trade_date():
    """处理交易日信息，添加nature_date列和trade_date_before列"""
    try:
        # 读取交易日数据
        input_path = r"e:\codes\fund_analysis\data\trade_date.csv"
        trade_date_df = pd.read_csv(input_path)
        
        # 转换为日期格式
        trade_date_df['trade_date'] = pd.to_datetime(trade_date_df['trade_date'])
        trade_dates = trade_date_df['trade_date'].tolist()
        
        # 生成自然日范围
        start_date = datetime(1990, 12, 19)
        end_date = datetime(2026, 12, 31)
        date_range = pd.date_range(start=start_date, end=end_date)
        
        # 创建结果DataFrame
        result = []
        trade_date_index = 0
        
        for nature_date in date_range:
            # 找到第一个大于等于当前自然日的交易日
            while trade_date_index < len(trade_dates) and trade_dates[trade_date_index] < nature_date:
                trade_date_index += 1
            
            # 确定当前自然日对应的交易日
            if trade_date_index < len(trade_dates):
                current_trade_date = trade_dates[trade_date_index]
            else:
                # 如果没有更多交易日，使用最后一个交易日
                current_trade_date = trade_dates[-1] if trade_dates else None
            
            # 判断当前自然日是否为交易日
            is_trading_day = 1 if nature_date.strftime('%Y-%m-%d') == current_trade_date.strftime('%Y-%m-%d') else 0
            
            # 计算trade_date_before
            if is_trading_day:
                # 如果是交易日，trade_date_before就是nature_date
                trade_date_before = nature_date
            else:
                # 如果不是交易日，取上一个交易日
                # 找到最后一个小于nature_date的交易日
                before_index = trade_date_index - 1
                if before_index >= 0:
                    trade_date_before = trade_dates[before_index]
                else:
                    # 如果没有上一个交易日，使用第一个交易日
                    trade_date_before = trade_dates[0] if trade_dates else None
            
            result.append({
                'nature_date': nature_date.strftime('%Y-%m-%d'),
                'trade_date': current_trade_date.strftime('%Y-%m-%d') if current_trade_date else None,
                'is_trading_day': is_trading_day,
                'trade_date_before': trade_date_before.strftime('%Y-%m-%d') if trade_date_before else None
            })
        
        # 转换为DataFrame
        result_df = pd.DataFrame(result)
        
        # 保存到文件
        output_path = r"e:\codes\fund_analysis\data\trade_date.csv"
        result_df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"处理后的交易日信息已保存到: {output_path}")
        
        return True
    except Exception as e:
        print(f"处理交易日信息失败: {e}")
        return False


def main():
    """主函数"""
    print("开始获取交易日信息...")
    success = fetch_trade_date()
    if success:
        print("获取交易日信息成功！")
        print("开始处理交易日信息...")
        process_success = process_trade_date()
        if process_success:
            print("处理交易日信息成功！")
        else:
            print("处理交易日信息失败！")
    else:
        print("获取交易日信息失败！")


if __name__ == "__main__":
    main()
