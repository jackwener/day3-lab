# -*- coding: utf-8 -*-
"""Flask应用工厂"""

from flask import Flask
from flask_cors import CORS
from flasgger import Swagger

from app.extensions import db, migrate
from app.utils.errors import register_error_handlers


def create_app(config_name='default'):
    """创建Flask应用"""
    from app.config import config
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Swagger
    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": 'apispec',
                "route": '/apispec.json',
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs"
    }
    Swagger(app, config=swagger_config)
    
    # 初始化扩展
    db.init_app(app)
    migrate.init_app(app, db)
    
    # 注册错误处理器
    register_error_handlers(app)
    
    # 注册蓝图
    from app.routes import dashboard_bp, review_bp, rule_bp
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(rule_bp)
    
    # 初始化服务
    from app.services import file_service, review_service, ai_service, export_service, rule_service
    file_service.init_app(app)
    for svc in [review_service, ai_service, export_service]:
        if hasattr(svc, 'init_app'):
            svc.init_app(app)
    
    # 初始化数据库
    with app.app_context():
        db.create_all()
        
        # 初始化内置规则
        rule_service.init_builtin_rules()
    
    return app
