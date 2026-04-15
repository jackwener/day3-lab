"""
tests/test_storage.py — Storage 层单元测试
覆盖 TC-M01-040 ~ TC-M01-047
"""
import pytest


class TestStorageInit:
    """TC-M01-040 — Storage.__init__ 自动创建目录和文件"""

    def test_directories_created(self, tmp_path):
        from storage import Storage

        data_dir = str(tmp_path / "new_data")
        s = Storage(data_dir)

        import os
        assert os.path.isdir(data_dir)
        assert os.path.isdir(os.path.join(data_dir, "exports"))
        assert os.path.exists(s._sessions_path)
        assert os.path.exists(s._records_path)
        assert os.path.exists(s._reports_path)

    def test_initial_files_are_empty_lists(self, storage):
        assert storage.get_sessions() == []
        assert storage.get_records_by_session("any") == []


class TestCreateSession:
    """TC-M01-041 — Storage.create_session"""

    def test_creates_session_with_correct_fields(self, storage):
        session = storage.create_session("550e8400-e29b-41d4-a716-446655440001")
        assert session["session_id"] == "550e8400-e29b-41d4-a716-446655440001"
        assert session["title"] == "新会话"
        assert session["query_count"] == 0
        assert "created_at" in session
        assert "updated_at" in session

    def test_creates_session_with_custom_title(self, storage):
        session = storage.create_session("550e8400-e29b-41d4-a716-446655440002", title="测试会话")
        assert session["title"] == "测试会话"

    def test_session_persisted(self, storage):
        storage.create_session("550e8400-e29b-41d4-a716-446655440003")
        sessions = storage.get_sessions()
        assert len(sessions) == 1


class TestGetSessions:
    """TC-M01-042 — Storage.get_sessions 倒序排列"""

    def test_returns_all_sessions(self, storage):
        storage.create_session("550e8400-0000-0000-0000-000000000001")
        storage.create_session("550e8400-0000-0000-0000-000000000002")
        sessions = storage.get_sessions()
        assert len(sessions) == 2

    def test_sessions_sorted_by_updated_at_desc(self, storage):
        import time
        s1 = storage.create_session("550e8400-0000-0000-0000-000000000001")
        time.sleep(0.01)
        s2 = storage.create_session("550e8400-0000-0000-0000-000000000002")
        sessions = storage.get_sessions()
        # 最新创建的排在最前面
        assert sessions[0]["session_id"] == s2["session_id"]


class TestDeleteSession:
    """TC-M01-043 — Storage.delete_session + 级联删除"""

    def test_deletes_session(self, storage):
        storage.create_session("550e8400-0000-0000-0000-000000000001")
        storage.delete_session("550e8400-0000-0000-0000-000000000001")
        assert storage.get_session("550e8400-0000-0000-0000-000000000001") is None

    def test_cascade_deletes_records(self, storage):
        """TC-M01-023"""
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        storage.add_record(sid, "问题1", "答案1")
        storage.add_record(sid, "问题2", "答案2")
        assert len(storage.get_records_by_session(sid)) == 2

        storage.delete_session(sid)
        assert len(storage.get_records_by_session(sid)) == 0


class TestAddRecord:
    """TC-M01-044 — Storage.add_record"""

    def test_record_written_correctly(self, storage):
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        rec = storage.add_record(sid, "分析宁德时代", "答案内容", llm_used=False, answer_source="demo")
        assert rec["query"] == "分析宁德时代"
        assert rec["answer"] == "答案内容"
        assert rec["answer_source"] == "demo"
        assert rec["session_id"] == sid

    def test_query_count_increments(self, storage):
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        storage.add_record(sid, "问题", "答案")
        session = storage.get_session(sid)
        assert session["query_count"] == 1

    def test_auto_naming_first_query(self, storage):
        """TC-M01-050 — 首次问答自动命名（query_count 0→1）"""
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        query = "分析新能源行业最新趋势"
        storage.add_record(sid, query, "答案")
        session = storage.get_session(sid)
        assert session["title"] == query[:20]

    def test_auto_naming_only_once(self, storage):
        """TC-M01-051 — 自动命名仅触发一次"""
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        storage.add_record(sid, "第一次问题", "答案1")
        first_title = storage.get_session(sid)["title"]
        storage.add_record(sid, "第二次完全不同的问题", "答案2")
        assert storage.get_session(sid)["title"] == first_title

    def test_auto_naming_short_query(self, storage):
        """TC-M01-052 — query 不足20字时使用完整 query"""
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        query = "短问题"
        storage.add_record(sid, query, "答案")
        session = storage.get_session(sid)
        assert session["title"] == query  # 无省略号


class TestGetRecordsBySession:
    """TC-M01-045/046"""

    def test_returns_only_session_records(self, storage):
        sid1 = "550e8400-0000-0000-0000-000000000001"
        sid2 = "550e8400-0000-0000-0000-000000000002"
        storage.create_session(sid1)
        storage.create_session(sid2)
        storage.add_record(sid1, "问题A", "答案A")
        storage.add_record(sid2, "问题B", "答案B")
        records = storage.get_records_by_session(sid1)
        assert len(records) == 1
        assert records[0]["query"] == "问题A"

    def test_returns_empty_for_no_records(self, storage):
        """TC-M01-031"""
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        assert storage.get_records_by_session(sid) == []


class TestUpdateSession:
    """TC-M01-047"""

    def test_updates_title_successfully(self, storage):
        sid = "550e8400-0000-0000-0000-000000000001"
        storage.create_session(sid)
        updated = storage.update_session(sid, {"title": "新标题"})
        assert updated["title"] == "新标题"

    def test_returns_none_for_missing_session(self, storage):
        result = storage.update_session("nonexistent-id", {"title": "x"})
        assert result is None
