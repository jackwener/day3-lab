"""
Storage 层 — JSON 文件 CRUD
对齐: 10 §2 存储引擎, §3 Session, §4 QARecord, §5 方法清单
"""
import json
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


class Storage:
    """JSON 文件存储层"""
    
    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self.sessions_file = os.path.join(data_dir, "sessions.json")
        self.records_file = os.path.join(data_dir, "qa_records.json")
        self.agents_file = os.path.join(data_dir, "custom_agents.json")
        self._init_storage()

    def _init_storage(self):
        """初始化存储文件，不存在则创建空数组"""
        os.makedirs(self.data_dir, exist_ok=True)

        for file_path in [self.sessions_file, self.records_file, self.agents_file]:
            if not os.path.exists(file_path):
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump([], f)
                logger.info(f"Created empty storage file: {file_path}")
    
    def _read_json(self, file_path: str) -> list:
        """读取 JSON 文件，损坏时返回空数组并记录日志"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed for {file_path}: {e}")
            return []
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            return []
    
    def _write_json(self, file_path: str, data: list):
        """写入 JSON 文件"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _get_utc_now(self) -> str:
        """获取当前 UTC 时间 ISO-8601 格式"""
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    
    # ==================== 会话管理 ====================
    
    def create_session(self, session_id: Optional[str] = None, title: str = "新会话") -> dict:
        """
        创建新会话
        对齐: 10 §5.1 create_session
        """
        sessions = self._read_json(self.sessions_file)
        
        if session_id is None:
            session_id = uuid.uuid4().hex
        
        # 标题最长 100 字符
        if len(title) > 100:
            title = title[:100]
        
        now = self._get_utc_now()
        session = {
            "session_id": session_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "query_count": 0,
            "status": "active"
        }
        
        sessions.append(session)
        self._write_json(self.sessions_file, sessions)
        
        logger.info(f"Created session: {session_id}")
        return session
    
    def get_sessions(self) -> list:
        """
        获取全部活跃会话，按创建时间倒序
        对齐: 10 §5.1 get_sessions
        """
        sessions = self._read_json(self.sessions_file)
        active_sessions = [s for s in sessions if s.get("status") == "active"]
        # 按创建时间倒序
        active_sessions.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return active_sessions
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """获取单个会话"""
        sessions = self._read_json(self.sessions_file)
        for s in sessions:
            if s.get("session_id") == session_id and s.get("status") == "active":
                return s
        return None
    
    def update_session(self, session_id: str, **kwargs) -> Optional[dict]:
        """
        更新会话字段
        对齐: 10 §5.1 update_session
        不可更新: session_id, created_at
        """
        sessions = self._read_json(self.sessions_file)
        
        for i, s in enumerate(sessions):
            if s.get("session_id") == session_id:
                # 禁止更新的字段
                forbidden = ["session_id", "created_at"]
                for key in forbidden:
                    kwargs.pop(key, None)
                
                sessions[i].update(kwargs)
                self._write_json(self.sessions_file, sessions)
                logger.info(f"Updated session: {session_id}")
                return sessions[i]
        
        return None
    
    def delete_session(self, session_id: str) -> bool:
        """
        软删除会话（status 置为 deleted）
        对齐: 10 §5.1 delete_session
        """
        sessions = self._read_json(self.sessions_file)
        
        for i, s in enumerate(sessions):
            if s.get("session_id") == session_id and s.get("status") == "active":
                sessions[i]["status"] = "deleted"
                sessions[i]["updated_at"] = self._get_utc_now()
                self._write_json(self.sessions_file, sessions)
                
                # 级联删除关联记录
                self.delete_records_by_session(session_id)
                
                logger.info(f"Soft deleted session: {session_id}")
                return True
        
        return False
    
    # ==================== 问答记录管理 ====================
    
    def add_record(
        self,
        session_id: str,
        query: str,
        answer: str,
        llm_used: bool,
        model: Optional[str],
        response_time_ms: int,
        answer_source: str,
        cited_passages: Optional[list] = None,
        record_type: str = "qa",
        extra_data: Optional[dict] = None
    ) -> dict:
        """
        添加问答记录
        对齐: 10 §5.2 add_record
        record_type: qa | market-data | parse-result | compare-result
        extra_data: 不同类型记录的附加数据
        """
        records = self._read_json(self.records_file)
        
        # 生成 ID: rec_{timestamp_ms}_{random_suffix}
        import time
        import random
        timestamp_ms = int(time.time() * 1000)
        random_suffix = ''.join([str(random.randint(0, 9)) for _ in range(4)])
        record_id = f"rec_{timestamp_ms}_{random_suffix}"
        
        record = {
            "id": record_id,
            "session_id": session_id,
            "record_type": record_type,
            "query": query,
            "answer": answer,
            "llm_used": llm_used,
            "model": model,
            "response_time_ms": response_time_ms,
            "answer_source": answer_source,
            "cited_passages": cited_passages,
            "created_at": self._get_utc_now()
        }
        
        # 合并附加数据（行情stocks、解析parsed、对比comparison等）
        if extra_data:
            record.update(extra_data)
        
        records.append(record)
        self._write_json(self.records_file, records)
        
        # 更新会话: query_count +1, updated_at
        session = self.get_session(session_id)
        if session:
            new_count = session.get("query_count", 0) + 1
            
            # 首次问答自动命名: 截取 query 前 20 字符
            update_data = {
                "query_count": new_count,
                "updated_at": self._get_utc_now()
            }
            
            if session.get("query_count", 0) == 0:
                auto_title = query[:20]
                if len(query) > 20:
                    auto_title += "..."
                update_data["title"] = auto_title
            
            self.update_session(session_id, **update_data)
        
        logger.info(f"Added record: {record_id} to session: {session_id}")
        return record
    
    def get_records_by_session(self, session_id: str) -> list:
        """
        获取会话的所有问答记录，按创建时间正序
        对齐: 10 §5.2 get_records_by_session
        """
        # 先检查会话是否存在且活跃
        session = self.get_session(session_id)
        if not session:
            return []
        
        records = self._read_json(self.records_file)
        session_records = [r for r in records if r.get("session_id") == session_id]
        # 按创建时间正序
        session_records.sort(key=lambda x: x.get("created_at", ""))
        return session_records
    
    def delete_records_by_session(self, session_id: str):
        """
        删除会话关联的所有记录
        对齐: 10 §5.2 delete_records_by_session
        """
        records = self._read_json(self.records_file)
        remaining = [r for r in records if r.get("session_id") != session_id]
        self._write_json(self.records_file, remaining)
        logger.info(f"Deleted records for session: {session_id}")

    # ==================== 自定义智能体 ====================

    def get_custom_agents(self) -> list:
        """获取所有自定义智能体"""
        return self._read_json(self.agents_file)

    def get_custom_agent(self, agent_id: str) -> Optional[dict]:
        """获取单个自定义智能体"""
        for a in self._read_json(self.agents_file):
            if a.get("agent_id") == agent_id:
                return a
        return None

    def create_custom_agent(
        self, name: str, description: str = "",
        icon: str = "🤖", system_prompt: str = ""
    ) -> dict:
        """创建自定义智能体"""
        agents = self._read_json(self.agents_file)
        now = self._get_utc_now()
        agent = {
            "agent_id": uuid.uuid4().hex,
            "name": name,
            "description": description,
            "icon": icon,
            "system_prompt": system_prompt,
            "created_at": now,
            "updated_at": now,
        }
        agents.append(agent)
        self._write_json(self.agents_file, agents)
        logger.info(f"Created custom agent: {agent['agent_id']}")
        return agent

    def update_custom_agent(self, agent_id: str, **kwargs) -> Optional[dict]:
        """更新自定义智能体"""
        agents = self._read_json(self.agents_file)
        for i, a in enumerate(agents):
            if a.get("agent_id") == agent_id:
                forbidden = {"agent_id", "created_at"}
                for key in list(kwargs.keys()):
                    if key in forbidden:
                        kwargs.pop(key)
                agents[i].update(kwargs)
                agents[i]["updated_at"] = self._get_utc_now()
                self._write_json(self.agents_file, agents)
                return agents[i]
        return None

    def delete_custom_agent(self, agent_id: str) -> bool:
        """删除自定义智能体"""
        agents = self._read_json(self.agents_file)
        new_agents = [a for a in agents if a.get("agent_id") != agent_id]
        if len(new_agents) == len(agents):
            return False
        self._write_json(self.agents_file, new_agents)
        logger.info(f"Deleted custom agent: {agent_id}")
        return True


# 全局单例
_storage = None

def get_storage() -> Storage:
    """获取 Storage 单例"""
    global _storage
    if _storage is None:
        data_dir = os.environ.get("DATA_DIR", "./data")
        _storage = Storage(data_dir)
    return _storage
