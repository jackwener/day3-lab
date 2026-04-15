"""基金管家 FundHub — Flask 后端入口"""
import os
import uuid
from dotenv import load_dotenv
from flask import Flask, request, g
from flask_cors import CORS

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # 请求追踪
    @app.before_request
    def set_trace_id():
        g.trace_id = f"tr_{uuid.uuid4().hex[:12]}"

    # 注册蓝图
    from routes.fund import fund_bp
    from routes.market import market_bp
    from routes.insights import insights_bp
    from routes.chat import chat_bp
    from routes.watchlist import watchlist_bp

    app.register_blueprint(fund_bp, url_prefix="/api/fund")
    app.register_blueprint(market_bp, url_prefix="/api/market")
    app.register_blueprint(insights_bp, url_prefix="/api/insights")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(watchlist_bp, url_prefix="/api/watchlist")

    # 全局 404
    @app.errorhandler(404)
    def not_found(e):
        return {"code": -1, "error": {"code": "NOT_FOUND", "message": "接口不存在"}}, 404

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=3000, debug=True)
