"""蓝图注册"""

from src.api.routes.fund_info import fund_info_bp
from src.api.routes.fund_rating import fund_rating_bp
from src.api.routes.situation import situation_bp
from src.api.routes.page import page_bp
from src.api.routes.fund_nav import fund_nav_bp


def register_blueprints(app):
    """注册所有蓝图到 Flask 应用"""
    app.register_blueprint(fund_info_bp, url_prefix='/api/v1/funds')
    app.register_blueprint(fund_rating_bp, url_prefix='/api/v1/ratings')
    app.register_blueprint(situation_bp, url_prefix='/api')
    app.register_blueprint(page_bp)
    app.register_blueprint(fund_nav_bp, url_prefix='/api/funds')
