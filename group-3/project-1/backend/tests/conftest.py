"""Pytest fixtures for the fund analysis project"""

import pytest
import sys
import os

# Add project root to path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture
def app():
    """Create and configure a Flask app for testing"""
    os.environ['FLASK_ENV'] = 'development'
    from src.api import create_app

    app = create_app('development')
    app.config['TESTING'] = True

    yield app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app"""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a CLI runner for the Flask app"""
    return app.test_cli_runner()


@pytest.fixture
def mock_cursor(monkeypatch):
    """Mock database cursor for service layer tests"""
    from unittest.mock import MagicMock

    class MockCursor:
        def __init__(self):
            self.results = []
            self.fetchone_result = None
            self.fetchall_result = []
            self.executed_sql = None
            self.executed_params = None

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def execute(self, sql, params=None):
            self.executed_sql = sql
            self.executed_params = params

        def fetchone(self):
            return self.fetchone_result

        def fetchall(self):
            return self.fetchall_result

    mock = MockCursor()

    def mock_get_cursor(config=None):
        return mock

    monkeypatch.setattr('src.utils.db.get_cursor', mock_get_cursor)
    return mock
