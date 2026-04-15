"""
app.py — Flask App Factory
对齐规格: 08-系统架构 §1 / 11-安全设计 §4（CORS、输入校验）
"""
import os
from flask import Flask
from flask_cors import CORS

from storage import Storage
from routes.capabilities_bp import capabilities_bp
from routes.agent_bp import agent_bp
from routes.reports_bp import reports_bp


def create_app(data_dir: str | None = None) -> Flask:
    """
    App Factory：允许测试时注入临时 data_dir，实现存储隔离。
    """
    app = Flask(__name__)

    # ── 存储 ──────────────────────────────────────────────────────────
    _data_dir = data_dir or os.environ.get("DATA_DIR", "./data")
    app.config["STORAGE"] = Storage(_data_dir)

    # ── CORS（教学环境全开放，生产环境改为白名单） ─────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Blueprint 注册 ────────────────────────────────────────────────
    prefix = "/api/v1/agent"
    app.register_blueprint(capabilities_bp, url_prefix=prefix)
    app.register_blueprint(agent_bp, url_prefix=prefix)
    app.register_blueprint(reports_bp, url_prefix=prefix)

    return app
