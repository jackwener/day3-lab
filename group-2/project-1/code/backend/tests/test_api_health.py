"""
TASK-07 API 路由层单元测试 — 健康检查 / 能力探测 / 文档溯源
覆盖验收标准 #1 ~ #6
"""

import json
import os
import sys
from unittest.mock import patch

import pytest

# 确保 backend 目录在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import Storage


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


# ── 验收 #1: GET /capabilities → 200, 返回布尔值 ───────────────

class TestCapabilities:
    @patch.dict(os.environ, {}, clear=True)
    def test_capabilities_no_config(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "traceId" in data
        assert data["copaw_configured"] is False
        assert data["bailian_configured"] is False

    @patch.dict(os.environ, {"IRA_COPAW_CHAT_URL": "http://test"}, clear=True)
    def test_capabilities_copaw_configured(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        data = resp.get_json()
        assert data["copaw_configured"] is True
        assert data["bailian_configured"] is False

    @patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=True)
    def test_capabilities_bailian_configured(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        data = resp.get_json()
        assert data["copaw_configured"] is False
        assert data["bailian_configured"] is True

    @patch.dict(os.environ, {
        "IRA_COPAW_CHAT_URL": "http://test",
        "DASHSCOPE_API_KEY": "test-key",
    }, clear=True)
    def test_capabilities_both_configured(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        data = resp.get_json()
        assert data["copaw_configured"] is True
        assert data["bailian_configured"] is True


# ── 验收 #2: GET /health → 200, 包含 status + components ───────

class TestHealth:
    @patch.dict(os.environ, {}, clear=True)
    def test_health_returns_status_and_components(self, client):
        resp = client.get("/api/v1/agent/health")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "traceId" in data
        assert "status" in data
        assert "components" in data
        assert "storage" in data["components"]
        assert "llm_copaw" in data["components"]
        assert "llm_bailian" in data["components"]


# ── 验收 #3: LLM 均未配置时 status = "DEGRADED" ────────────────

class TestHealthDegraded:
    @patch.dict(os.environ, {}, clear=True)
    def test_degraded_when_no_llm(self, client):
        resp = client.get("/api/v1/agent/health")
        data = resp.get_json()
        assert data["status"] == "DEGRADED"
        assert data["components"]["llm_copaw"] == "DOWN"
        assert data["components"]["llm_bailian"] == "DOWN"

    @patch.dict(os.environ, {"IRA_COPAW_CHAT_URL": "http://test"}, clear=True)
    def test_up_when_one_llm_configured(self, client):
        resp = client.get("/api/v1/agent/health")
        data = resp.get_json()
        assert data["status"] == "UP"


# ── 验收 #4: GET /doc/chunks?chunk_id=xxx → 200, 返回完整信息 ──

class TestDocChunks:
    def test_doc_chunk_found(self, client, storage):
        # 准备测试数据: 写入一个 doc_chunk
        chunks = [{
            "chunk_id": "chk_001",
            "doc_title": "测试报告.pdf",
            "doc_url": "/docs/test.pdf",
            "page": 3,
            "highlight_text": "测试高亮文本",
            "bbox": {"x": 72, "y": 340, "width": 468, "height": 60},
        }]
        storage._write_json(storage._doc_chunks_file, chunks)

        resp = client.get("/api/v1/agent/doc/chunks?chunk_id=chk_001")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["chunk_id"] == "chk_001"
        assert data["doc_title"] == "测试报告.pdf"
        assert data["page"] == 3
        assert "traceId" in data


# ── 验收 #5: 无效 chunk_id → 404 DOC_CHUNK_NOT_FOUND ────────────

class TestDocChunkNotFound:
    def test_nonexistent_chunk_id(self, client):
        resp = client.get("/api/v1/agent/doc/chunks?chunk_id=nonexistent")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["error"]["code"] == "DOC_CHUNK_NOT_FOUND"

    def test_missing_chunk_id_param(self, client):
        resp = client.get("/api/v1/agent/doc/chunks")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "MISSING_SESSION_ID"

    def test_empty_chunk_id_param(self, client):
        resp = client.get("/api/v1/agent/doc/chunks?chunk_id=")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "MISSING_SESSION_ID"


# ── 验收 #6: 所有响应包含 traceId ───────────────────────────────

class TestTraceId:
    @patch.dict(os.environ, {}, clear=True)
    def test_capabilities_has_trace_id(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        assert "traceId" in resp.get_json()

    @patch.dict(os.environ, {}, clear=True)
    def test_health_has_trace_id(self, client):
        resp = client.get("/api/v1/agent/health")
        assert "traceId" in resp.get_json()

    def test_doc_chunks_error_has_trace_id(self, client):
        resp = client.get("/api/v1/agent/doc/chunks?chunk_id=xxx")
        data = resp.get_json()
        assert "traceId" in data.get("error", {})

    def test_custom_trace_id_propagation(self, client):
        resp = client.get(
            "/api/v1/agent/capabilities",
            headers={"X-Trace-Id": "tr_custom_test_123"},
        )
        data = resp.get_json()
        assert data["traceId"] == "tr_custom_test_123"
