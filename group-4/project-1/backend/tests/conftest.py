"""
Pytest 配置
"""
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 使用测试数据目录
os.environ["DATA_DIR"] = "./test_data"
