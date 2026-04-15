"""
tests/test_capabilities.py — 能力探测 & 健康检查集成测试
覆盖 TC-M01-045 / TC-M01-080
"""
import os
import pytest


class TestGetCapabilities:
    """TC-M01-045 — GET /capabilities → 200"""

    def test_returns_200(self, client):
        resp = client.get("/api/v1/agent/capabilities")
        assert resp.status_code == 200

    def test_contains_required_fields(self, client):
        """09-API §3 字段契约验证"""
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert "traceId" in data
        assert "copaw_configured" in data
        assert "bailian_configured" in data
        assert "demo_available" in data
        assert "version" in data

    def test_copaw_configured_is_bool(self, client):
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert isinstance(data["copaw_configured"], bool)

    def test_bailian_configured_is_bool(self, client):
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert isinstance(data["bailian_configured"], bool)

    def test_demo_always_true(self, client):
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data["demo_available"] is True

    def test_version_is_v1(self, client):
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data["version"] == "v1.0"

    def test_trace_id_format(self, client):
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data["traceId"].startswith("tr_")

    def test_no_api_key_both_false(self, client, monkeypatch):
        """未配置任何 Key → copaw_configured=False, bailian_configured=False"""
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data["copaw_configured"] is False
        assert data["bailian_configured"] is False

    def test_copaw_key_set(self, client, monkeypatch):
        """设置 COPAW_API_KEY → copaw_configured=True"""
        monkeypatch.setenv("COPAW_API_KEY", "test_key_abc")
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data["copaw_configured"] is True

    def test_model_none_when_bailian_not_configured(self, client, monkeypatch):
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        data = client.get("/api/v1/agent/capabilities").get_json()
        assert data.get("model") is None


class TestGetHealth:
    """TC-M01-080 — GET /health → 200"""

    def test_returns_200(self, client):
        resp = client.get("/api/v1/agent/health")
        assert resp.status_code == 200

    def test_contains_required_fields(self, client):
        """09-API §14 字段契约验证"""
        data = client.get("/api/v1/agent/health").get_json()
        assert "traceId" in data
        assert "status" in data
        assert "timestamp" in data
        assert "services" in data
        assert "metrics" in data

    def test_status_is_valid_enum(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        assert data["status"] in ("healthy", "degraded", "unhealthy")

    def test_services_structure(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        services = data["services"]
        assert "llm" in services
        assert "database" in services
        assert "status" in services["llm"]
        assert "provider" in services["llm"]

    def test_database_ok_on_fresh_start(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        assert data["services"]["database"] == "ok"

    def test_llm_always_available(self, client):
        """Demo 兜底保证 LLM 始终 available"""
        data = client.get("/api/v1/agent/health").get_json()
        assert data["services"]["llm"]["status"] == "available"

    def test_metrics_fields(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        m = data["metrics"]
        assert "active_sessions" in m
        assert "total_queries" in m
        assert "avg_response_time_ms" in m
        assert "total_reports" in m

    def test_metrics_are_non_negative(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        m = data["metrics"]
        assert m["active_sessions"] >= 0
        assert m["total_queries"] >= 0
        assert m["avg_response_time_ms"] >= 0
        assert m["total_reports"] >= 0

    def test_healthy_on_fresh_storage(self, client):
        data = client.get("/api/v1/agent/health").get_json()
        assert data["status"] == "healthy"

    def test_provider_demo_without_keys(self, client, monkeypatch):
        """未配置任何 LLM Key → provider=demo"""
        monkeypatch.delenv("COPAW_API_KEY", raising=False)
        monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
        data = client.get("/api/v1/agent/health").get_json()
        assert data["services"]["llm"]["provider"] == "demo"
