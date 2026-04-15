"""Flask application entry point."""

from __future__ import annotations

from pathlib import Path

from flask import Flask, g
from flask_cors import CORS
from dotenv import load_dotenv
from flasgger import Swagger

load_dotenv()


def create_app(config_name: str = "development", test_config: dict | None = None) -> Flask:
    """Create and configure the Flask application.
    
    Args:
        config_name: Configuration name (development, production, testing)
        test_config: Optional test configuration dict
    
    Returns:
        Flask: Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    from config import get_config, Config
    config = get_config()
    app.config.from_object(config)
    
    if test_config:
        app.config.update(test_config)
        # For backward compatibility with B1 test fixtures
        if "SKILLS_JSON_PATH" in test_config:
            app.config["SKILLS_PATH"] = str(test_config["SKILLS_JSON_PATH"])
        if "INTERACTIONS_JSON_PATH" in test_config:
            app.config["INTERACTIONS_PATH"] = str(test_config["INTERACTIONS_JSON_PATH"])
        if "CATEGORIES_JSON_PATH" in test_config:
            app.config["CATEGORIES_PATH"] = str(test_config["CATEGORIES_JSON_PATH"])
    
    # Enable CORS
    CORS(app, origins=config.CORS_ORIGINS if hasattr(config, 'CORS_ORIGINS') else "*")
    
    # Create directories if needed
    _ensure_directories(app)
    
    # Register extensions
    _register_extensions(app)
    
    # Register hooks
    _register_hooks(app)
    
    # Register error handlers
    _register_error_handlers(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register Swagger
    _register_swagger(app)
    
    return app


def _ensure_directories(app: Flask) -> None:
    """Create necessary directories."""
    for key in ("BUNDLES_DIR", "TMP_DIR", "DATA_DIR"):
        path = app.config.get(key)
        if path:
            Path(path).mkdir(parents=True, exist_ok=True)


def _register_extensions(app: Flask) -> None:
    """Register Flask extensions."""
    from services.md_render import MdRender
    from services.zip_service import ZipService
    from storage.json_storage import JsonStorage
    from storage.interaction_storage import InteractionStorage
    from services.ranking_service import RankingService
    from services.interaction_service import InteractionService
    
    skills_path = app.config.get("SKILLS_PATH") or app.config.get("SKILLS_JSON_PATH")
    interactions_path = app.config.get("INTERACTIONS_PATH") or app.config.get("INTERACTIONS_JSON_PATH")
    categories_path = app.config.get("CATEGORIES_PATH") or app.config.get("CATEGORIES_JSON_PATH")
    bundles_dir = app.config.get("BUNDLES_DIR") or app.config.get("BUNDLES_DIR")
    
    if skills_path:
        app.extensions["storage"] = JsonStorage(
            skills_path=str(skills_path),
            categories_path=str(categories_path) if categories_path else str(Path(skills_path).parent / "categories.json"),
            bundles_dir=str(bundles_dir) if bundles_dir else str(Path(skills_path).parent / "bundles")
        )
    
    if interactions_path:
        app.extensions["interaction_storage"] = InteractionStorage(
            path=str(interactions_path)
        )
    
    if app.extensions.get("storage"):
        app.extensions["ranking_service"] = RankingService(
            storage=app.extensions["storage"]
        )
    
    if app.extensions.get("storage") and app.extensions.get("interaction_storage"):
        app.extensions["interaction_service"] = InteractionService(
            storage=app.extensions["storage"],
            interaction_storage=app.extensions["interaction_storage"],
            ranking_service=app.extensions.get("ranking_service"),
        )
    
    app.extensions["md_render"] = MdRender()
    
    max_bundle_size = app.config.get("MAX_BUNDLE_SIZE", 50 * 1024 * 1024)
    max_bundle_files = app.config.get("MAX_BUNDLE_FILES", 200)
    app.extensions["zip_service"] = ZipService(
        max_bundle_size=max_bundle_size,
        max_files=max_bundle_files,
    )


def _register_hooks(app: Flask) -> None:
    """Register before/after request hooks."""
    from utils.trace import generate_trace_id, get_trace_id
    
    @app.before_request
    def attach_trace_id():
        g.trace_id = generate_trace_id()

    @app.after_request
    def include_trace_id(response):
        response.headers["X-Trace-Id"] = get_trace_id()
        return response


def _register_error_handlers(app: Flask) -> None:
    """Register error handlers."""
    from utils.errors import ApiError, api_error, ErrorCode
    from utils.trace import get_trace_id
    
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return error.to_response(get_trace_id())

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        from werkzeug.exceptions import HTTPException
        if isinstance(error, HTTPException):
            raise error
        from utils.errors import ApiError
        api_error = ApiError(code="UPSTREAM_ERROR", status_code=500)
        return api_error.to_response(get_trace_id())


def _register_swagger(app: Flask) -> None:
    """Register Swagger documentation."""
    swagger_template = {
        "swagger": "2.0",
        "info": {
            "title": "Skill Hub API",
            "description": "技能集市后端 API 文档",
            "version": "1.0.0",
            "contact": {
                "name": "Skill Hub Team"
            }
        },
        "basePath": "/api/v1/hub",
        "schemes": ["http", "https"],
        "tags": [
            {"name": "Query", "description": "查询接口 (B1)"},
            {"name": "Submit", "description": "提交接口 (B2)"},
            {"name": "Interact", "description": "互动接口 (B3)"},
            {"name": "AI", "description": "AI 接口 (B3)"},
            {"name": "Health", "description": "健康检查"},
        ]
    }
    
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
        "specs_route": "/apidocs/",
    }
    Swagger(app, template=swagger_template, config=swagger_config)


def register_blueprints(app: Flask) -> None:
    """Register all blueprints.
    
    Uses try/except to handle missing blueprints gracefully.
    """
    # Query blueprint (B1)
    try:
        from routes.query_bp import query_bp
        app.register_blueprint(query_bp, url_prefix='/api/v1/hub')
    except ImportError:
        pass

    # Submit blueprint (B2)
    try:
        from routes.submit_bp import submit_bp
        app.register_blueprint(submit_bp, url_prefix='/api/v1/hub')
    except ImportError:
        pass

    # Interaction blueprint (B3)
    try:
        from routes.interact_bp import interact_bp
        app.register_blueprint(interact_bp, url_prefix='/api/v1/hub')
    except ImportError:
        pass

    # AI blueprint (B3)
    try:
        from routes.ai_bp import ai_bp
        app.register_blueprint(ai_bp, url_prefix='/api/v1/hub')
    except ImportError:
        pass


# Create application instance
app = create_app()


@app.route('/health')
def health_check():
    """
    健康检查
    ---
    tags:
      - Health
    responses:
      200:
        description: 服务正常
    """
    from utils.trace import generate_trace_id
    return {
        "status": "healthy",
        "traceId": generate_trace_id()
    }


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
