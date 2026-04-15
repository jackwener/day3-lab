"""
tests/test_ask.py — 问答 API + 降级 + 错误码集成测试
覆盖 TC-M01-032~035 / TC-M01-055~064
"""
import uuid
import pytest


def _make_session(client) -> str:
    return client.post("/api/v1/agent/sessions", json={}).get_json()["session_id"]


class TestPostAskValidation:
    """参数校验错误码 TC-M01-033/034/035/055~057"""

    def test_empty_query_400(self, client):
        """TC-M01-033 / TC-M01-055"""
        sid = _make_session(client)
        resp = client.post("/api/v1/agent/ask", json={"query": "", "session_id": sid})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"

    def test_whitespace_query_400(self, client):
        sid = _make_session(client)
        resp = client.post("/api/v1/agent/ask", json={"query": "   ", "session_id": sid})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"

    def test_long_query_400(self, client):
        """TC-M01-034 / TC-M01-056"""
        sid = _make_session(client)
        resp = client.post("/api/v1/agent/ask", json={"query": "x" * 501, "session_id": sid})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_QUERY"

    def test_missing_session_404(self, client):
        """TC-M01-035 / TC-M01-057"""
        fake_sid = str(uuid.uuid4())
        resp = client.post("/api/v1/agent/ask", json={"query": "测试问题", "session_id": fake_sid})
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "SESSION_NOT_FOUND"

    def test_missing_session_id_400(self, client):
        resp = client.post("/api/v1/agent/ask", json={"query": "测试"})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_SESSION_ID"

    def test_invalid_session_id_format_400(self, client):
        resp = client.post("/api/v1/agent/ask", json={"query": "测试", "session_id": "not-a-uuid"})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_SESSION_ID"


class TestPostAskDemo:
    """TC-M01-032 / TC-M01-062~064 — Demo 模式下问答成功"""

    def test_returns_200(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        resp = client.post("/api/v1/agent/ask", json={"query": "分析新能源行业", "session_id": sid})
        assert resp.status_code == 200

    def test_required_fields_present(self, client, monkeypatch):
        """TC-M01-063 — 每条回答均包含必要字段"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        data = client.post(
            "/api/v1/agent/ask", json={"query": "测试提问", "session_id": sid}
        ).get_json()
        assert "answer" in data
        assert "llm_used" in data
        assert "answer_source" in data
        assert "response_time_ms" in data
        assert "traceId" in data

    def test_demo_answer_source(self, client, monkeypatch):
        """TC-M01-062 — 无 LLM Key 时 answer_source='demo'"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        data = client.post(
            "/api/v1/agent/ask", json={"query": "测试提问", "session_id": sid}
        ).get_json()
        assert data["answer_source"] == "demo"
        assert data["llm_used"] is False

    def test_demo_response_not_empty(self, client, monkeypatch):
        """TC-M01-064 — Demo 回复非空"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        data = client.post(
            "/api/v1/agent/ask", json={"query": "医药板块投资建议", "session_id": sid}
        ).get_json()
        assert len(data["answer"]) > 0

    def test_demo_response_time_within_slo(self, client, monkeypatch):
        """TC-M01-062 — Demo 模式响应时间 ≤ 500ms (SLO)"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        data = client.post(
            "/api/v1/agent/ask", json={"query": "测试", "session_id": sid}
        ).get_json()
        assert data["response_time_ms"] <= 500

    def test_records_written_after_ask(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        client.post("/api/v1/agent/ask", json={"query": "问题一", "session_id": sid})
        records = client.get(f"/api/v1/agent/sessions/{sid}/records").get_json()["records"]
        assert len(records) == 1


class TestAutoNaming:
    """TC-M01-050~052"""

    def test_auto_naming_first_query(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        query = "分析新能源行业最新趋势"
        client.post("/api/v1/agent/ask", json={"query": query, "session_id": sid})
        sessions_data = client.get("/api/v1/agent/sessions").get_json()
        updated_session = next(s for s in sessions_data["sessions"] if s["session_id"] == sid)
        assert updated_session["title"] == query[:20]

    def test_auto_naming_only_once(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        client.post("/api/v1/agent/ask", json={"query": "第一次提问内容", "session_id": sid})
        first_sessions = client.get("/api/v1/agent/sessions").get_json()["sessions"]
        first_title = next(s["title"] for s in first_sessions if s["session_id"] == sid)

        client.post("/api/v1/agent/ask", json={"query": "完全不同的第二次提问", "session_id": sid})
        sessions = client.get("/api/v1/agent/sessions").get_json()["sessions"]
        title_after = next(s["title"] for s in sessions if s["session_id"] == sid)

        assert title_after == first_title


class TestExport:
    """TC-M01-036~038"""

    def test_export_json_success(self, client, monkeypatch):
        """TC-M01-036"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        client.post("/api/v1/agent/ask", json={"query": "测试问题", "session_id": sid})
        resp = client.post("/api/v1/agent/export", json={"session_id": sid, "format": "json"})
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "completed"
        assert data["download_url"] is not None

    def test_export_txt_success(self, client, monkeypatch):
        """TC-M01-037"""
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        client.post("/api/v1/agent/ask", json={"query": "测试问题", "session_id": sid})
        resp = client.post("/api/v1/agent/export", json={"session_id": sid, "format": "txt"})
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "completed"

    def test_export_invalid_format(self, client):
        """TC-M01-038 / TC-M01-058"""
        sid = _make_session(client)
        resp = client.post("/api/v1/agent/export", json={"session_id": sid, "format": "xlsx"})
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "INVALID_FORMAT"

    def test_export_expires_at_present(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        sid = _make_session(client)
        data = client.post(
            "/api/v1/agent/export", json={"session_id": sid, "format": "json"}
        ).get_json()
        assert "expires_at" in data
        assert data["expires_at"] is not None
