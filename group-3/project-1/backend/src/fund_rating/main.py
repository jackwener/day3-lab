import os
import sys
from data_processor import DataProcessor
from model_trainer import ModelTrainer
import pandas as pd

# 项目根目录
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
# 数据目录
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')

def main():
    """主函数"""
    print("开始基金评级机器学习分析...")
    
    # 初始化数据处理器
    data_processor = DataProcessor(DATA_DIR)
    
    # 加载所有数据
    print("加载数据中...")
    all_data = data_processor.load_all_data()
    
    if all_data is None:
        print("未找到数据文件，请检查数据目录结构。")
        return
    
    print(f"加载到 {len(all_data)} 条数据")
    
    # 数据预处理
    print("数据预处理中...")
    features, labels = data_processor.preprocess_data(all_data)
    
    print(f"特征维度: {features.shape}")
    print(f"标签维度: {labels.shape}")
    
    # 初始化模型训练器
    model_trainer = ModelTrainer()
    
    # 训练模型
    print("训练模型中...")
    X_test, y_test, y_pred = model_trainer.train(features, labels)
    
    # 生成评级
    print("生成基金评级...")
    ratings = model_trainer.rate_funds(y_pred)
    
    # 展示结果
    print("\n预测结果示例:")
    results = pd.DataFrame({
        '真实信息比率': y_test.values,
        '预测信息比率': y_pred,
        '评级': ratings
    })
    print(results.head(10))
    
    # 统计评级分布
    rating_counts = results['评级'].value_counts().sort_index()
    print("\n评级分布:")
    for rating, count in rating_counts.items():
        print(f"{rating}级: {count} 个")
    
    print("\n基金评级机器学习分析完成！")

if __name__ == "__main__":
    main()