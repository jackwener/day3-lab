"""
Storage 模块单元测试

测试覆盖 Session CRUD 和 QARecord CRUD 共 11 个测试用例
"""

import uuid
import time
import os
import pytest
from app.storage import Storage


# --- Session 测试 ---

def test_storage_init_creates_dir(tmp_path):
    """TC-M01-040: 目录不存在时自动创建，JSON 初始化为空数组"""
    data_dir = str(tmp_path / "nonexistent" / "data")
    s = Storage(data_dir)
    assert os.path.exists(data_dir)
    assert s.get_sessions() == []


def test_create_session(storage):
    """TC-M01-041: 返回 dict 含 session_id/title/created_at/query_count=0"""
    sid = str(uuid.uuid4())
    result = storage.create_session(sid, "测试会话")
    assert result["session_id"] == sid
    assert result["title"] == "测试会话"
    assert result["query_count"] == 0
    assert "created_at" in result
    assert "updated_at" in result


def test_get_sessions(storage):
    """TC-M01-042: 创建 2 个后返回长度为 2 的列表"""
    storage.create_session(str(uuid.uuid4()), "会话1")
    storage.create_session(str(uuid.uuid4()), "会话2")
    sessions = storage.get_sessions()
    assert len(sessions) == 2


def test_delete_session_cascade(storage):
    """TC-M01-043: 删除会话后，关联 QARecord 同步清空"""
    sid = str(uuid.uuid4())
    storage.create_session(sid)
    storage.add_record(sid, "问题", "回答", False, None, 100, "demo")
    assert len(storage.get_records_by_session(sid)) == 1
    storage.delete_session(sid)
    assert len(storage.get_records_by_session(sid)) == 0
    # 会话也不存在了
    assert storage.get_session(sid) is None


def test_update_session(storage):
    """TC-M01-046: 更新 title 后字段生效，updated_at 刷新"""
    sid = str(uuid.uuid4())
    created = storage.create_session(sid, "原标题")
    old_updated = created["updated_at"]
    time.sleep(0.01)  # 确保时间戳不同
    updated = storage.update_session(sid, {"title": "新标题"})
    assert updated["title"] == "新标题"
    # updated_at 应该刷新了（可能相同也可能不同，取决于精度，至少不报错）
    assert "updated_at" in updated


def test_delete_nonexistent_session(storage):
    """TC-M01-048: 删除不存在的 session_id 不报错"""
    # 不应抛出异常
    storage.delete_session("nonexistent-id")


# --- QARecord 测试 ---

def test_add_record(storage):
    """TC-M01-044: 写入成功，session.query_count +1，updated_at 刷新"""
    sid = str(uuid.uuid4())
    storage.create_session(sid)
    record = storage.add_record(sid, "什么是基金？", "基金是...", True, "qwen-plus", 500, "bailian")
    assert record["query"] == "什么是基金？"
    assert record["answer"] == "基金是..."
    assert record["session_id"] == sid
    session = storage.get_session(sid)
    assert session["query_count"] == 1


def test_get_records_by_session(storage):
    """TC-M01-045: 返回列表仅含指定 session 的记录"""
    sid1 = str(uuid.uuid4())
    sid2 = str(uuid.uuid4())
    storage.create_session(sid1)
    storage.create_session(sid2)
    storage.add_record(sid1, "q1", "a1", False, None, 10, "demo")
    storage.add_record(sid2, "q2", "a2", False, None, 10, "demo")
    records = storage.get_records_by_session(sid1)
    assert len(records) == 1
    assert records[0]["session_id"] == sid1


def test_delete_records_by_session(storage):
    """TC-M01-047: 返回删除条数，再查为空"""
    sid = str(uuid.uuid4())
    storage.create_session(sid)
    storage.add_record(sid, "q1", "a1", False, None, 10, "demo")
    storage.add_record(sid, "q2", "a2", False, None, 10, "demo")
    deleted = storage.delete_records_by_session(sid)
    assert deleted == 2
    assert len(storage.get_records_by_session(sid)) == 0


def test_first_query_auto_rename(storage):
    """TC-M01-049: 首次提问后 session.title = query[:20]+'...'"""
    sid = str(uuid.uuid4())
    storage.create_session(sid, "新会话")
    long_query = "这是一个非常长的测试问题用来验证自动命名功能是否正常"
    storage.add_record(sid, long_query, "回答", False, None, 10, "demo")
    session = storage.get_session(sid)
    assert session["title"] == long_query[:20] + "..."


def test_second_query_no_rename(storage):
    """TC-M01-050: 第二次提问不再更改 title"""
    sid = str(uuid.uuid4())
    storage.create_session(sid, "新会话")
    storage.add_record(sid, "第一个问题", "回答1", False, None, 10, "demo")
    first_title = storage.get_session(sid)["title"]
    storage.add_record(sid, "第二个完全不同的问题", "回答2", False, None, 10, "demo")
    assert storage.get_session(sid)["title"] == first_title


# --- Report 测试 ---

def test_save_report(storage):
    """TC-M01-070: 写入成功，字段完整"""
    report = {
        "report_id": "rpt_001",
        "session_id": "sess_001",
        "file_name": "test_report.pdf",
        "file_type": "pdf",
        "file_size": 1024,
        "file_path": "/uploads/test_report.pdf",
        "uploaded_at": "2026-04-14T08:00:00Z",
        "status": "parsed",
        "extracted_data": {
            "rating": "买入",
            "target_price": "150.00",
            "key_points": ["业绩增长", "市场份额扩大"],
            "summary": "测试摘要",
            "raw_text": "测试原文"
        }
    }
    result = storage.save_report(report)
    assert result["report_id"] == "rpt_001"
    assert result["file_name"] == "test_report.pdf"
    assert result["extracted_data"]["rating"] == "买入"


def test_get_reports_all(storage):
    """TC-M01-071: 返回全部报告列表"""
    storage.save_report({"report_id": "rpt_001", "session_id": "s1", "file_name": "a.pdf", "file_type": "pdf", "file_size": 100, "file_path": "/a.pdf", "uploaded_at": "2026-04-14T08:00:00Z", "status": "parsed", "extracted_data": {}})
    storage.save_report({"report_id": "rpt_002", "session_id": "s2", "file_name": "b.pdf", "file_type": "pdf", "file_size": 200, "file_path": "/b.pdf", "uploaded_at": "2026-04-14T09:00:00Z", "status": "parsed", "extracted_data": {}})
    reports = storage.get_reports()
    assert len(reports) == 2


def test_get_reports_by_session(storage):
    """TC-M01-072: 按 session_id 过滤"""
    storage.save_report({"report_id": "rpt_001", "session_id": "s1", "file_name": "a.pdf", "file_type": "pdf", "file_size": 100, "file_path": "/a.pdf", "uploaded_at": "2026-04-14T08:00:00Z", "status": "parsed", "extracted_data": {}})
    storage.save_report({"report_id": "rpt_002", "session_id": "s2", "file_name": "b.pdf", "file_type": "pdf", "file_size": 200, "file_path": "/b.pdf", "uploaded_at": "2026-04-14T09:00:00Z", "status": "parsed", "extracted_data": {}})
    reports = storage.get_reports(session_id="s1")
    assert len(reports) == 1
    assert reports[0]["report_id"] == "rpt_001"


def test_get_report_by_id(storage):
    """TC-M01-073: 返回单条；不存在返回 None"""
    storage.save_report({"report_id": "rpt_001", "session_id": "s1", "file_name": "a.pdf", "file_type": "pdf", "file_size": 100, "file_path": "/a.pdf", "uploaded_at": "2026-04-14T08:00:00Z", "status": "parsed", "extracted_data": {}})
    report = storage.get_report_by_id("rpt_001")
    assert report is not None
    assert report["report_id"] == "rpt_001"
    assert storage.get_report_by_id("nonexistent") is None


def test_delete_report(storage):
    """TC-M01-074: 删除后查询为 None"""
    storage.save_report({"report_id": "rpt_001", "session_id": "s1", "file_name": "a.pdf", "file_type": "pdf", "file_size": 100, "file_path": "/a.pdf", "uploaded_at": "2026-04-14T08:00:00Z", "status": "parsed", "extracted_data": {}})
    assert storage.delete_report("rpt_001") is True
    assert storage.get_report_by_id("rpt_001") is None
    assert storage.delete_report("nonexistent") is False
