"""
M5-RA 研报智能分析助手 — Flask 应用入口
对齐 Spec 08 §6 部署架构：Flask Backend :5000
"""

import os
import uuid
from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)

    # --- 基础配置 ---
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100MB
    app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # --- CORS（教学环境全开放，对齐 Spec 08 §8） ---
    CORS(app)

    # --- traceId 中间件（对齐 Spec 09 §2） ---
    @app.before_request
    def inject_trace_id():
        from flask import g, request
        g.trace_id = request.headers.get("X-Trace-Id", f"tr_{uuid.uuid4().hex[:12]}")

    @app.after_request
    def add_trace_header(response):
        from flask import g
        response.headers["X-Trace-Id"] = getattr(g, "trace_id", "")
        return response

    # --- 注册蓝图 ---
    from api_bp import api_bp
    app.register_blueprint(api_bp, url_prefix="/api/v1")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5003, debug=False)
