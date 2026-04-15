"""
TASK-05 验收测试 — API 路由层: 会话管理

对齐验收标准:
1. POST /sessions -> 201, 返回 session_id / title / created_at / query_count=0
2. GET /sessions -> 200, sessions 数组按 created_at 倒序
3. DELETE /sessions/<id> -> 200, 级联删除记录, 返回 deleted_records_count
4. DELETE 不存在的 id -> 404 SESSION_NOT_FOUND
5. GET /sessions/<id>/records -> 200, records 按 timestamp 正序
6. GET /sessions/<id>/records 不存在的 id -> 404
7. 所有响应包含 traceId 字段
"""

import json
import os
import sys
import tempfile

import pytest

# 确保 backend 目录可导入
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import Storage
from wsgi import create_app


@pytest.fixture
def tmp_data_dir():
    with tempfile.TemporaryDirectory() as d:
        yield d


@pytest.fixture
def app(tmp_data_dir):
    storage = Storage(data_dir=tmp_data_dir)
    app = create_app(storage=storage)
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def storage(app):
    return app.config["STORAGE"]


# ── 验收 1: POST /sessions -> 201 ────────────────────────────


class TestCreateSession:

    def test_create_session_default_title(self, client):
        """POST /sessions -> 201, 默认 title='新会话', query_count=0"""
        resp = client.post("/api/v1/agent/sessions", json={})
        assert resp.status_code == 201

        data = resp.get_json()
        assert "traceId" in data
        assert "session_id" in data
        assert data["title"] == "新会话"
        assert data["query_count"] == 0
        assert "created_at" in data

    def test_create_session_custom_title(self, client):
        """POST /sessions -> 201, 自定义 title"""
        resp = client.post("/api/v1/agent/sessions", json={"title": "测试会话"})
        assert resp.status_code == 201

        data = resp.get_json()
        assert data["title"] == "测试会话"

    def test_create_session_title_too_long(self, client):
        """POST /sessions title > 100 -> 400 INVALID_QUERY"""
        long_title = "a" * 101
        resp = client.post("/api/v1/agent/sessions", json={"title": long_title})
        assert resp.status_code == 400

        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_QUERY"
        assert "traceId" in data["error"]

    def test_create_session_no_body(self, client):
        """POST /sessions 无 body -> 201, 使用默认值"""
        resp = client.post(
            "/api/v1/agent/sessions",
            content_type="application/json",
        )
        assert resp.status_code == 201

    def test_create_session_respects_trace_header(self, client):
        """POST /sessions 使用 X-Trace-Id 请求头"""
        resp = client.post(
            "/api/v1/agent/sessions",
            json={},
            headers={"X-Trace-Id": "tr_custom_123"},
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["traceId"] == "tr_custom_123"


# ── 验收 2: GET /sessions -> 200 ─────────────────────────────


class TestListSessions:

    def test_list_sessions_empty(self, client):
        """GET /sessions -> 200, 空列表"""
        resp = client.get("/api/v1/agent/sessions")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "traceId" in data
        assert data["sessions"] == []

    def test_list_sessions_order(self, client):
        """GET /sessions -> 200, 按 created_at 倒序"""
        # 创建两个会话
        client.post("/api/v1/agent/sessions", json={"title": "第一个"})
        client.post("/api/v1/agent/sessions", json={"title": "第二个"})

        resp = client.get("/api/v1/agent/sessions")
        assert resp.status_code == 200

        data = resp.get_json()
        sessions = data["sessions"]
        assert len(sessions) == 2
        # 最新创建的排在前面 (倒序)
        assert sessions[0]["created_at"] >= sessions[1]["created_at"]

    def test_list_sessions_has_trace_id(self, client):
        """GET /sessions 响应包含 traceId"""
        resp = client.get("/api/v1/agent/sessions")
        data = resp.get_json()
        assert "traceId" in data


# ── 验收 3/4: DELETE /sessions/<id> -> 200 / 404 ─────────────


class TestDeleteSession:

    def test_delete_session_success(self, client, storage):
        """DELETE /sessions/<id> -> 200, 返回 deleted_records_count"""
        # 先创建一个会话
        resp = client.post("/api/v1/agent/sessions", json={"title": "待删除"})
        session_id = resp.get_json()["session_id"]

        # 手动添加几条记录以测试级联删除
        storage.add_record(
            session_id=session_id,
            query="测试问题",
            answer="测试回答",
            llm_used=False,
            model=None,
            response_time_ms=100,
            answer_source="demo",
            references=[],
        )

        # 删除会话
        resp = client.delete(f"/api/v1/agent/sessions/{session_id}")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "traceId" in data
        assert data["message"] == "会话已删除"
        assert data["deleted_session_id"] == session_id
        assert data["deleted_records_count"] == 1

    def test_delete_session_not_found(self, client):
        """DELETE /sessions/<不存在的id> -> 404 SESSION_NOT_FOUND"""
        resp = client.delete("/api/v1/agent/sessions/nonexistent_id")
        assert resp.status_code == 404

        data = resp.get_json()
        assert data["error"]["code"] == "SESSION_NOT_FOUND"
        assert data["error"]["details"]["session_id"] == "nonexistent_id"
        assert "traceId" in data["error"]

    def test_delete_session_cascade(self, client, storage):
        """DELETE 级联删除关联问答记录"""
        # 创建会话
        resp = client.post("/api/v1/agent/sessions", json={})
        session_id = resp.get_json()["session_id"]

        # 添加 3 条记录
        for i in range(3):
            storage.add_record(
                session_id=session_id,
                query=f"问题{i}",
                answer=f"回答{i}",
                llm_used=False,
                model=None,
                response_time_ms=50,
                answer_source="demo",
            )

        # 删除会话
        resp = client.delete(f"/api/v1/agent/sessions/{session_id}")
        assert resp.status_code == 200
        assert resp.get_json()["deleted_records_count"] == 3

        # 确认会话列表中已无该会话
        resp = client.get("/api/v1/agent/sessions")
        session_ids = [s["session_id"] for s in resp.get_json()["sessions"]]
        assert session_id not in session_ids


# ── 验收 5/6: GET /sessions/<id>/records -> 200 / 404 ────────


class TestGetRecords:

    def test_get_records_empty(self, client):
        """GET /sessions/<id>/records -> 200, 空记录列表"""
        resp = client.post("/api/v1/agent/sessions", json={})
        session_id = resp.get_json()["session_id"]

        resp = client.get(f"/api/v1/agent/sessions/{session_id}/records")
        assert resp.status_code == 200

        data = resp.get_json()
        assert "traceId" in data
        assert data["session_id"] == session_id
        assert data["records"] == []

    def test_get_records_order(self, client, storage):
        """GET /sessions/<id>/records -> 200, records 按 timestamp 正序"""
        resp = client.post("/api/v1/agent/sessions", json={})
        session_id = resp.get_json()["session_id"]

        # 添加记录
        for i in range(3):
            storage.add_record(
                session_id=session_id,
                query=f"问题{i}",
                answer=f"回答{i}",
                llm_used=False,
                model=None,
                response_time_ms=50,
                answer_source="demo",
            )

        resp = client.get(f"/api/v1/agent/sessions/{session_id}/records")
        assert resp.status_code == 200

        records = resp.get_json()["records"]
        assert len(records) == 3
        # 按 timestamp 正序
        for i in range(len(records) - 1):
            assert records[i]["timestamp"] <= records[i + 1]["timestamp"]

    def test_get_records_not_found(self, client):
        """GET /sessions/<不存在的id>/records -> 404"""
        resp = client.get("/api/v1/agent/sessions/nonexistent_id/records")
        assert resp.status_code == 404

        data = resp.get_json()
        assert data["error"]["code"] == "SESSION_NOT_FOUND"
        assert "traceId" in data["error"]


# ── 验收 7: 所有响应包含 traceId ─────────────────────────────


class TestTraceId:

    def test_trace_id_auto_generated(self, client):
        """未提供 X-Trace-Id 时自动生成 tr_ 前缀的 traceId"""
        resp = client.get("/api/v1/agent/sessions")
        data = resp.get_json()
        assert data["traceId"].startswith("tr_")

    def test_trace_id_from_header(self, client):
        """使用请求头 X-Trace-Id"""
        resp = client.get(
            "/api/v1/agent/sessions",
            headers={"X-Trace-Id": "tr_header_test"},
        )
        data = resp.get_json()
        assert data["traceId"] == "tr_header_test"

    def test_error_response_has_trace_id(self, client):
        """错误响应中也包含 traceId"""
        resp = client.delete("/api/v1/agent/sessions/nonexistent")
        data = resp.get_json()
        assert "traceId" in data["error"]
