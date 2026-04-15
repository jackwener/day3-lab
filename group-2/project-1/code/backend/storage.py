"""
Storage 存储层 — JSON 文件 CRUD 实现
对齐 Spec: 10 全文, 08 §5, 09 §2 错误码
"""

import json
import os
import time
from datetime import datetime, timezone


class Storage:
    """基于 JSON 文件的 Session / QARecord / DocChunk CRUD 存储。"""

    _SESSION_FILE = "session_info.json"
    _MESSAGE_FILE = "message_log.json"
    _CHUNK_FILE = "doc_chunks.json"

    def __init__(self, data_dir: str = "./data"):
        """
        初始化存储实例。
        - 若 data_dir 不存在，自动创建
        - 若 JSON 文件不存在，初始化为空数组 []
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)

        # 实例属性别名（兼容测试中直接访问）
        self._session_file = os.path.join(data_dir, self._SESSION_FILE)
        self._message_file = os.path.join(data_dir, self._MESSAGE_FILE)
        self._doc_chunks_file = os.path.join(data_dir, self._CHUNK_FILE)

        for fname in (self._SESSION_FILE, self._MESSAGE_FILE, self._CHUNK_FILE):
            path = os.path.join(data_dir, fname)
            if not os.path.exists(path):
                self._write_json(path, [])

    # ------------------------------------------------------------------
    # 内部工具方法
    # ------------------------------------------------------------------

    def _json_path(self, filename: str) -> str:
        return os.path.join(self.data_dir, filename)

    def _read_json(self, path: str) -> list:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: str, data: list) -> None:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _now_utc(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    # ------------------------------------------------------------------
    # 5.1 会话管理
    # ------------------------------------------------------------------

    def create_session(self, session_id: str, title: str = "新会话") -> dict:
        """创建新会话，query_count=0，时间戳设为当前 UTC。对齐 10 §5.1 TC-M01-041"""
        now = self._now_utc()
        session = {
            "session_id": session_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "query_count": 0,
        }
        path = self._json_path(self._SESSION_FILE)
        sessions = self._read_json(path)
        sessions.append(session)
        self._write_json(path, sessions)
        return session

    def get_sessions(self) -> list[dict]:
        """返回全部会话，按 created_at 倒序排列。对齐 10 §5.1 TC-M01-042"""
        sessions = self._read_json(self._json_path(self._SESSION_FILE))
        sessions.sort(key=lambda s: s["created_at"], reverse=True)
        return sessions

    def delete_session(self, session_id: str) -> dict:
        """
        删除指定会话 + 级联删除关联 QARecord。
        返回 {"deleted_session_id": ..., "deleted_records_count": ...}
        不存在抛 KeyError。对齐 10 §5.1 TC-M01-043
        """
        # 删除 session
        path = self._json_path(self._SESSION_FILE)
        sessions = self._read_json(path)
        found = False
        new_sessions = []
        for s in sessions:
            if s["session_id"] == session_id:
                found = True
            else:
                new_sessions.append(s)
        if not found:
            raise KeyError(f"Session not found: {session_id}")
        self._write_json(path, new_sessions)

        # 级联删除关联记录
        deleted_count = self.delete_records_by_session(session_id, _skip_check=True)

        return {
            "deleted_session_id": session_id,
            "deleted_records_count": deleted_count,
        }

    def update_session(self, session_id: str, updates: dict) -> dict:
        """
        合并更新会话字段（仅允许 title、query_count、updated_at）。
        不存在抛 KeyError。对齐 10 §5.1 TC-M01-046
        """
        allowed_keys = {"title", "query_count", "updated_at", "last_query"}
        path = self._json_path(self._SESSION_FILE)
        sessions = self._read_json(path)

        target = None
        for s in sessions:
            if s["session_id"] == session_id:
                target = s
                break
        if target is None:
            raise KeyError(f"Session not found: {session_id}")

        for k, v in updates.items():
            if k in allowed_keys:
                target[k] = v

        self._write_json(path, sessions)
        return dict(target)

    # ------------------------------------------------------------------
    # 5.2 问答记录管理
    # ------------------------------------------------------------------

    def add_record(
        self,
        session_id: str,
        query: str,
        answer: str,
        llm_used: bool,
        model: str | None,
        response_time_ms: int,
        answer_source: str,
        references: list | None = None,
    ) -> dict:
        """
        写入 QARecord；record_id = f"rec_{timestamp_ms}"。
        同时递增 query_count + 更新 updated_at；首次问答自动命名。
        会话不存在抛 KeyError。对齐 10 §5.2 TC-M01-044
        """
        # 校验会话存在性
        self._assert_session_exists(session_id)

        now = self._now_utc()
        record_id = f"rec_{int(time.time() * 1000)}"

        record = {
            "record_id": record_id,
            "session_id": session_id,
            "query": query,
            "answer": answer,
            "llm_used": llm_used,
            "model": model,
            "response_time_ms": response_time_ms,
            "answer_source": answer_source,
            "timestamp": now,
            "references": references if references is not None else [],
        }

        # 写入 message_log.json
        path = self._json_path(self._MESSAGE_FILE)
        records = self._read_json(path)
        records.append(record)
        self._write_json(path, records)

        # 递增 query_count + 更新 updated_at
        session_path = self._json_path(self._SESSION_FILE)
        sessions = self._read_json(session_path)
        for s in sessions:
            if s["session_id"] == session_id:
                s["query_count"] = s.get("query_count", 0) + 1
                s["updated_at"] = now
                s["last_query"] = query
                # 首次问答自动命名 (query_count 从 0→1)
                if s["query_count"] == 1:
                    s["title"] = query[:20] + ("..." if len(query) > 20 else "")
                break
        self._write_json(session_path, sessions)

        return record

    def get_records_by_session(self, session_id: str) -> list[dict]:
        """按 session_id 过滤，按 timestamp 正序排列。对齐 10 §5.2 TC-M01-045"""
        self._assert_session_exists(session_id)

        records = self._read_json(self._json_path(self._MESSAGE_FILE))
        filtered = [r for r in records if r["session_id"] == session_id]
        filtered.sort(key=lambda r: r["timestamp"])
        return filtered

    def delete_records_by_session(
        self, session_id: str, *, _skip_check: bool = False
    ) -> int:
        """
        删除指定会话下全部记录，返回删除条数。
        对齐 10 §5.2 TC-M01-047
        """
        if not _skip_check:
            self._assert_session_exists(session_id)

        path = self._json_path(self._MESSAGE_FILE)
        records = self._read_json(path)
        kept = []
        deleted = 0
        for r in records:
            if r["session_id"] == session_id:
                deleted += 1
            else:
                kept.append(r)
        self._write_json(path, kept)
        return deleted

    # ------------------------------------------------------------------
    # 5.3 文档块管理
    # ------------------------------------------------------------------

    def get_chunk_by_id(self, chunk_id: str) -> dict | None:
        """按 chunk_id 查找 DocChunk；未找到返回 None。对齐 10 §5.3 TC-M01-048"""
        chunks = self._read_json(self._json_path(self._CHUNK_FILE))
        for c in chunks:
            if c["chunk_id"] == chunk_id:
                return c
        return None

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------

    def _assert_session_exists(self, session_id: str) -> None:
        """校验 session_id 是否存在，不存在抛 KeyError。"""
        sessions = self._read_json(self._json_path(self._SESSION_FILE))
        for s in sessions:
            if s["session_id"] == session_id:
                return
        raise KeyError(f"Session not found: {session_id}")
