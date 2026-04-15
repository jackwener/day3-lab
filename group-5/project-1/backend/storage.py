"""
内存存储模块 — 对齐 Spec 10 数据模型
Session / QARecord / ReportFile 均为内存字典存储
"""

import os
import uuid
import time
from datetime import datetime, timezone


class Storage:
    """内存存储，对齐 Spec 10 §2（前端 React State + 后端文件系统）"""

    def __init__(self):
        self._sessions = {}      # session_id -> Session dict
        self._records = {}       # session_id -> [QARecord dict, ...]
        self._files = {}         # file_id -> ReportFile dict

    # ==================== Session ====================

    def create_session(self, title="新会话"):
        """对齐 Spec 10 §3 Session 实体"""
        now = datetime.now(timezone.utc).isoformat()
        session = {
            "session_id": str(uuid.uuid4()),
            "title": title,
            "created_at": now,
            "updated_at": now,
            "query_count": 0,
            "status": "active",
        }
        self._sessions[session["session_id"]] = session
        self._records[session["session_id"]] = []
        return dict(session)

    def list_sessions(self):
        """按 updated_at 倒序返回"""
        active = [s for s in self._sessions.values() if s["status"] == "active"]
        return sorted(active, key=lambda s: s["updated_at"], reverse=True)

    def get_session(self, session_id):
        s = self._sessions.get(session_id)
        return dict(s) if s and s["status"] == "active" else None

    def delete_session(self, session_id):
        """对齐 Spec 09 §6 级联删除"""
        session = self._sessions.get(session_id)
        if not session or session["status"] == "deleted":
            return None
        deleted_records = len(self._records.get(session_id, []))
        session["status"] = "deleted"
        self._records.pop(session_id, None)
        # 删除关联文件记录
        to_remove = [fid for fid, f in self._files.items() if f["session_id"] == session_id]
        for fid in to_remove:
            self._files.pop(fid, None)
        return {"deleted": True, "deleted_records": deleted_records}

    # ==================== QARecord ====================

    def add_record(self, session_id, file_id, query, result):
        """对齐 Spec 10 §4 QARecord 实体"""
        record = {
            "id": f"rec_{int(time.time() * 1000)}",
            "session_id": session_id,
            "file_id": file_id,
            "query": query,
            "answer": result.get("answer", ""),
            "llm_used": result.get("llm_used", False),
            "model": result.get("model"),
            "response_time_ms": result.get("response_time_ms", 0),
            "answer_source": result.get("answer_source", "demo"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if session_id not in self._records:
            self._records[session_id] = []
        self._records[session_id].append(record)
        # 更新 session
        if session_id in self._sessions:
            self._sessions[session_id]["query_count"] += 1
            self._sessions[session_id]["updated_at"] = record["timestamp"]
        return record

    def list_records(self, session_id):
        """按 timestamp 倒序"""
        recs = self._records.get(session_id, [])
        return sorted(recs, key=lambda r: r["timestamp"], reverse=True)

    # ==================== ReportFile ====================

    def save_file(self, session_id, file_obj, upload_folder):
        """对齐 Spec 10 §5 ReportFile 实体"""
        file_id = str(uuid.uuid4())
        ext = file_obj.filename.rsplit(".", 1)[-1].lower()
        filename = f"{file_id}.{ext}"
        filepath = os.path.join(upload_folder, filename)
        file_obj.save(filepath)
        file_size = os.path.getsize(filepath)
        now = datetime.now(timezone.utc).isoformat()

        file_record = {
            "file_id": file_id,
            "session_id": session_id,
            "file_name": file_obj.filename,
            "file_size": file_size,
            "file_type": ext,
            "file_path": filepath,
            "parse_status": "pending",
            "parse_progress": 0,
            "parse_result": None,
            "created_at": now,
            "updated_at": now,
        }
        self._files[file_id] = file_record

        # 首次上传自动命名（对齐 Spec 10 §7）
        session = self._sessions.get(session_id)
        if session and session["query_count"] == 0:
            name = file_obj.filename.rsplit(".", 1)[0][:20]
            session["title"] = name + ("..." if len(file_obj.filename.rsplit(".", 1)[0]) > 20 else "")
            session["updated_at"] = now

        return {
            "file_id": file_id,
            "file_name": file_obj.filename,
            "file_size": file_size,
            "file_type": ext,
            "parse_status": "pending",
            "created_at": now,
        }

    def get_file_status(self, file_id):
        f = self._files.get(file_id)
        if not f:
            return None
        return {
            "file_id": f["file_id"],
            "parse_status": f["parse_status"],
            "parse_progress": f["parse_progress"],
            "parse_result": f["parse_result"],
        }

    def update_file_status(self, file_id, status, progress=None, result=None):
        f = self._files.get(file_id)
        if not f:
            return None
        f["parse_status"] = status
        if progress is not None:
            f["parse_progress"] = progress
        if result is not None:
            f["parse_result"] = result
        f["updated_at"] = datetime.now(timezone.utc).isoformat()
        return f

    def get_file(self, file_id):
        return self._files.get(file_id)

    def list_files_by_session(self, session_id):
        """按 session_id 查询关联的文件列表（最新的在前）"""
        files = [
            {
                "file_id": f["file_id"],
                "file_name": f["file_name"],
                "file_size": f["file_size"],
                "file_type": f["file_type"],
                "parse_status": f["parse_status"],
                "parse_progress": f["parse_progress"],
                "created_at": f["created_at"],
            }
            for f in self._files.values()
            if f["session_id"] == session_id
        ]
        return sorted(files, key=lambda x: x["created_at"], reverse=True)


# 单例
storage = Storage()
