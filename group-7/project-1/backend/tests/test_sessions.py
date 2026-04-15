"""
tests/test_sessions.py — 会话管理 API 集成测试
覆盖 TC-M01-020 ~ TC-M01-025
"""
import uuid
import pytest


def _sid():
    return str(uuid.uuid4())


class TestGetSessions:
    """TC-M01-020"""

    def test_empty_sessions(self, client):
        resp = client.get("/api/v1/agent/sessions")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] == 0
        assert data["sessions"] == []

    def test_returns_created_sessions(self, client):
        client.post("/api/v1/agent/sessions", json={})
        client.post("/api/v1/agent/sessions", json={})
        data = client.get("/api/v1/agent/sessions").get_json()
        assert data["total"] == 2
        assert len(data["sessions"]) == 2

    def test_pagination_fields_present(self, client):
        data = client.get("/api/v1/agent/sessions").get_json()
        assert "page" in data
        assert "page_size" in data
        assert "traceId" in data


class TestCreateSession:
    """TC-M01-021"""

    def test_returns_201(self, client):
        resp = client.post("/api/v1/agent/sessions", json={})
        assert resp.status_code == 201

    def test_response_fields(self, client):
        data = client.post("/api/v1/agent/sessions", json={}).get_json()
        assert "session_id" in data
        assert "title" in data
        assert "created_at" in data
        assert data["query_count"] == 0

    def test_custom_title(self, client):
        data = client.post("/api/v1/agent/sessions", json={"title": "我的会话"}).get_json()
        assert data["title"] == "我的会话"

    def test_default_title(self, client):
        data = client.post("/api/v1/agent/sessions", json={}).get_json()
        assert data["title"] == "新会话"

    def test_title_too_long(self, client):
        resp = client.post("/api/v1/agent/sessions", json={"title": "a" * 101})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_TITLE"


class TestDeleteSession:
    """TC-M01-022"""

    def test_deletes_existing_session(self, client):
        sid = client.post("/api/v1/agent/sessions", json={}).get_json()["session_id"]
        resp = client.delete(f"/api/v1/agent/sessions/{sid}")
        assert resp.status_code == 200
        assert resp.get_json()["deleted"] is True

    def test_404_on_missing_session(self, client):
        """TC-M01-025"""
        fake_id = _sid()
        resp = client.delete(f"/api/v1/agent/sessions/{fake_id}")
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "SESSION_NOT_FOUND"


class TestUpdateSession:
    """TC-M01-024"""

    def test_updates_title(self, client):
        sid = client.post("/api/v1/agent/sessions", json={}).get_json()["session_id"]
        resp = client.put(f"/api/v1/agent/sessions/{sid}", json={"title": "新标题"})
        assert resp.status_code == 200
        assert resp.get_json()["title"] == "新标题"

    def test_404_on_missing_session(self, client):
        resp = client.put(f"/api/v1/agent/sessions/{_sid()}", json={"title": "x"})
        assert resp.status_code == 404


class TestGetRecords:
    """TC-M01-030"""

    def test_empty_records(self, client):
        sid = client.post("/api/v1/agent/sessions", json={}).get_json()["session_id"]
        resp = client.get(f"/api/v1/agent/sessions/{sid}/records")
        assert resp.status_code == 200
        assert resp.get_json()["records"] == []

    def test_404_on_missing_session(self, client):
        """TC-M01-025"""
        resp = client.get(f"/api/v1/agent/sessions/{_sid()}/records")
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "SESSION_NOT_FOUND"
