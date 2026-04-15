"""
storage.py — JSON 文件存储层
对齐规格: 10-数据模型与存储规格.md §3/4/5
"""
import json
import os
import uuid
from datetime import datetime, timezone


def _now_iso() -> str:
    """返回当前 UTC 时间 ISO-8601 格式，带 Z 后缀。"""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _rec_id() -> str:
    """生成问答记录 ID：rec_{timestamp}_{random6}"""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    rand = uuid.uuid4().hex[:6]
    return f"rec_{ts}_{rand}"


class Storage:
    """
    JSON 文件存储，管理 Session / QARecord / Report 三张"表"。
    文件布局：
        {data_dir}/sessions.json
        {data_dir}/qa_records.json
        {data_dir}/reports.json
        {data_dir}/exports/          (导出临时文件)
    """

    def __init__(self, data_dir: str = "./data"):
        self.data_dir = data_dir
        self._sessions_path = os.path.join(data_dir, "sessions.json")
        self._records_path = os.path.join(data_dir, "qa_records.json")
        self._reports_path = os.path.join(data_dir, "reports.json")
        self._exports_dir = os.path.join(data_dir, "exports")
        self._init_storage()

    # ------------------------------------------------------------------ #
    # 初始化
    # ------------------------------------------------------------------ #
    def _init_storage(self):
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self._exports_dir, exist_ok=True)
        for path in (self._sessions_path, self._records_path, self._reports_path):
            if not os.path.exists(path):
                self._write_json(path, [])

    # ------------------------------------------------------------------ #
    # 内部 JSON 读写
    # ------------------------------------------------------------------ #
    def _read_json(self, path: str) -> list:
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: str, data: list):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    # ------------------------------------------------------------------ #
    # 5.1 会话管理
    # ------------------------------------------------------------------ #
    def create_session(self, session_id: str, title: str = "新会话") -> dict:
        """TC-M01-041"""
        now = _now_iso()
        session = {
            "session_id": session_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "query_count": 0,
        }
        sessions = self._read_json(self._sessions_path)
        sessions.append(session)
        self._write_json(self._sessions_path, sessions)
        return session

    def get_sessions(self) -> list:
        """TC-M01-042 — 按 updated_at 倒序"""
        sessions = self._read_json(self._sessions_path)
        return sorted(sessions, key=lambda s: s.get("updated_at", ""), reverse=True)

    def get_session(self, session_id: str) -> dict | None:
        """获取单个会话；不存在返回 None。"""
        for s in self._read_json(self._sessions_path):
            if s["session_id"] == session_id:
                return s
        return None

    def delete_session(self, session_id: str) -> None:
        """TC-M01-043 — 删除会话，并级联删除关联问答记录。"""
        sessions = [s for s in self._read_json(self._sessions_path) if s["session_id"] != session_id]
        self._write_json(self._sessions_path, sessions)
        self.delete_records_by_session(session_id)

    def update_session(self, session_id: str, updates: dict) -> dict | None:
        """TC-M01-046 — 更新会话字段（title / query_count / updated_at）。"""
        sessions = self._read_json(self._sessions_path)
        target = None
        for s in sessions:
            if s["session_id"] == session_id:
                s.update(updates)
                s["updated_at"] = _now_iso()
                target = s
                break
        if target:
            self._write_json(self._sessions_path, sessions)
        return target

    # ------------------------------------------------------------------ #
    # 5.2 问答记录管理
    # ------------------------------------------------------------------ #
    def add_record(
        self,
        session_id: str,
        query: str,
        answer: str,
        llm_used: bool = False,
        model: str | None = None,
        response_time_ms: int = 0,
        answer_source: str = "demo",
        sources: list | None = None,
    ) -> dict:
        """TC-M01-044 — 写入记录 + 更新 query_count + 触发自动命名。"""
        record = {
            "id": _rec_id(),
            "session_id": session_id,
            "query": query,
            "answer": answer,
            "llm_used": llm_used,
            "model": model,
            "response_time_ms": response_time_ms,
            "answer_source": answer_source,
            "sources": sources or [],
            "timestamp": _now_iso(),
        }
        records = self._read_json(self._records_path)
        records.append(record)
        self._write_json(self._records_path, records)

        # 更新 query_count
        session = self.get_session(session_id)
        if session:
            new_count = session.get("query_count", 0) + 1
            updates: dict = {"query_count": new_count}
            # 6-首次问答自动命名（10-数据模型 §6）
            if new_count == 1:
                auto_title = query[:20] + ("..." if len(query) > 20 else "")
                updates["title"] = auto_title
            self.update_session(session_id, updates)

        return record

    def get_records_by_session(self, session_id: str) -> list:
        """TC-M01-045 — 按 session_id 过滤，按 timestamp 正序。"""
        records = [r for r in self._read_json(self._records_path) if r["session_id"] == session_id]
        return sorted(records, key=lambda r: r.get("timestamp", ""))

    def delete_records_by_session(self, session_id: str) -> int:
        """TC-M01-047 — 删除指定会话的全部记录，返回删除数量。"""
        all_records = self._read_json(self._records_path)
        remaining = [r for r in all_records if r["session_id"] != session_id]
        deleted_count = len(all_records) - len(remaining)
        self._write_json(self._records_path, remaining)
        return deleted_count

    # ------------------------------------------------------------------ #
    # 研报管理
    # ------------------------------------------------------------------ #
    def get_all_records(self) -> list:
        """返回全部问答记录（用于 health metrics 统计）。"""
        return self._read_json(self._records_path)

    def create_report(self, report: dict) -> dict:
        reports = self._read_json(self._reports_path)
        reports.append(report)
        self._write_json(self._reports_path, reports)
        return report

    def get_reports(self) -> list:
        return self._read_json(self._reports_path)

    def get_report(self, report_id: str) -> dict | None:
        for r in self._read_json(self._reports_path):
            if r.get("report_id") == report_id:
                return r
        return None

    def delete_report(self, report_id: str) -> bool:
        reports = self._read_json(self._reports_path)
        new_reports = [r for r in reports if r.get("report_id") != report_id]
        if len(new_reports) == len(reports):
            return False
        self._write_json(self._reports_path, new_reports)
        return True

    def update_report(self, report_id: str, updates: dict) -> dict | None:
        reports = self._read_json(self._reports_path)
        target = None
        for r in reports:
            if r.get("report_id") == report_id:
                r.update(updates)
                target = r
                break
        if target:
            self._write_json(self._reports_path, reports)
        return target

    # ------------------------------------------------------------------ #
    # 指标统计（health metrics）
    # ------------------------------------------------------------------ #
    def get_metrics(self) -> dict:
        """
        计算健康检查运行指标（对齐 task-backend-capabilities.md §3）:
        - active_sessions: 会话总数
        - total_queries: 问答记录总数
        - avg_response_time_ms: 最近100条记录平均响应时间
        - total_reports: 研报总数
        """
        sessions = self._read_json(self._sessions_path)
        records = self._read_json(self._records_path)
        reports = self._read_json(self._reports_path)

        recent_100 = sorted(records, key=lambda r: r.get("timestamp", ""), reverse=True)[:100]
        if recent_100:
            avg_ms = int(sum(r.get("response_time_ms", 0) for r in recent_100) / len(recent_100))
        else:
            avg_ms = 0

        return {
            "active_sessions": len(sessions),
            "total_queries": len(records),
            "avg_response_time_ms": avg_ms,
            "total_reports": len(reports),
        }
