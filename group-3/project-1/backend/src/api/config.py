"""Flask 配置类"""

import os


class BaseConfig:
    """基础配置"""
    DEBUG = False
    TESTING = False

    # 项目路径
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
    MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')
    RESULTS_DIR = os.path.join(PROJECT_ROOT, 'results')

    # JSON 配置
    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    """开发环境配置"""
    DEBUG = True


class ProductionConfig(BaseConfig):
    """生产环境配置"""
    DEBUG = False


# 配置映射
config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
