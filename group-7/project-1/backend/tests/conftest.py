"""
tests/conftest.py — pytest fixtures（共享）
App Factory 模式：每个 test session 使用独立临时目录，互不干扰。
"""
import os
import tempfile
import pytest
import sys

# 将项目根目录加入 sys.path，使 import app / storage 可正常工作
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app


@pytest.fixture
def app(tmp_path):
    """每个测试函数独立的 Flask 应用实例（隔离 data_dir）。"""
    application = create_app(data_dir=str(tmp_path))
    application.config["TESTING"] = True
    return application


@pytest.fixture
def client(app):
    """Flask test client。"""
    return app.test_client()


@pytest.fixture
def storage(app):
    """直接访问 Storage 实例（用于单元测试）。"""
    return app.config["STORAGE"]
