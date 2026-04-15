"""Flask 应用工厂"""

import os
from flask import Flask
from flask_cors import CORS
from flasgger import Swagger

from src.api.config import config_map
from src.api.response import CustomJSONProvider
from src.api.errors import register_error_handlers
from src.api.routes import register_blueprints


def create_app(config_name=None):
    """创建并配置 Flask 应用

    Args:
        config_name: 配置环境名称，默认从环境变量 FLASK_ENV 读取

    Returns:
        配置好的 Flask 应用实例
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_map.get(config_name, config_map['development']))

    # 关闭 Flask 默认的 ASCII 转义，直接输出中文
    app.config['JSON_AS_ASCII'] = False

    # 自定义 JSON 序列化
    app.json_provider_class = CustomJSONProvider
    app.json = CustomJSONProvider(app)

    # 初始化 CORS
    CORS(app)

    # 初始化 Swagger
    Swagger(app, template={
        'swagger': '2.0',
        'info': {
            'title': '基金评级系统 API',
            'description': '基于机器学习的基金评级系统 API，提供基金查询、评级、净值、主题基金等接口',
            'version': '1.0.0',
        },
        'tags': [
            {'name': '基金信息', 'description': '基金基本信息查询、搜索、详情接口'},
            {'name': '基金评级', 'description': '基金评级结果、分布、单只基金评级接口'},
            {'name': '基金净值', 'description': '基金历史净值趋势查询接口'},
            {'name': '局势分析', 'description': '主题基金、小规模基金、时间轴、局势分值接口'},
            {'name': '页面', 'description': '前端静态页面服务'},
        ],
        'securityDefinitions': {},
    })

    # 注册蓝图
    register_blueprints(app)

    # 注册错误处理器
    register_error_handlers(app)

    return app
