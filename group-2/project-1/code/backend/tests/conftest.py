import pytest
from wsgi import create_app


@pytest.fixture
def app():
    """创建测试用 Flask 应用实例。"""
    app = create_app()
    app.config["TESTING"] = True
    yield app


@pytest.fixture
def client(app):
    """创建测试客户端。"""
    return app.test_client()
