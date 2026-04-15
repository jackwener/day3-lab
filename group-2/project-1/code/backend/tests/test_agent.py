"""
TASK-04 Agent 编排层单元测试
覆盖验收标准 #1 ~ #7
"""

import os
import sys
import tempfile
import time
from unittest.mock import patch

import pytest

# 确保 backend 目录在 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import Storage
from agent import CoPawAgent


@pytest.fixture
def tmp_storage(tmp_path):
    """创建临时 Storage 实例。"""
    return Storage(data_dir=str(tmp_path / "data"))


@pytest.fixture
def agent(tmp_storage):
    """创建 CoPawAgent 实例。"""
    return CoPawAgent(storage=tmp_storage)


@pytest.fixture
def session_id(tmp_storage):
    """创建一个测试会话并返回其 ID。"""
    sid = "test-session-001"
    tmp_storage.create_session(sid, "测试会话")
    return sid


# ── 验收标准 #1: CoPaw + 百炼均未配置时，返回 Demo 结果 ──────

class TestDemoFallback:
    """验收 #1: CoPaw + 百炼均未配置时 ask() 返回 Demo 结果。"""

    @patch.dict(os.environ, {}, clear=True)
    def test_demo_mode_when_no_llm_configured(self, agent, session_id):
        result = agent.ask("测试问题", session_id)

        assert result["answer_source"] == "demo"
        assert result["llm_used"] is False
        assert result["model"] is None
        assert "演示模式" in result["answer"]
        assert "测试问题" in result["answer"]
        assert isinstance(result["references"], list)
        assert isinstance(result["response_time_ms"], int)


# ── 验收标准 #2: CoPaw 可用时优先返回 CoPaw 结果 ─────────────

class TestCoPawPriority:
    """验收 #2: CoPaw 可用时，优先返回 CoPaw 结果。"""

    @patch("agent.copaw_bridge.ask")
    def test_copaw_takes_priority(self, mock_copaw, agent, session_id):
        mock_copaw.return_value = {
            "answer": "CoPaw 回答",
            "llm_used": True,
            "model": "copaw",
            "answer_source": "copaw",
            "references": [{"chunk_id": "chk_001"}],
        }

        result = agent.ask("投资建议", session_id)

        assert result["answer_source"] == "copaw"
        assert result["llm_used"] is True
        assert result["answer"] == "CoPaw 回答"
        assert result["model"] == "copaw"
        mock_copaw.assert_called_once_with("投资建议", session_id)


# ── 验收标准 #3: CoPaw 不可用 + 百炼可用时返回百炼结果 ────────

class TestBailianFallback:
    """验收 #3: CoPaw 不可用 + 百炼可用时，返回百炼结果。"""

    @patch("agent.bailian_qa.ask")
    @patch("agent.copaw_bridge.ask")
    def test_bailian_when_copaw_down(self, mock_copaw, mock_bailian, agent, session_id):
        mock_copaw.return_value = None  # CoPaw 不可用
        mock_bailian.return_value = {
            "answer": "百炼回答",
            "llm_used": True,
            "model": "qwen-turbo",
            "answer_source": "bailian",
            "references": [],
        }

        result = agent.ask("市场分析", session_id)

        assert result["answer_source"] == "bailian"
        assert result["llm_used"] is True
        assert result["answer"] == "百炼回答"
        assert result["model"] == "qwen-turbo"
        mock_copaw.assert_called_once()
        mock_bailian.assert_called_once()


# ── 验收标准 #4: ask() 结果自动写入 Storage ──────────────────

class TestStorageWrite:
    """验收 #4: ask() 结果自动写入 Storage（add_record 被调用）。"""

    @patch.dict(os.environ, {}, clear=True)
    def test_ask_writes_to_storage(self, agent, session_id, tmp_storage):
        agent.ask("存储测试", session_id)

        records = tmp_storage.get_records_by_session(session_id)
        assert len(records) == 1
        record = records[0]
        assert record["query"] == "存储测试"
        assert record["answer_source"] == "demo"
        assert record["session_id"] == session_id

    @patch("agent.copaw_bridge.ask")
    def test_copaw_result_writes_to_storage(self, mock_copaw, agent, session_id, tmp_storage):
        mock_copaw.return_value = {
            "answer": "CoPaw 存储测试",
            "llm_used": True,
            "model": "copaw",
            "answer_source": "copaw",
            "references": [],
        }

        agent.ask("CoPaw 问题", session_id)

        records = tmp_storage.get_records_by_session(session_id)
        assert len(records) == 1
        assert records[0]["answer_source"] == "copaw"
        assert records[0]["llm_used"] is True


# ── 验收标准 #5: response_time_ms 正确计算 ──────────────────

class TestResponseTime:
    """验收 #5: response_time_ms 字段正确计算。"""

    @patch.dict(os.environ, {}, clear=True)
    def test_response_time_ms_is_positive_int(self, agent, session_id):
        result = agent.ask("时间测试", session_id)

        assert "response_time_ms" in result
        assert isinstance(result["response_time_ms"], int)
        assert result["response_time_ms"] >= 0

    @patch("agent.copaw_bridge.ask")
    def test_response_time_includes_provider_time(self, mock_copaw, agent, session_id):
        def slow_copaw(query, sid):
            time.sleep(0.05)  # 50ms
            return {
                "answer": "慢响应",
                "llm_used": True,
                "model": "copaw",
                "answer_source": "copaw",
                "references": [],
            }

        mock_copaw.side_effect = slow_copaw
        result = agent.ask("慢速测试", session_id)

        assert result["response_time_ms"] >= 50


# ── 验收标准 #6: check_health() 正确反映组件状态 ──────────────

class TestHealthCheck:
    """验收 #6: check_health() 正确反映各组件状态。"""

    @patch.dict(os.environ, {}, clear=True)
    def test_health_degraded_no_llm(self, agent):
        health = agent.check_health()

        assert health["status"] == "DEGRADED"
        assert health["components"]["storage"] == "UP"
        assert health["components"]["llm_copaw"] == "DOWN"
        assert health["components"]["llm_bailian"] == "DOWN"

    @patch.dict(os.environ, {"IRA_COPAW_CHAT_URL": "http://copaw.test"}, clear=True)
    def test_health_up_with_copaw(self, agent):
        health = agent.check_health()

        assert health["status"] == "UP"
        assert health["components"]["llm_copaw"] == "UP"
        assert health["components"]["llm_bailian"] == "DOWN"

    @patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=True)
    def test_health_up_with_bailian(self, agent):
        health = agent.check_health()

        assert health["status"] == "UP"
        assert health["components"]["llm_bailian"] == "UP"

    @patch.dict(
        os.environ,
        {"IRA_COPAW_CHAT_URL": "http://copaw.test", "DASHSCOPE_API_KEY": "test-key"},
        clear=True,
    )
    def test_health_up_with_both(self, agent):
        health = agent.check_health()

        assert health["status"] == "UP"
        assert health["components"]["llm_copaw"] == "UP"
        assert health["components"]["llm_bailian"] == "UP"

    def test_health_degraded_when_storage_broken(self, tmp_path):
        storage = Storage(data_dir=str(tmp_path / "data"))
        agent = CoPawAgent(storage=storage)

        # 损坏 storage 文件
        with open(storage._session_file, "w") as f:
            f.write("INVALID JSON")

        health = agent.check_health()
        assert health["status"] == "DEGRADED"
        assert health["components"]["storage"] == "DOWN"


# ── 验收标准 #7: get_capabilities() 返回配置检测结果 ──────────

class TestCapabilities:
    """验收 #7: get_capabilities() 返回配置检测结果。"""

    @patch.dict(os.environ, {}, clear=True)
    def test_no_capabilities(self, agent):
        caps = agent.get_capabilities()

        assert caps["copaw_configured"] is False
        assert caps["bailian_configured"] is False

    @patch.dict(os.environ, {"IRA_COPAW_CHAT_URL": "http://copaw.test"}, clear=True)
    def test_copaw_configured(self, agent):
        caps = agent.get_capabilities()

        assert caps["copaw_configured"] is True
        assert caps["bailian_configured"] is False

    @patch.dict(os.environ, {"DASHSCOPE_API_KEY": "test-key"}, clear=True)
    def test_bailian_configured(self, agent):
        caps = agent.get_capabilities()

        assert caps["copaw_configured"] is False
        assert caps["bailian_configured"] is True


# ── 降级顺序完整性测试 ───────────────────────────────────────

class TestDegradationOrder:
    """确保三级降级严格按顺序执行。"""

    @patch("agent.bailian_qa.ask")
    @patch("agent.copaw_bridge.ask")
    def test_full_degradation_copaw_bailian_demo(
        self, mock_copaw, mock_bailian, agent, session_id
    ):
        mock_copaw.return_value = None
        mock_bailian.return_value = None

        result = agent.ask("全降级测试", session_id)

        assert result["answer_source"] == "demo"
        mock_copaw.assert_called_once()
        mock_bailian.assert_called_once()

    @patch("agent.bailian_qa.ask")
    @patch("agent.copaw_bridge.ask")
    def test_copaw_success_skips_bailian(self, mock_copaw, mock_bailian, agent, session_id):
        mock_copaw.return_value = {
            "answer": "CoPaw OK",
            "llm_used": True,
            "model": "copaw",
            "answer_source": "copaw",
            "references": [],
        }

        result = agent.ask("跳级测试", session_id)

        assert result["answer_source"] == "copaw"
        mock_copaw.assert_called_once()
        mock_bailian.assert_not_called()  # 百炼不应被调用
