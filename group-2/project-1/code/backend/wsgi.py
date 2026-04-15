"""Flask 应用工厂入口 (对齐 TASK-01 S2.3)

职责:
- 加载 .env 环境变量
- 创建 Flask 应用并启用 CORS
- 初始化 Storage 实例并注入 app.config
- 注册 agent_bp Blueprint (前缀 /api/v1/agent)
"""

import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from storage import Storage
from agent import CoPawAgent
from agent_bp import agent_bp


def create_app(storage: Storage | None = None) -> Flask:
    """应用工厂, 接受可选 storage 参数以便测试注入"""
    load_dotenv()

    app = Flask(__name__)
    CORS(app)

    # 初始化 Storage
    data_dir = os.getenv("DATA_DIR", "./data")
    app.config["STORAGE"] = storage or Storage(data_dir=data_dir)

    # 初始化 Agent 编排层
    app.config["AGENT"] = CoPawAgent(app.config["STORAGE"])

    # 注册 Blueprint
    app.register_blueprint(agent_bp, url_prefix="/api/v1/agent")

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)
