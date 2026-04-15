from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import numpy as np

class ModelTrainer:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
    
    def train(self, features, labels):
        """训练模型"""
        # 分割训练集和测试集
        X_train, X_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=42)
        
        # 训练模型
        self.model.fit(X_train, y_train)
        
        # 评估模型
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f"模型评估结果:")
        print(f"均方误差 (MSE): {mse:.4f}")
        print(f"R² 评分: {r2:.4f}")
        
        return X_test, y_test, y_pred
    
    def predict(self, features):
        """预测信息比率"""
        return self.model.predict(features)
    
    def rate_funds(self, predicted_ratio):
        """将预测的信息比率转换为ABCDE五级评级"""
        # 根据预测的信息比率分位数进行评级
        if isinstance(predicted_ratio, (int, float)):
            # 单个预测值
            if predicted_ratio >= 0.5:
                return 'A'
            elif predicted_ratio >= 0.2:
                return 'B'
            elif predicted_ratio >= 0:
                return 'C'
            elif predicted_ratio >= -0.2:
                return 'D'
            else:
                return 'E'
        else:
            # 多个预测值
            ratings = []
            for ratio in predicted_ratio:
                if ratio >= 0.5:
                    ratings.append('A')
                elif ratio >= 0.2:
                    ratings.append('B')
                elif ratio >= 0:
                    ratings.append('C')
                elif ratio >= -0.2:
                    ratings.append('D')
                else:
                    ratings.append('E')
            return ratings