import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any


class Storage:
    """JSON文件存储层"""
    
    def __init__(self, data_dir: str = None):
        self.data_dir = data_dir or os.environ.get("DATA_DIR", "./data")
        os.makedirs(self.data_dir, exist_ok=True)
        
        self.sessions_file = os.path.join(self.data_dir, "sessions.json")
        self.records_file = os.path.join(self.data_dir, "qa_records.json")
        
        # 初始化文件
        self._init_file(self.sessions_file, [])
        self._init_file(self.records_file, [])
    
    def _init_file(self, filepath: str, default_data: Any):
        """初始化JSON文件"""
        if not os.path.exists(filepath):
            self._write_json(filepath, default_data)
    
    def _read_json(self, filepath: str) -> Any:
        """读取JSON文件"""
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    
    def _write_json(self, filepath: str, data: Any):
        """写入JSON文件"""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _now_iso(self) -> str:
        """获取当前ISO-8601格式时间"""
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # ==================== Session管理 ====================
    
    def create_session(self, session_id: str = None, title: str = "新会话") -> Dict:
        """
        创建新会话
        
        Args:
            session_id: 会话ID，不传则自动生成UUID
            title: 会话标题，默认"新会话"
        
        Returns:
            创建的会话对象
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        now = self._now_iso()
        session = {
            "session_id": session_id,
            "title": title[:23] if len(title) > 23 else title,  # 限制23字符
            "created_at": now,
            "updated_at": now,
            "query_count": 0
        }
        
        sessions = self._read_json(self.sessions_file)
        sessions.append(session)
        self._write_json(self.sessions_file, sessions)
        
        return session
    
    def get_sessions(self) -> List[Dict]:
        """
        获取全部会话列表，按updated_at倒序排列
        
        Returns:
            会话列表
        """
        sessions = self._read_json(self.sessions_file)
        # 按updated_at倒序排列
        sessions.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return sessions
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """
        获取指定会话
        
        Args:
            session_id: 会话ID
        
        Returns:
            会话对象，不存在则返回None
        """
        sessions = self._read_json(self.sessions_file)
        for session in sessions:
            if session.get("session_id") == session_id:
                return session
        return None
    
    def update_session(self, session_id: str, updates: Dict) -> Optional[Dict]:
        """
        更新会话字段
        
        Args:
            session_id: 会话ID
            updates: 要更新的字段字典
        
        Returns:
            更新后的会话对象，不存在则返回None
        """
        sessions = self._read_json(self.sessions_file)
        
        for i, session in enumerate(sessions):
            if session.get("session_id") == session_id:
                # 更新字段
                for key, value in updates.items():
                    if key in ["title", "query_count"]:
                        if key == "title" and len(value) > 23:
                            value = value[:23]
                        sessions[i][key] = value
                
                # 自动更新updated_at
                sessions[i]["updated_at"] = self._now_iso()
                
                self._write_json(self.sessions_file, sessions)
                return sessions[i]
        
        return None
    
    def delete_session(self, session_id: str) -> int:
        """
        删除会话，级联删除关联的问答记录
        
        Args:
            session_id: 会话ID
        
        Returns:
            级联删除的记录数量
        """
        # 删除会话
        sessions = self._read_json(self.sessions_file)
        sessions = [s for s in sessions if s.get("session_id") != session_id]
        self._write_json(self.sessions_file, sessions)
        
        # 级联删除问答记录
        deleted_count = self.delete_records_by_session(session_id)
        
        return deleted_count
    
    # ==================== QARecord管理 ====================
    
    def add_record(self, session_id: str, query: str, answer: str,
                   llm_used: bool = False, model: str = None,
                   response_time_ms: int = 0, answer_source: str = None) -> Dict:
        """
        添加问答记录，并自动更新会话的query_count
        
        Args:
            session_id: 会话ID
            query: 用户提问
            answer: AI回答
            llm_used: 是否使用真实LLM
            model: 模型标识
            response_time_ms: 响应耗时
            answer_source: 回答来源
        
        Returns:
            创建的记录对象
        """
        # 检查会话是否存在
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")
        
        # 生成记录ID
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        import random
        record_id = f"rec_{timestamp}_{random.randint(1000, 9999)}"
        
        record = {
            "id": record_id,
            "session_id": session_id,
            "query": query[:500] if len(query) > 500 else query,  # 限制500字符
            "answer": answer,
            "llm_used": llm_used,
            "model": model,
            "response_time_ms": response_time_ms,
            "answer_source": answer_source,
            "timestamp": self._now_iso()
        }
        
        records = self._read_json(self.records_file)
        records.append(record)
        self._write_json(self.records_file, records)
        
        # 更新会话query_count和updated_at
        new_count = session.get("query_count", 0) + 1
        updates = {"query_count": new_count}
        
        # 首次问答自动命名（query_count从0→1）
        if session.get("query_count", 0) == 0:
            new_title = query[:20] + ("..." if len(query) > 20 else "")
            updates["title"] = new_title
        
        self.update_session(session_id, updates)
        
        return record
    
    def get_records_by_session(self, session_id: str) -> List[Dict]:
        """
        获取指定会话的所有问答记录，按timestamp正序排列
        
        Args:
            session_id: 会话ID
        
        Returns:
            问答记录列表
        """
        records = self._read_json(self.records_file)
        session_records = [r for r in records if r.get("session_id") == session_id]
        # 按timestamp正序排列
        session_records.sort(key=lambda x: x.get("timestamp", ""))
        return session_records
    
    def delete_records_by_session(self, session_id: str) -> int:
        """
        删除指定会话的所有问答记录
        
        Args:
            session_id: 会话ID
        
        Returns:
            删除的记录数量
        """
        records = self._read_json(self.records_file)
        original_count = len(records)
        records = [r for r in records if r.get("session_id") != session_id]
        deleted_count = original_count - len(records)
        self._write_json(self.records_file, records)
        return deleted_count

    # ==================== Report管理 ====================
    
    def create_report(self, report: dict) -> dict:
        """
        创建研报记录
        
        Args:
            report: 研报数据字典
        
        Returns:
            创建的研报对象
        """
        # 初始化reports文件（如果不存在）
        reports_file = os.path.join(self.data_dir, "reports.json")
        self._init_file(reports_file, [])
        
        reports = self._read_json(reports_file)
        reports.append(report)
        self._write_json(reports_file, reports)
        return report
    
    def get_reports(self) -> List[Dict]:
        """
        获取全部研报列表
        
        Returns:
            研报列表
        """
        reports_file = os.path.join(self.data_dir, "reports.json")
        self._init_file(reports_file, [])
        return self._read_json(reports_file)
    
    def get_report(self, report_id: str) -> Optional[Dict]:
        """
        获取指定研报
        
        Args:
            report_id: 研报ID
        
        Returns:
            研报对象，不存在则返回None
        """
        reports = self.get_reports()
        for report in reports:
            if report.get("report_id") == report_id:
                return report
        return None
    
    def update_report(self, report_id: str, updates: Dict) -> Optional[Dict]:
        """
        更新研报字段
        
        Args:
            report_id: 研报ID
            updates: 要更新的字段字典
        
        Returns:
            更新后的研报对象，不存在则返回None
        """
        reports_file = os.path.join(self.data_dir, "reports.json")
        reports = self._read_json(reports_file)
        
        for i, report in enumerate(reports):
            if report.get("report_id") == report_id:
                reports[i].update(updates)
                self._write_json(reports_file, reports)
                return reports[i]
        
        return None
    
    def delete_report(self, report_id: str) -> bool:
        """
        删除研报
        
        Args:
            report_id: 研报ID
        
        Returns:
            是否删除成功
        """
        reports_file = os.path.join(self.data_dir, "reports.json")
        reports = self._read_json(reports_file)
        original_count = len(reports)
        reports = [r for r in reports if r.get("report_id") != report_id]
        
        if len(reports) == original_count:
            return False
        
        self._write_json(reports_file, reports)
        return True


# 全局存储实例
_storage_instance = None


def get_storage() -> Storage:
    """获取Storage单例"""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = Storage()
    return _storage_instance
