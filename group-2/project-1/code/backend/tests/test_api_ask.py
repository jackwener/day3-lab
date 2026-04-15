"""
TASK-06 API 路由层单元测试 — POST /ask 问答提交与 SSE 流式响应
覆盖验收标准 #1 ~ #8
"""

import json
import os
import sys
from unittest.mock import patch

import pytest

# 确保 backend 目录在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import Storage
from agent import CoPawAgent


def _create_app(tmp_path):
    """创建测试用 Flask 应用"""
    from wsgi import create_app

    storage = Storage(data_dir=str(tmp_path / "data"))
    app = create_app(storage=storage)
    app.config["TESTING"] = True
    return app, storage


@pytest.fixture
def app_and_storage(tmp_path):
    return _create_app(tmp_path)


@pytest.fixture
def client(app_and_storage):
    app, _ = app_and_storage
    return app.test_client()


@pytest.fixture
def storage(app_and_storage):
    _, storage = app_and_storage
    return storage


@pytest.fixture
def session_id(storage):
    sid = "test-session-ask-001"
    storage.create_session(sid, "问答测试会话")
    return sid


# ── 验收 #1: 空 query → 400 EMPTY_QUERY ───────────────────────

class TestEmptyQuery:
    def test_null_query(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": None,
        })
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "EMPTY_QUERY"

    def test_empty_string_query(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"

    def test_whitespace_only_query(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "   ",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"

    def test_missing_query_field(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"


# ── 验收 #2: query > 500 字符 → 400 INVALID_QUERY ──────────────

class TestQueryTooLong:
    def test_query_over_500_chars(self, client, session_id):
        long_query = "测" * 501
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": long_query,
        })
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_QUERY"

    def test_query_exactly_500_chars(self, client, session_id):
        """500 字符正好不应报错"""
        query_500 = "测" * 500
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": query_500,
        })
        # 不应返回 400
        assert resp.status_code != 400


# ── 验收 #3: 缺少 session_id → 400 MISSING_SESSION_ID ──────────

class TestMissingSessionId:
    def test_no_session_id(self, client):
        resp = client.post("/api/v1/agent/ask", json={
            "query": "测试问题",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "MISSING_SESSION_ID"

    def test_empty_session_id(self, client):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": "",
            "query": "测试问题",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "MISSING_SESSION_ID"

    def test_whitespace_session_id(self, client):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": "   ",
            "query": "测试问题",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "MISSING_SESSION_ID"


# ── 验收 #4: session_id 不存在 → 404 SESSION_NOT_FOUND ─────────

class TestSessionNotFound:
    def test_nonexistent_session(self, client):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": "nonexistent-session-id",
            "query": "测试问题",
        })
        assert resp.status_code == 404
        assert resp.get_json()["error"]["code"] == "SESSION_NOT_FOUND"


# ── 验收 #5: 正常请求 → 200, Content-Type text/event-stream ────

class TestSSEResponse:
    @patch.dict(os.environ, {}, clear=True)
    def test_success_returns_sse(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "你好",
        })
        assert resp.status_code == 200
        assert "text/event-stream" in resp.content_type


# ── 验收 #6: SSE 流中包含多个 chunk + 一个 done ─────────────────

class TestSSEEvents:
    @patch.dict(os.environ, {}, clear=True)
    def test_sse_contains_chunks_and_done(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "测试",
        })

        raw = resp.get_data(as_text=True)
        lines = [l for l in raw.strip().split("\n") if l.startswith("data: ")]

        events = []
        for line in lines:
            payload = json.loads(line[len("data: "):])
            events.append(payload)

        chunk_events = [e for e in events if e.get("type") == "chunk"]
        done_events = [e for e in events if e.get("type") == "done"]

        assert len(chunk_events) > 0, "应有至少一个 chunk 事件"
        assert len(done_events) == 1, "应有恰好一个 done 事件"

        # chunk 事件包含 content 字段
        for ce in chunk_events:
            assert "content" in ce


# ── 验收 #7: done 事件包含完整字段 ──────────────────────────────

class TestDoneEventFields:
    @patch.dict(os.environ, {}, clear=True)
    def test_done_event_has_all_fields(self, client, session_id):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "字段检查",
        })

        raw = resp.get_data(as_text=True)
        lines = [l for l in raw.strip().split("\n") if l.startswith("data: ")]

        done_payload = None
        for line in lines:
            payload = json.loads(line[len("data: "):])
            if payload.get("type") == "done":
                done_payload = payload["data"]
                break

        assert done_payload is not None, "应有 done 事件"

        required_fields = ["answer", "llm_used", "model", "response_time_ms",
                           "answer_source", "traceId", "references"]
        for field in required_fields:
            assert field in done_payload, f"done 事件缺少字段: {field}"


# ── 验收 #8: 问答结果写入 Storage ───────────────────────────────

class TestRecordPersistence:
    @patch.dict(os.environ, {}, clear=True)
    def test_ask_persists_record(self, client, session_id, storage):
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "持久化测试",
        })
        # 消费完 SSE 流
        _ = resp.get_data()

        records = storage.get_records_by_session(session_id)
        assert len(records) == 1
        assert records[0]["query"] == "持久化测试"
        assert records[0]["session_id"] == session_id


# ── 校验顺序测试 ───────────────────────────────────────────────

class TestValidationOrder:
    """验证校验顺序: session_id 非空 → query 非空 → query 长度 → session_id 存在性"""

    def test_missing_session_id_before_empty_query(self, client):
        """session_id 缺失时应先报 MISSING_SESSION_ID, 而非 EMPTY_QUERY"""
        resp = client.post("/api/v1/agent/ask", json={
            "query": "",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "MISSING_SESSION_ID"

    def test_empty_query_before_invalid_query(self, client, session_id):
        """空 query 应先报 EMPTY_QUERY, 而非 INVALID_QUERY"""
        resp = client.post("/api/v1/agent/ask", json={
            "session_id": session_id,
            "query": "",
        })
        assert resp.status_code == 400
        assert resp.get_json()["error"]["code"] == "EMPTY_QUERY"
