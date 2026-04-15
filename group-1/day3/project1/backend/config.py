"""Configuration module for the Skill Hub application."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class Config:
    """Application configuration."""
    
    # Flask
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    
    # Data paths
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    SKILLS_JSON_PATH = DATA_DIR / "skills.json"  # For B1 compatibility
    SKILLS_PATH = str(DATA_DIR / "skills.json")
    CATEGORIES_JSON_PATH = DATA_DIR / "categories.json"  # For B1 compatibility
    CATEGORIES_PATH = str(DATA_DIR / "categories.json")
    INTERACTIONS_JSON_PATH = DATA_DIR / "interactions.json"  # For B1 compatibility
    INTERACTIONS_PATH = str(DATA_DIR / "interactions.json")
    BUNDLES_DIR = str(DATA_DIR / "bundles")
    TMP_DIR = str(BASE_DIR / "tmp")
    
    # LLM Configuration (DashScope / OpenAI compatible)
    LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
    LLM_BASE_URL = os.environ.get(
        "LLM_BASE_URL",
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
    )
    LLM_MODEL = os.environ.get("LLM_MODEL", "qwen-plus")
    LLM_TIMEOUT = int(os.environ.get("LLM_TIMEOUT", "8"))
    
    # Rate limiting
    RATE_LIMIT_DRAFT_MAX_CALLS = 1
    RATE_LIMIT_DRAFT_PERIOD = 5  # 1 call per 5 seconds
    
    RATE_LIMIT_SMART_SEARCH_MAX_CALLS = 1
    RATE_LIMIT_SMART_SEARCH_PERIOD = 3  # 1 call per 3 seconds
    
    # Upload limits
    MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_ZIP_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_BUNDLE_SIZE = 50 * 1024 * 1024  # 50MB
    MAX_BUNDLE_FILES = 200
    
    # Pagination
    DEFAULT_PAGE_SIZE = 12
    MAX_PAGE_SIZE = 50
    
    # Categories whitelist
    CATEGORY_WHITELIST = [
        "frontend",
        "backend",
        "security",
        "bigdata",
        "coding",
        "ppt",
        "writing",
        "other"
    ]
    
    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True


# Configuration mapping
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig
}


def get_config() -> Config:
    """Get configuration based on FLASK_ENV.
    
    Returns:
        Config: Configuration instance
    """
    env = os.environ.get("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)()
