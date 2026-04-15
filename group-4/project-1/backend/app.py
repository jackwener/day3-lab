"""
Flask 应用入口
对齐: 08 §1 架构总览, §6 部署架构
"""
import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_smorest import Api
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app():
    """创建 Flask 应用"""
    app = Flask(__name__)
    
    # CORS 配置（教学环境全开放）
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # 文件上传大小限制（研报文件最大 50MB，留余量设 60MB）
    app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024

    # flask-smorest 配置
    app.config["API_TITLE"] = "投研问答助手 API"
    app.config["API_VERSION"] = "v1"
    app.config["OPENAPI_VERSION"] = "3.0.0"
    app.config["OPENAPI_URL_PREFIX"] = "/api/v1"
    app.config["OPENAPI_SWAGGER_UI_PATH"] = "/swagger"
    app.config["OPENAPI_SWAGGER_UI_URL"] = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/"
    
    # 初始化 API
    api = Api(app)
    
    # 注册蓝图
    from blueprints.agent_bp import api as agent_api
    api.register_blueprint(agent_api)
    
    # 确保数据目录存在
    data_dir = os.environ.get("DATA_DIR", "./data")
    os.makedirs(data_dir, exist_ok=True)
    
    logger.info(f"Flask app created, data_dir={data_dir}")
    return app


# 创建应用实例
app = create_app()


if __name__ == '__main__':
    # 开发服务器
    port = int(os.environ.get('PORT', 5003))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
