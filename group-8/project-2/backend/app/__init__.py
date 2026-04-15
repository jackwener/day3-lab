import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from flasgger import Swagger

def create_app(test_config=None):
    load_dotenv()
    app = Flask(__name__)
    CORS(app)

    if test_config:
        app.config.update(test_config)

    app.config.setdefault("DATA_DIR", os.environ.get("DATA_DIR", "./data"))

    swagger_config = {
        "headers": [],
        "specs": [
            {
                "endpoint": "apispec",
                "route": "/apispec.json",
                "rule_filter": lambda rule: True,
                "model_filter": lambda tag: True,
            }
        ],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/apidocs/"
    }

    swagger_template = {
        "info": {
            "title": "投研问答助手 API",
            "description": "M1-QA 投研问答助手后端 API 文档",
            "version": "0.1.0",
        },
        "basePath": "/api/v1/agent",
        "schemes": ["http"],
    }

    Swagger(app, config=swagger_config, template=swagger_template)

    from .agent_bp import agent_bp
    app.register_blueprint(agent_bp, url_prefix="/api/v1/agent")

    return app
