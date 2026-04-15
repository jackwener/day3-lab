"""
Flask应用工厂模块
"""
import os

from flask import Flask
from flask_cors import CORS

from config import config


def create_app(config_name=None):
    """
    创建Flask应用实例
    
    Args:
        config_name: 配置环境名称，默认从环境变量获取或使用development
    
    Returns:
        Flask: Flask应用实例
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # 创建Flask应用
    app = Flask(__name__)
    
    # 加载配置
    app_config = config.get(config_name, config['default'])
    app.config.from_object(app_config)
    
    # 确保数据目录存在
    os.makedirs(app_config.DATA_DIR, exist_ok=True)
    
    # 配置CORS
    CORS(app, origins=app_config.CORS_ORIGINS)
    
    # 注册蓝图
    from app.routes.market_bp import market_bp
    from app.routes.ocr_bp import ocr_bp
    
    app.register_blueprint(market_bp)
    app.register_blueprint(ocr_bp)
    
    # 根路由 - 健康检查
    @app.route('/')
    def health_check():
        return {
            "status": "ok",
            "service": "goldchan-backend",
            "version": "1.0.0"
        }
    
    return app
