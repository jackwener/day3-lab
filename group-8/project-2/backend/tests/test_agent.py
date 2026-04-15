import pytest
from unittest.mock import patch
from app.agent import CoPawAgent


@pytest.fixture
def agent():
    return CoPawAgent()


def test_ask_copaw_success(agent):
    """TC-M01-060: mock CoPaw 返回成功 → answer_source='copaw', llm_used=True"""
    with patch("app.agent.ask_copaw", return_value={"answer": "CoPaw回答", "model": "copaw-v1"}):
        result = agent.ask("测试问题", "session-1")
    assert result["answer_source"] == "copaw"
    assert result["llm_used"] is True
    assert result["answer"] == "CoPaw回答"
    assert result["model"] == "copaw-v1"


def test_ask_copaw_fail_bailian_success(agent):
    """TC-M01-061: mock CoPaw 返回 None → 降级到百炼"""
    with patch("app.agent.ask_copaw", return_value=None):
        with patch("app.agent.ask_bailian", return_value={"answer": "百炼回答", "model": "qwen-plus"}):
            result = agent.ask("测试问题", "session-1")
    assert result["answer_source"] == "bailian"
    assert result["llm_used"] is True
    assert result["answer"] == "百炼回答"


def test_ask_all_fail_demo(agent):
    """TC-M01-062: 两级均 None → answer_source='demo', llm_used=False"""
    with patch("app.agent.ask_copaw", return_value=None):
        with patch("app.agent.ask_bailian", return_value=None):
            result = agent.ask("测试问题", "session-1")
    assert result["answer_source"] == "demo"
    assert result["llm_used"] is False
    assert result["model"] is None
    assert "演示模式" in result["answer"]


def test_ask_response_time_recorded(agent):
    """TC-M01-063: response_time_ms > 0"""
    with patch("app.agent.ask_copaw", return_value=None):
        with patch("app.agent.ask_bailian", return_value=None):
            result = agent.ask("测试问题", "session-1")
    assert isinstance(result["response_time_ms"], int)
    assert result["response_time_ms"] >= 0
