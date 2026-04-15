"""
Storage 层测试
对齐: 13 测试策略
"""
import pytest
import os
import json
import tempfile
import shutil

# 添加父目录到路径
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from storage import Storage


@pytest.fixture
def temp_storage():
    """创建临时存储"""
    temp_dir = tempfile.mkdtemp()
    storage = Storage(temp_dir)
    yield storage
    shutil.rmtree(temp_dir)


class TestSessionCRUD:
    """会话 CRUD 测试"""
    
    def test_create_session(self, temp_storage):
        """测试创建会话"""
        session = temp_storage.create_session()
        
        assert session["session_id"] is not None
        assert session["title"] == "新会话"
        assert session["status"] == "active"
        assert session["query_count"] == 0
    
    def test_create_session_with_title(self, temp_storage):
        """测试带标题创建会话"""
        session = temp_storage.create_session(title="测试会话")
        
        assert session["title"] == "测试会话"
    
    def test_create_session_title_truncate(self, temp_storage):
        """测试标题超长截断"""
        long_title = "a" * 150
        session = temp_storage.create_session(title=long_title)
        
        assert len(session["title"]) == 100
    
    def test_get_sessions(self, temp_storage):
        """测试获取会话列表"""
        temp_storage.create_session(title="会话1")
        temp_storage.create_session(title="会话2")
        
        sessions = temp_storage.get_sessions()
        
        assert len(sessions) == 2
        # 按创建时间倒序
        assert sessions[0]["title"] == "会话2"
    
    def test_delete_session_soft(self, temp_storage):
        """测试软删除会话"""
        session = temp_storage.create_session()
        
        result = temp_storage.delete_session(session["session_id"])
        
        assert result is True
        sessions = temp_storage.get_sessions()
        assert len(sessions) == 0
        
        # 验证数据仍存在
        all_sessions = temp_storage._read_json(temp_storage.sessions_file)
        assert len(all_sessions) == 1
        assert all_sessions[0]["status"] == "deleted"
    
    def test_update_session(self, temp_storage):
        """测试更新会话"""
        session = temp_storage.create_session()
        
        updated = temp_storage.update_session(
            session["session_id"],
            title="新标题"
        )
        
        assert updated["title"] == "新标题"


class TestRecordCRUD:
    """问答记录测试"""
    
    def test_add_record(self, temp_storage):
        """测试添加记录"""
        session = temp_storage.create_session()
        
        record = temp_storage.add_record(
            session_id=session["session_id"],
            query="测试问题",
            answer="测试回答",
            llm_used=True,
            model="qwen-turbo",
            response_time_ms=1000,
            answer_source="bailian",
            cited_passages=None
        )
        
        assert record["query"] == "测试问题"
        assert record["answer_source"] == "bailian"
        
        # 验证 query_count 自增
        updated_session = temp_storage.get_session(session["session_id"])
        assert updated_session["query_count"] == 1
    
    def test_first_query_auto_rename(self, temp_storage):
        """测试首次问答自动命名"""
        session = temp_storage.create_session(title="新会话")
        
        temp_storage.add_record(
            session_id=session["session_id"],
            query="这是一个很长的测试问题，用于验证自动命名功能是否正常工作",
            answer="回答",
            llm_used=False,
            model=None,
            response_time_ms=100,
            answer_source="demo",
            cited_passages=None
        )
        
        updated = temp_storage.get_session(session["session_id"])
        assert "这是一个很长的测试问题" in updated["title"]
        assert "..." in updated["title"]
    
    def test_get_records_by_session(self, temp_storage):
        """测试获取会话记录"""
        session = temp_storage.create_session()
        
        temp_storage.add_record(
            session_id=session["session_id"],
            query="问题1",
            answer="回答1",
            llm_used=False,
            model=None,
            response_time_ms=100,
            answer_source="demo",
            cited_passages=None
        )
        
        temp_storage.add_record(
            session_id=session["session_id"],
            query="问题2",
            answer="回答2",
            llm_used=False,
            model=None,
            response_time_ms=100,
            answer_source="demo",
            cited_passages=None
        )
        
        records = temp_storage.get_records_by_session(session["session_id"])
        
        assert len(records) == 2
        # 按时间正序
        assert records[0]["query"] == "问题1"


class TestErrorHandling:
    """错误处理测试"""
    
    def test_file_corruption_recovery(self, temp_storage):
        """测试文件损坏恢复"""
        # 写入无效 JSON
        with open(temp_storage.sessions_file, 'w') as f:
            f.write("invalid json {{{")
        
        # 应该返回空数组而不是崩溃
        sessions = temp_storage.get_sessions()
        assert sessions == []
