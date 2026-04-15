"""
Skill Client — 对齐 Spec 08 §2 Skill Client 层
调用 Rabyte Skill API、处理异步结果
支持异步线程调度，状态流转：queued → analyzing → completed/failed
"""

import uuid
import threading
import time
import os


class SkillClient:
    """Rabyte Skill 深度分析客户端"""

    def __init__(self):
        self._tasks = {}  # analyze_id -> task dict

    def trigger_analysis(self, session_id, file_id):
        """对齐 Spec 09 §12 — 触发深度分析，返回 202（异步执行）"""
        analyze_id = f"ana_{uuid.uuid4().hex[:12]}"
        task = {
            "analyze_id": analyze_id,
            "session_id": session_id,
            "file_id": file_id,
            "status": "queued",
            "progress": 0,
            "result": None,
            "error": None,
        }
        self._tasks[analyze_id] = task

        # 异步线程执行分析
        thread = threading.Thread(
            target=self._run_analysis,
            args=(analyze_id, session_id, file_id),
            daemon=True,
        )
        thread.start()

        return {
            "analyze_id": analyze_id,
            "status": task["status"],
        }

    def _run_analysis(self, analyze_id, session_id, file_id):
        """异步执行深度分析"""
        task = self._tasks.get(analyze_id)
        if not task:
            return

        try:
            task["status"] = "analyzing"
            task["progress"] = 10

            # 获取文件解析内容
            from storage import storage
            file_info = storage.get_file(file_id)
            file_content = ""
            if file_info and file_info.get("parse_result"):
                parse_result = file_info["parse_result"]
                if isinstance(parse_result, dict):
                    file_content = parse_result.get("content", "")
                else:
                    file_content = str(parse_result)

            task["progress"] = 20

            # 尝试调用 LLM 生成深度分析报告
            report = self._generate_report_via_llm(file_content)
            if report:
                task["result"] = report
                task["status"] = "completed"
                task["progress"] = 100
            else:
                # LLM 不可用时，使用模板报告
                task["result"] = self._generate_template_report(file_content)
                task["status"] = "completed"
                task["progress"] = 100

        except Exception as e:
            task["status"] = "failed"
            task["error"] = str(e)
            task["progress"] = 0

    def _generate_report_via_llm(self, file_content):
        """尝试通过 LLM 生成深度分析报告"""
        try:
            from report_agent import report_agent
            prompt = (
                "请基于以下研报内容，生成一份深度分析报告，包含以下八个维度：\n"
                "1. 战略定位\n2. 业务结构\n3. 财务分析\n"
                "4. 评级比对\n5. 风险提示\n6. 估值分析\n"
                "7. 行业对比\n8. 投资建议\n\n"
                f"研报内容：\n{file_content[:3000]}"
            )
            result = report_agent.ask(prompt, "system", file_content[:3000])
            if result and result.get("llm_used"):
                return result["answer"]
        except Exception:
            pass
        return None

    def _generate_template_report(self, file_content):
        """当 LLM 不可用时，生成模板式报告"""
        preview = file_content[:200] if file_content else "未提供研报内容"
        return (
            "# 深度分析报告\n\n"
            f"> 基于研报内容自动生成（当前为演示模式）\n\n"
            "## 1. 战略定位\n"
            f"研报摘要：{preview}...\n\n"
            "## 2. 业务结构\n"
            "请配置 CoPaw 或百炼 API Key 以获取详细业务结构分析\n\n"
            "## 3. 财务分析\n"
            "演示模式下无法提供真实财务数据分析\n\n"
            "## 4. 评级比对\n"
            "待 LLM 服务接入后可对比多家评级\n\n"
            "## 5. 风险提示\n"
            "请关注研报中提及的风险因素\n\n"
            "## 6. 估值分析\n"
            "演示模式下无法计算真实估值\n\n"
            "## 7. 行业对比\n"
            "待接入真实数据源\n\n"
            "## 8. 投资建议\n"
            "以上分析仅供参考，不构成投资建议\n"
        )

    def get_analysis_status(self, analyze_id):
        """对齐 Spec 09 §13"""
        task = self._tasks.get(analyze_id)
        if not task:
            return None
        return {
            "analyze_id": task["analyze_id"],
            "status": task["status"],
            "progress": task["progress"],
            "result": task["result"],
            "error": task["error"],
        }

    def get_analysis_by_session(self, session_id):
        """按 session_id 查找最新的分析任务"""
        tasks_for_session = [
            t for t in self._tasks.values()
            if t["session_id"] == session_id
        ]
        if not tasks_for_session:
            return None
        # 返回最新的一个
        latest = tasks_for_session[-1]
        return {
            "analyze_id": latest["analyze_id"],
            "status": latest["status"],
            "progress": latest["progress"],
            "result": latest["result"],
            "error": latest["error"],
        }


# 单例
skill_client = SkillClient()
