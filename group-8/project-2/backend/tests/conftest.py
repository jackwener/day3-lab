import pytest
from app import create_app
from app.storage import Storage


@pytest.fixture
def tmp_data_dir(tmp_path):
    return str(tmp_path / "data")


@pytest.fixture
def storage(tmp_data_dir):
    return Storage(tmp_data_dir)


@pytest.fixture
def app(tmp_data_dir):
    app = create_app({"TESTING": True, "DATA_DIR": tmp_data_dir})
    return app


@pytest.fixture
def client(app):
    return app.test_client()
