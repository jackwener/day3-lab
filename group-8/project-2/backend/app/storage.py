"""
Storage 模块 - 基于 JSON 文件的持久化存储层

提供 Session 和 QARecord 的 CRUD 操作
"""

import json
import os
import time
from datetime import datetime, timezone


class Storage:
    """
    基于 JSON 文件的存储类，管理会话(Session)、问答记录(QARecord)和研报(Report)

    Attributes:
        data_dir: 数据存储目录路径
        sessions_file: 会话数据文件路径
        records_file: 问答记录数据文件路径
        reports_file: 研报数据文件路径
        opinion_similarity_file: 观点相似度数据文件路径
    """

    def __init__(self, data_dir):
        """
        初始化存储，目录不存在时自动创建，JSON 文件不存在时自动初始化
        
        Args:
            data_dir: 数据存储目录路径
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self.sessions_file = os.path.join(data_dir, "sessions.json")
        self.records_file = os.path.join(data_dir, "qa_records.json")
        self.reports_file = os.path.join(data_dir, "reports.json")
        self.opinion_similarity_file = os.path.join(data_dir, "opinion_similarity.json")
        if not os.path.exists(self.sessions_file):
            self._write(self.sessions_file, [])
        if not os.path.exists(self.records_file):
            self._write(self.records_file, [])
        if not os.path.exists(self.reports_file):
            self._write(self.reports_file, [])
        if not os.path.exists(self.opinion_similarity_file):
            self._write(self.opinion_similarity_file, {"pairs": []})

    def _read(self, filepath):
        """
        从 JSON 文件读取数据
        
        Args:
            filepath: 文件路径
        Returns:
            解析后的 Python 对象
        """
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)

    def _write(self, filepath, data):
        """
        将数据写入 JSON 文件
        
        Args:
            filepath: 文件路径
            data: 要写入的 Python 对象
        """
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _now(self):
        """
        获取当前 UTC 时间戳字符串
        
        Returns:
            ISO 8601 格式的时间字符串
        """
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _resolve_report_file_path(self, file_path):
        """
        将研报记录中的 file_path 解析为本地绝对路径

        Args:
            file_path: 研报记录中的文件路径
        Returns:
            规范化后的本地文件路径，无法解析时返回 None
        """
        if not file_path:
            return None

        normalized_path = file_path.replace("\\", os.sep)
        normalized_path = normalized_path.replace("/", os.sep)

        if os.path.isabs(normalized_path):
            return normalized_path

        data_parent_dir = os.path.dirname(self.data_dir)
        base_data_name = os.path.basename(self.data_dir.rstrip(os.sep))
        relative_prefix = f".{os.sep}{base_data_name}{os.sep}"

        if normalized_path.startswith(relative_prefix):
            normalized_path = normalized_path[len(relative_prefix):]
            return os.path.normpath(os.path.join(self.data_dir, normalized_path))

        if normalized_path.startswith(f".{os.sep}"):
            normalized_path = normalized_path[2:]
            return os.path.normpath(os.path.join(data_parent_dir, normalized_path))

        return os.path.normpath(os.path.join(self.data_dir, normalized_path))

    def _build_opinion_pair_key(self, report_id_a, report_id_b):
        """
        基于两个研报 ID 生成稳定的 pair_key

        Args:
            report_id_a: 研报 A ID
            report_id_b: 研报 B ID
        Returns:
            排序后的 pair_key 字符串
        """
        ordered_ids = sorted([str(report_id_a), str(report_id_b)])
        return "__".join(ordered_ids)

    # --- Session CRUD ---

    def create_session(self, session_id, title="新会话"):
        """
        创建新会话
        
        Args:
            session_id: 会话唯一标识
            title: 会话标题，默认为"新会话"
        Returns:
            创建的会话 dict
        """
        sessions = self._read(self.sessions_file)
        now = self._now()
        session = {
            "session_id": session_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "query_count": 0,
        }
        sessions.append(session)
        self._write(self.sessions_file, sessions)
        return session

    def get_sessions(self):
        """
        返回全部会话列表
        
        Returns:
            会话 dict 列表
        """
        return self._read(self.sessions_file)

    def delete_session(self, session_id):
        """
        删除会话 + 级联删除其所有 QARecord
        
        Args:
            session_id: 要删除的会话 ID
        """
        sessions = self._read(self.sessions_file)
        sessions = [s for s in sessions if s["session_id"] != session_id]
        self._write(self.sessions_file, sessions)
        # 级联删除记录
        self.delete_records_by_session(session_id)

    def update_session(self, session_id, updates):
        """
        合并更新字段，自动刷新 updated_at
        
        Args:
            session_id: 要更新的会话 ID
            updates: 要更新的字段 dict
        Returns:
            更新后的 session dict，如果不存在返回 None
        """
        sessions = self._read(self.sessions_file)
        for s in sessions:
            if s["session_id"] == session_id:
                s.update(updates)
                s["updated_at"] = self._now()
                self._write(self.sessions_file, sessions)
                return s
        return None

    def get_session(self, session_id):
        """
        根据 session_id 获取单个会话
        
        Args:
            session_id: 会话 ID
        Returns:
            会话 dict，如果不存在返回 None
        """
        sessions = self._read(self.sessions_file)
        for s in sessions:
            if s["session_id"] == session_id:
                return s
        return None

    # --- QARecord CRUD ---

    def add_record(self, session_id, query, answer, llm_used, model, response_time_ms, answer_source):
        """
        写入问答记录 + 更新 session 的 query_count 和 updated_at
        
        首次问答（query_count 从 0→1）时自动重命名 session title = query[:20] + "..."
        
        Args:
            session_id: 所属会话 ID
            query: 用户问题
            answer: AI 回答
            llm_used: 是否使用了 LLM
            model: 使用的模型名称
            response_time_ms: 响应时间（毫秒）
            answer_source: 回答来源
        Returns:
            新建的 record dict
        """
        records = self._read(self.records_file)
        record_id = f"rec_{int(time.time() * 1000)}"
        now = self._now()
        record = {
            "id": record_id,
            "session_id": session_id,
            "query": query,
            "answer": answer,
            "llm_used": llm_used,
            "model": model,
            "response_time_ms": response_time_ms,
            "answer_source": answer_source,
            "timestamp": now,
        }
        records.append(record)
        self._write(self.records_file, records)

        # 更新 session
        session = self.get_session(session_id)
        if session:
            new_count = session["query_count"] + 1
            updates = {"query_count": new_count}
            # 首次问答自动命名
            if session["query_count"] == 0:
                updates["title"] = query[:20] + "..."
            self.update_session(session_id, updates)

        return record

    def get_records_by_session(self, session_id):
        """
        按 session_id 过滤返回记录列表
        
        Args:
            session_id: 会话 ID
        Returns:
            该会话的所有 QARecord 列表
        """
        records = self._read(self.records_file)
        return [r for r in records if r["session_id"] == session_id]

    def delete_records_by_session(self, session_id):
        """
        删除指定会话全部记录
        
        Args:
            session_id: 会话 ID
        Returns:
            删除的记录条数
        """
        records = self._read(self.records_file)
        original_count = len(records)
        records = [r for r in records if r["session_id"] != session_id]
        self._write(self.records_file, records)
        return original_count - len(records)

    # --- Report CRUD ---

    def save_report(self, report):
        """
        保存研报记录

        Args:
            report: 研报 dict，需包含 report_id, file_name, file_type 等字段
        Returns:
            保存的 report dict
        """
        reports = self._read(self.reports_file)
        reports.append(report)
        self._write(self.reports_file, reports)
        return report

    def get_reports(self, session_id=None, search=None, institution=None, stock_code=None):
        """
        获取研报列表，支持多维筛选
    
        Args:
            session_id: 可选，按会话 ID 过滤
            search: 可选，文件名模糊搜索
            institution: 可选，按机构筛选
            stock_code: 可选，按股票代码筛选
        Returns:
            研报 dict 列表
        """
        reports = self._read(self.reports_file)
            
        # session_id 过滤（不传则返回全部）
        if session_id:
            reports = [r for r in reports if r.get('session_id') == session_id]
            
        # 文件名模糊搜索
        if search:
            reports = [r for r in reports if search.lower() in r.get('file_name', '').lower()]
            
        # 机构筛选
        if institution:
            reports = [r for r in reports if r.get('extracted_data', {}).get('institution') == institution]
            
        # 股票代码筛选
        if stock_code:
            reports = [r for r in reports if stock_code in r.get('extracted_data', {}).get('stock_codes', [])]
            
        return reports

    def get_report_by_id(self, report_id):
        """
        根据 report_id 获取单条研报

        Args:
            report_id: 研报 ID
        Returns:
            研报 dict，不存在返回 None
        """
        reports = self._read(self.reports_file)
        for r in reports:
            if r["report_id"] == report_id:
                return r
        return None

    def delete_report(self, report_id):
        """
        删除研报记录，并级联清理原始文件和相似度缓存

        Args:
            report_id: 要删除的研报 ID
        Returns:
            True 如果删除成功，False 如果不存在
        """
        reports = self._read(self.reports_file)
        target_report = None
        new_reports = []

        for report in reports:
            if report["report_id"] == report_id:
                target_report = report
                continue
            new_reports.append(report)

        if not target_report:
            return False

        self._write(self.reports_file, new_reports)

        file_path = self._resolve_report_file_path(target_report.get("file_path"))
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        self.delete_opinion_similarity(report_id)
        return True

    def save_opinion_similarity(self, report_id_a, report_id_b, similarity_data):
        """
        保存两份研报之间的观点相似度数据

        Args:
            report_id_a: 研报 A ID
            report_id_b: 研报 B ID
            similarity_data: 相似度分析结果
        Returns:
            保存后的 pair 数据
        """
        pair_key = self._build_opinion_pair_key(report_id_a, report_id_b)
        ordered_ids = pair_key.split("__")
        payload = self._read(self.opinion_similarity_file)
        pairs = payload.get("pairs", [])

        pair_data = {
            "pair_key": pair_key,
            "report_ids": ordered_ids,
            "similarity_data": similarity_data,
            "updated_at": self._now(),
        }

        updated = False
        for index, pair in enumerate(pairs):
            if pair.get("pair_key") == pair_key:
                pairs[index] = pair_data
                updated = True
                break

        if not updated:
            pairs.append(pair_data)

        payload["pairs"] = pairs
        self._write(self.opinion_similarity_file, payload)
        return pair_data

    def get_opinion_similarity(self, report_ids):
        """
        获取指定研报之间的共同/差异观点

        Args:
            report_ids: 研报 ID 列表
        Returns:
            格式化后的相似度结果
        """
        requested_ids = []
        for report_id in report_ids or []:
            report_id_str = str(report_id)
            if report_id_str not in requested_ids:
                requested_ids.append(report_id_str)

        payload = self._read(self.opinion_similarity_file)
        pairs = payload.get("pairs", [])
        related_pairs = []

        requested_id_set = set(requested_ids)
        for pair in pairs:
            pair_report_ids = pair.get("report_ids", [])
            if pair_report_ids and set(pair_report_ids).issubset(requested_id_set):
                related_pairs.append(pair)

        return {
            "report_ids": requested_ids,
            "pairs": related_pairs,
        }

    def delete_opinion_similarity(self, report_id):
        """
        删除与指定研报相关的所有相似度数据

        Args:
            report_id: 要清理的研报 ID
        Returns:
            删除的 pair 数量
        """
        report_id = str(report_id)
        payload = self._read(self.opinion_similarity_file)
        pairs = payload.get("pairs", [])
        original_count = len(pairs)
        payload["pairs"] = [
            pair for pair in pairs
            if report_id not in pair.get("report_ids", [])
        ]
        self._write(self.opinion_similarity_file, payload)
        return original_count - len(payload["pairs"])
