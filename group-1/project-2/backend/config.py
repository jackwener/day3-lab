import os


class Config:
    """基础配置类"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # 数据目录配置
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, 'data')
    
    # CORS配置
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # 金价缓存配置
    PRICE_CACHE_FILE = os.path.join(DATA_DIR, 'price_cache.json')
    PRICE_CACHE_TTL = 300  # 5分钟缓存
    
    # 金价基准配置
    GOLD_BASE_PRICE = 1060  # 基准价 元/克
    GOLD_PRICE_VARIANCE = 5  # 波动范围 ±5元


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')


class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = True
    TESTING = True
    PRICE_CACHE_FILE = os.path.join(Config.DATA_DIR, 'test_price_cache.json')


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
