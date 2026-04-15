import os
import pandas as pd
import numpy as np

class DataProcessor:
    def __init__(self, data_dir):
        self.data_dir = data_dir
    
    def load_data_by_date(self, date):
        """加载指定日期的所有数据"""
        # 加载标签数据
        label_file = os.path.join(self.data_dir, 'fund_rating_label', f'fund_label_{date}.csv')
        if not os.path.exists(label_file):
            return None
        
        label_df = pd.read_csv(label_file)
        # 确保键列类型一致
        label_df['security_code'] = label_df['security_code'].astype(str)
        label_df['end_date'] = label_df['end_date'].astype(str)
        
        # 加载基金经理特征
        manger_file = os.path.join(self.data_dir, 'fund_rating_input', 'fund_manger', f'fund_manger_{date}.csv')
        if os.path.exists(manger_file):
            manger_df = pd.read_csv(manger_file)
            manger_df['security_code'] = manger_df['security_code'].astype(str)
            manger_df['end_date'] = manger_df['end_date'].astype(str)
            label_df = label_df.merge(manger_df, on=['security_code', 'end_date'], how='left')
        
        # 加载基金规模特征
        position_file = os.path.join(self.data_dir, 'fund_rating_input', 'fund_position', f'fund_position_{date}.csv')
        if os.path.exists(position_file):
            position_df = pd.read_csv(position_file)
            position_df['security_code'] = position_df['security_code'].astype(str)
            position_df['end_date'] = position_df['end_date'].astype(str)
            label_df = label_df.merge(position_df, on=['security_code', 'end_date'], how='left')
        
        # 加载基金收益特征
        return_file = os.path.join(self.data_dir, 'fund_rating_input', 'fund_return', f'fund_return_{date}.csv')
        if os.path.exists(return_file):
            return_df = pd.read_csv(return_file)
            return_df['security_code'] = return_df['security_code'].astype(str)
            return_df['end_date'] = return_df['end_date'].astype(str)
            label_df = label_df.merge(return_df, on=['security_code', 'end_date'], how='left')
        
        # 加载基金风险特征
        risk_file = os.path.join(self.data_dir, 'fund_rating_input', 'fund_risk', f'fund_risk_{date}.csv')
        if os.path.exists(risk_file):
            risk_df = pd.read_csv(risk_file)
            risk_df['security_code'] = risk_df['security_code'].astype(str)
            risk_df['end_date'] = risk_df['end_date'].astype(str)
            label_df = label_df.merge(risk_df, on=['security_code', 'end_date'], how='left')
        
        return label_df
    
    def load_all_data(self):
        """加载所有日期的数据"""
        # 获取所有标签文件
        label_dir = os.path.join(self.data_dir, 'fund_rating_label')
        if not os.path.exists(label_dir):
            return None
        
        all_dfs = []
        for file in os.listdir(label_dir):
            if file.endswith('.csv'):
                date = file.split('_')[-1].split('.')[0]
                df = self.load_data_by_date(date)
                if df is not None:
                    all_dfs.append(df)
        
        if not all_dfs:
            return None
        
        return pd.concat(all_dfs, ignore_index=True)
    
    def preprocess_data(self, df):
        """数据预处理"""
        # 处理缺失值
        df = df.fillna(0)
        
        # 提取特征和标签
        features = df.drop(['security_code', 'end_date', 'information_ratio', 'fund_label'], axis=1)
        labels = df['information_ratio']
        
        return features, labels