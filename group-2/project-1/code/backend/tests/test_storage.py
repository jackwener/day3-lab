"""
Storage 存储层验收测试
覆盖 TASK-02 全部 8 条验收标准
"""

import json
import os
import shutil
import time

import pytest

# 调整导入路径
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from storage import Storage


@pytest.fixture
def tmp_data_dir(tmp_path):
    """返回一个临时数据目录路径"""
    return str(tmp_path / "test_data")


@pytest.fixture
def store(tmp_data_dir):
    """返回一个已初始化的 Storage 实例"""
    return Storage(data_dir=tmp_data_dir)


# ------------------------------------------------------------------
# 验收 1: __init__ 目录不存在时自动创建，文件不存在时初始化空数组
# ------------------------------------------------------------------


class TestInit:
    def test_auto_create_directory(self, tmp_path):
        data_dir = str(tmp_path / "nonexistent" / "nested" / "dir")
        assert not os.path.exists(data_dir)
        Storage(data_dir=data_dir)
        assert os.path.isdir(data_dir)

    def test_init_empty_json_files(self, tmp_data_dir):
        Storage(data_dir=tmp_data_dir)
        for fname in ("session_info.json", "message_log.json", "doc_chunks.json"):
            path = os.path.join(tmp_data_dir, fname)
            assert os.path.exists(path)
            with open(path, "r", encoding="utf-8") as f:
                assert json.load(f) == []

    def test_existing_files_not_overwritten(self, tmp_data_dir):
        os.makedirs(tmp_data_dir, exist_ok=True)
        path = os.path.join(tmp_data_dir, "session_info.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump([{"session_id": "existing"}], f)
        Storage(data_dir=tmp_data_dir)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert len(data) == 1
        assert data[0]["session_id"] == "existing"


# ------------------------------------------------------------------
# 验收 2: create_session → 返回完整会话对象，query_count=0
# ------------------------------------------------------------------


class TestCreateSession:
    def test_returns_complete_session(self, store):
        session = store.create_session("s1", "测试会话")
        assert session["session_id"] == "s1"
        assert session["title"] == "测试会话"
        assert session["query_count"] == 0
        assert "created_at" in session
        assert "updated_at" in session

    def test_default_title(self, store):
        session = store.create_session("s2")
        assert session["title"] == "新会话"

    def test_persisted_to_file(self, store, tmp_data_dir):
        store.create_session("s1")
        path = os.path.join(tmp_data_dir, "session_info.json")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert len(data) == 1
        assert data[0]["session_id"] == "s1"


# ------------------------------------------------------------------
# 验收 3: get_sessions → 按 created_at 倒序返回
# ------------------------------------------------------------------


class TestGetSessions:
    def test_descending_order(self, store):
        store.create_session("s1", "第一个")
        time.sleep(0.01)
        store.create_session("s2", "第二个")
        time.sleep(0.01)
        store.create_session("s3", "第三个")

        sessions = store.get_sessions()
        assert len(sessions) == 3
        # 最新的在前
        assert sessions[0]["session_id"] == "s3"
        assert sessions[-1]["session_id"] == "s1"

    def test_empty_list(self, store):
        assert store.get_sessions() == []


# ------------------------------------------------------------------
# 验收 4: delete_session → 级联删除关联记录，返回删除计数
# ------------------------------------------------------------------


class TestDeleteSession:
    def test_cascade_delete(self, store):
        store.create_session("s1")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")
        store.add_record("s1", "q2", "a2", True, "copaw", 200, "copaw")

        result = store.delete_session("s1")
        assert result["deleted_session_id"] == "s1"
        assert result["deleted_records_count"] == 2

        # 确认 session 已删除
        assert store.get_sessions() == []

    def test_only_deletes_target_session_records(self, store):
        store.create_session("s1")
        store.create_session("s2")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")
        store.add_record("s2", "q2", "a2", True, "copaw", 200, "copaw")

        store.delete_session("s1")

        # s2 的记录不受影响
        records = store.get_records_by_session("s2")
        assert len(records) == 1

    def test_not_found_raises_key_error(self, store):
        with pytest.raises(KeyError):
            store.delete_session("nonexistent")


# ------------------------------------------------------------------
# 验收 5: add_record → 自动递增 query_count，首次问答自动命名
# ------------------------------------------------------------------


class TestAddRecord:
    def test_increments_query_count(self, store):
        store.create_session("s1")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")

        sessions = store.get_sessions()
        assert sessions[0]["query_count"] == 1

    def test_auto_rename_on_first_query(self, store):
        store.create_session("s1")
        long_query = "这是一个很长的问题用来测试自动命名功能是否正确"
        store.add_record("s1", long_query, "a1", True, "copaw", 100, "copaw")

        sessions = store.get_sessions()
        # 标题 = query[:20] + "..."（超过20字时追加省略号）
        expected = long_query[:20] + "..."
        assert sessions[0]["title"] == expected

    def test_no_rename_on_second_query(self, store):
        store.create_session("s1")
        store.add_record("s1", "第一个问题", "a1", True, "copaw", 100, "copaw")
        first_title = store.get_sessions()[0]["title"]
        store.add_record("s1", "第二个问题", "a2", True, "copaw", 200, "copaw")
        second_title = store.get_sessions()[0]["title"]
        assert first_title == second_title

    def test_short_query_no_ellipsis(self, store):
        store.create_session("s1")
        store.add_record("s1", "短问题", "a1", True, "copaw", 100, "copaw")

        sessions = store.get_sessions()
        assert sessions[0]["title"] == "短问题"

    def test_returns_record_object(self, store):
        store.create_session("s1")
        record = store.add_record(
            "s1", "q1", "a1", True, "copaw", 100, "copaw", [{"chunk_id": "chk_001"}]
        )
        assert record["record_id"].startswith("rec_")
        assert record["session_id"] == "s1"
        assert record["query"] == "q1"
        assert record["answer"] == "a1"
        assert record["llm_used"] is True
        assert record["model"] == "copaw"
        assert record["response_time_ms"] == 100
        assert record["answer_source"] == "copaw"
        assert "timestamp" in record
        assert record["references"] == [{"chunk_id": "chk_001"}]

    def test_session_not_found_raises_key_error(self, store):
        with pytest.raises(KeyError):
            store.add_record("nonexistent", "q", "a", True, None, 0, "demo")

    def test_default_references_empty_list(self, store):
        store.create_session("s1")
        record = store.add_record("s1", "q", "a", False, None, 0, "demo")
        assert record["references"] == []


# ------------------------------------------------------------------
# 验收 6: get_records_by_session → 按 timestamp 正序返回
# ------------------------------------------------------------------


class TestGetRecordsBySession:
    def test_ascending_order(self, store):
        store.create_session("s1")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")
        time.sleep(0.01)
        store.add_record("s1", "q2", "a2", True, "copaw", 200, "copaw")

        records = store.get_records_by_session("s1")
        assert len(records) == 2
        assert records[0]["query"] == "q1"
        assert records[1]["query"] == "q2"

    def test_filters_by_session(self, store):
        store.create_session("s1")
        store.create_session("s2")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")
        store.add_record("s2", "q2", "a2", True, "copaw", 200, "copaw")

        records = store.get_records_by_session("s1")
        assert len(records) == 1
        assert records[0]["session_id"] == "s1"

    def test_session_not_found_raises_key_error(self, store):
        with pytest.raises(KeyError):
            store.get_records_by_session("nonexistent")


# ------------------------------------------------------------------
# 验收 7: 会话不存在时，相关方法抛出 KeyError
# ------------------------------------------------------------------


class TestSessionNotFound:
    def test_delete_session(self, store):
        with pytest.raises(KeyError):
            store.delete_session("ghost")

    def test_update_session(self, store):
        with pytest.raises(KeyError):
            store.update_session("ghost", {"title": "new"})

    def test_add_record(self, store):
        with pytest.raises(KeyError):
            store.add_record("ghost", "q", "a", True, None, 0, "demo")

    def test_get_records_by_session(self, store):
        with pytest.raises(KeyError):
            store.get_records_by_session("ghost")

    def test_delete_records_by_session(self, store):
        with pytest.raises(KeyError):
            store.delete_records_by_session("ghost")


# ------------------------------------------------------------------
# 验收 8: get_chunk_by_id → 不存在返回 None
# ------------------------------------------------------------------


class TestGetChunkById:
    def test_not_found_returns_none(self, store):
        assert store.get_chunk_by_id("nonexistent") is None

    def test_found_returns_chunk(self, store, tmp_data_dir):
        # 手动写入测试数据
        chunk = {
            "chunk_id": "chk_001",
            "doc_title": "测试文档.pdf",
            "doc_url": "/docs/test.pdf",
            "page": 5,
            "highlight_text": "高亮文本",
            "bbox": {"x": 72, "y": 340, "width": 468, "height": 60},
        }
        path = os.path.join(tmp_data_dir, "doc_chunks.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump([chunk], f, ensure_ascii=False, indent=2)

        result = store.get_chunk_by_id("chk_001")
        assert result is not None
        assert result["chunk_id"] == "chk_001"
        assert result["doc_title"] == "测试文档.pdf"


# ------------------------------------------------------------------
# 额外：update_session 测试
# ------------------------------------------------------------------


class TestUpdateSession:
    def test_update_allowed_fields(self, store):
        store.create_session("s1", "原标题")
        updated = store.update_session("s1", {"title": "新标题"})
        assert updated["title"] == "新标题"

    def test_ignores_disallowed_fields(self, store):
        store.create_session("s1")
        updated = store.update_session("s1", {"session_id": "hacked", "title": "ok"})
        assert updated["session_id"] == "s1"  # 不允许修改 session_id
        assert updated["title"] == "ok"

    def test_not_found_raises_key_error(self, store):
        with pytest.raises(KeyError):
            store.update_session("ghost", {"title": "new"})


# ------------------------------------------------------------------
# 额外：delete_records_by_session 测试
# ------------------------------------------------------------------


class TestDeleteRecordsBySession:
    def test_returns_deleted_count(self, store):
        store.create_session("s1")
        store.add_record("s1", "q1", "a1", True, "copaw", 100, "copaw")
        store.add_record("s1", "q2", "a2", True, "copaw", 200, "copaw")

        count = store.delete_records_by_session("s1")
        assert count == 2

    def test_no_records_returns_zero(self, store):
        store.create_session("s1")
        count = store.delete_records_by_session("s1")
        assert count == 0
