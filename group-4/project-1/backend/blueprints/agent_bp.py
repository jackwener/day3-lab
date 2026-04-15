"""
API 路由 — 原有 6 个端点 + 智能体增强端点
对齐: 09 API 接口规格 + v2.0 智能体增强版需求
"""
import uuid
import json
import logging
from flask import jsonify, request
from flask.views import MethodView
from flask_smorest import Blueprint as SmorestBlueprint
from marshmallow import Schema, fields, validate

from storage import get_storage
from agent import ask as agent_ask, get_capabilities as agent_caps

logger = logging.getLogger(__name__)


# ==================== Marshmallow Schemas ====================

class AskRequestSchema(Schema):
    query = fields.String(
        required=True,
        validate=validate.Length(min=1, max=500),
        metadata={"description": "用户提问原文"}
    )
    session_id = fields.String(required=True, metadata={"description": "目标会话 ID"})
    system_prompt = fields.String(
        load_default=None,
        allow_none=True,
        metadata={"description": "系统提示词（自定义智能体/专业角色）"}
    )
    context = fields.String(
        load_default=None,
        allow_none=True,
        metadata={"description": "上下文文本（研报内容等），前 3000 字符生效"}
    )


class CitedPassageSchema(Schema):
    text = fields.String()
    page = fields.Integer(allow_none=True)
    source_file = fields.String()


class AskResponseSchema(Schema):
    answer = fields.String()
    llm_used = fields.Boolean()
    model = fields.String(allow_none=True)
    response_time_ms = fields.Integer()
    answer_source = fields.String()
    cited_passages = fields.List(fields.Nested(CitedPassageSchema), allow_none=True)


class SessionSchema(Schema):
    session_id = fields.String()
    title = fields.String()
    created_at = fields.String()
    query_count = fields.Integer()
    status = fields.String()


class CreateSessionRequestSchema(Schema):
    title = fields.String(load_default="新会话", validate=validate.Length(max=100))


class QARecordSchema(Schema):
    id = fields.String()
    session_id = fields.String()
    query = fields.String()
    answer = fields.String()
    llm_used = fields.Boolean()
    model = fields.String(allow_none=True)
    response_time_ms = fields.Integer()
    answer_source = fields.String()
    cited_passages = fields.List(fields.Nested(CitedPassageSchema), allow_none=True)
    created_at = fields.String()


class CapabilitiesResponseSchema(Schema):
    status = fields.String()
    copaw_configured = fields.Boolean()
    bailian_configured = fields.Boolean()
    model = fields.String(allow_none=True)


class SessionListResponseSchema(Schema):
    sessions = fields.List(fields.Nested(SessionSchema))


class SessionDeleteResponseSchema(Schema):
    session_id = fields.String()
    status = fields.String()
    deleted_at = fields.String()


class RecordListResponseSchema(Schema):
    records = fields.List(fields.Nested(QARecordSchema))


# ==================== Helpers ====================

def _trace_id() -> str:
    return f"tr_{uuid.uuid4().hex[:16]}"


def _err(code: str, message: str, http_status: int, details: dict = None):
    return jsonify({
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
            "traceId": _trace_id()
        }
    }), http_status


# ==================== Blueprint ====================

api = SmorestBlueprint(
    'agent', __name__,
    url_prefix='/api/v1/agent',
    description='投研问答助手 API v2.0'
)


# ==================== 1. 能力探测 ====================

@api.route('/capabilities')
class Capabilities(MethodView):
    @api.response(200, CapabilitiesResponseSchema)
    @api.doc(tags=['能力探测'])
    def get(self):
        caps = agent_caps()
        return {
            "status": "ok",
            "copaw_configured": caps.get("copaw_configured", False),
            "bailian_configured": caps.get("bailian_configured", False),
            "model": caps.get("model")
        }


# ==================== 2. 问答提交 ====================

@api.route('/ask')
class Ask(MethodView):
    @api.arguments(AskRequestSchema, location='json')
    @api.response(200, AskResponseSchema)
    @api.doc(tags=['问答系统'])
    def post(self, args):
        query = args["query"]
        session_id = args["session_id"]
        system_prompt = args.get("system_prompt")
        context = args.get("context")

        storage = get_storage()
        if not storage.get_session(session_id):
            return _err("SESSION_NOT_FOUND", "会话不存在或已被删除", 404, {"session_id": session_id})

        result = agent_ask(query, session_id, system_prompt=system_prompt, context=context)

        storage.add_record(
            session_id=session_id,
            query=query,
            answer=result["answer"],
            llm_used=result["llm_used"],
            model=result["model"],
            response_time_ms=result["response_time_ms"],
            answer_source=result["answer_source"],
            cited_passages=result["cited_passages"]
        )

        return {
            "answer": result["answer"],
            "llm_used": result["llm_used"],
            "model": result["model"],
            "response_time_ms": result["response_time_ms"],
            "answer_source": result["answer_source"],
            "cited_passages": result["cited_passages"]
        }


# ==================== 3 & 4. 会话管理 ====================

@api.route('/sessions')
class Sessions(MethodView):
    @api.response(200, SessionListResponseSchema)
    @api.doc(tags=['会话管理'])
    def get(self):
        return {"sessions": get_storage().get_sessions()}

    @api.arguments(CreateSessionRequestSchema, location='json')
    @api.response(201, SessionSchema)
    @api.doc(tags=['会话管理'])
    def post(self, args):
        return get_storage().create_session(title=args.get("title", "新会话"))


# ==================== 5. 删除会话 ====================

@api.route('/sessions/<session_id>')
class SessionById(MethodView):
    @api.response(200, SessionDeleteResponseSchema)
    @api.doc(tags=['会话管理'])
    def delete(self, session_id):
        storage = get_storage()
        if not storage.get_session(session_id):
            return _err("SESSION_NOT_FOUND", "会话不存在或已被删除", 404)
        storage.delete_session(session_id)
        return {"session_id": session_id, "status": "deleted", "deleted_at": storage._get_utc_now()}


# ==================== 6. 问答记录 ====================

@api.route('/sessions/<session_id>/records')
class SessionRecords(MethodView):
    @api.response(200, RecordListResponseSchema)
    @api.doc(tags=['历史记录'])
    def get(self, session_id):
        storage = get_storage()
        if not storage.get_session(session_id):
            return _err("SESSION_NOT_FOUND", "会话不存在或已被删除", 404)
        return {"records": storage.get_records_by_session(session_id)}


# ==================== 7. 研报解析（文件上传）====================

@api.route('/parse-report')
class ParseReport(MethodView):
    @api.doc(tags=['智能体'], description='上传单份研报文件（PDF/Word/HTML），返回结构化解析结果')
    def post(self):
        if 'file' not in request.files:
            return _err("NO_FILE", "请上传研报文件", 400)

        f = request.files['file']
        if not f.filename:
            return _err("EMPTY_FILENAME", "文件名为空", 400)

        # 大小检查 (50 MB)
        file_bytes = f.read()
        if len(file_bytes) > 50 * 1024 * 1024:
            return _err("FILE_TOO_LARGE", "文件超过 50MB 限制", 400)

        # 格式检查
        allowed_exts = {'.pdf', '.doc', '.docx', '.html', '.htm'}
        ext = '.' + f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else ''
        if ext not in allowed_exts:
            return _err("UNSUPPORTED_FORMAT", f"不支持的格式 {ext}，支持 PDF/Word/HTML", 400)

        try:
            from report_parser import extract_text, parse_single
            session_id = request.form.get('session_id', 'parse_session')
            text = extract_text(file_bytes, f.filename, f.content_type or '')
            parsed = parse_single(text, filename=f.filename, session_id=session_id)

            # 持久化解析记录
            storage = get_storage()
            if storage.get_session(session_id):
                storage.add_record(
                    session_id=session_id,
                    query=f"解析研报: {f.filename}",
                    answer="研报解析完成",
                    llm_used=True, model=None, response_time_ms=0,
                    answer_source="parser",
                    record_type="parse-result",
                    extra_data={"filename": f.filename, "parsed": parsed, "text_preview": text[:500]}
                )

            return jsonify({
                "filename": f.filename,
                "text_preview": text[:500],
                "parsed": parsed
            })
        except Exception as e:
            logger.error(f"parse-report error: {e}")
            return _err("PARSE_ERROR", f"解析失败: {str(e)}", 500)


# ==================== 8. 研报对比（多文件上传）====================

@api.route('/compare-reports')
class CompareReports(MethodView):
    @api.doc(tags=['智能体'], description='上传 2~5 份研报文件，返回多维度对比分析')
    def post(self):
        files = request.files.getlist('files')
        if len(files) < 2:
            return _err("TOO_FEW_FILES", "至少上传 2 份研报", 400)
        if len(files) > 5:
            return _err("TOO_MANY_FILES", "最多上传 5 份研报", 400)

        try:
            from report_parser import extract_text, compare_reports
            session_id = request.form.get('session_id', 'compare_session')
            reports = []
            filenames = []
            for f in files:
                file_bytes = f.read()
                if len(file_bytes) > 50 * 1024 * 1024:
                    return _err("FILE_TOO_LARGE", f"{f.filename} 超过 50MB", 400)
                text = extract_text(file_bytes, f.filename, f.content_type or '')
                reports.append({"filename": f.filename, "text": text})
                filenames.append(f.filename)

            result = compare_reports(reports, session_id=session_id)

            # 持久化对比记录
            storage = get_storage()
            if storage.get_session(session_id):
                storage.add_record(
                    session_id=session_id,
                    query=f"对比研报: {', '.join(filenames)}",
                    answer="研报对比完成",
                    llm_used=True, model=None, response_time_ms=0,
                    answer_source="comparator",
                    record_type="compare-result",
                    extra_data={"comparison": result, "file_count": len(files)}
                )

            return jsonify({"comparison": result, "file_count": len(files)})
        except Exception as e:
            logger.error(f"compare-reports error: {e}")
            return _err("COMPARE_ERROR", f"对比失败: {str(e)}", 500)


# ==================== 9. 实时行情 ====================

@api.route('/market-data')
class MarketData(MethodView):
    @api.doc(tags=['智能体'], description='通过自然语言查询实时股票/指数行情')
    def get(self):
        query = request.args.get('query', '').strip()
        session_id = request.args.get('session_id', '').strip()
        if not query:
            return _err("MISSING_QUERY", "请提供查询内容", 400)
        try:
            from market_data import fetch_market_data
            result = fetch_market_data(query)

            # 持久化行情记录
            if session_id:
                storage = get_storage()
                if storage.get_session(session_id):
                    storage.add_record(
                        session_id=session_id,
                        query=query,
                        answer="行情查询完成",
                        llm_used=False, model=None, response_time_ms=0,
                        answer_source="market",
                        record_type="market-data",
                        extra_data={"stocks": result.get("stocks", []), "demo": result.get("demo", False)}
                    )

            return jsonify(result)
        except Exception as e:
            logger.error(f"market-data error: {e}")
            return _err("FETCH_ERROR", f"行情获取失败: {str(e)}", 500)


# ==================== 10. 自定义智能体 CRUD ====================

@api.route('/custom-agents')
class CustomAgents(MethodView):
    @api.doc(tags=['自定义智能体'])
    def get(self):
        storage = get_storage()
        return jsonify({"agents": storage.get_custom_agents()})

    @api.doc(tags=['自定义智能体'])
    def post(self):
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return _err("MISSING_NAME", "智能体名称不能为空", 400)
        if len(name) > 20:
            return _err("NAME_TOO_LONG", "名称不超过 20 字符", 400)

        system_prompt = (data.get('system_prompt') or '').strip()
        if not system_prompt:
            return _err("MISSING_PROMPT", "系统提示词不能为空", 400)
        if len(system_prompt) > 5000:
            return _err("PROMPT_TOO_LONG", "提示词不超过 5000 字符", 400)

        description = (data.get('description') or '')[:200]
        icon = (data.get('icon') or '🤖')[:10]

        storage = get_storage()
        agents = storage.get_custom_agents()
        if len(agents) >= 20:
            return _err("AGENT_LIMIT", "自定义智能体数量已达上限（20个）", 400)

        agent = storage.create_custom_agent(
            name=name, description=description,
            icon=icon, system_prompt=system_prompt
        )
        return jsonify(agent), 201


@api.route('/custom-agents/<agent_id>')
class CustomAgentById(MethodView):
    @api.doc(tags=['自定义智能体'])
    def put(self, agent_id):
        data = request.get_json(silent=True) or {}
        storage = get_storage()
        agent = storage.get_custom_agent(agent_id)
        if not agent:
            return _err("AGENT_NOT_FOUND", "智能体不存在", 404)

        update = {}
        if 'name' in data:
            n = data['name'].strip()
            if not n:
                return _err("MISSING_NAME", "名称不能为空", 400)
            if len(n) > 20:
                return _err("NAME_TOO_LONG", "名称不超过 20 字符", 400)
            update['name'] = n
        if 'description' in data:
            update['description'] = data['description'][:200]
        if 'icon' in data:
            update['icon'] = (data['icon'] or '🤖')[:10]
        if 'system_prompt' in data:
            sp = data['system_prompt'].strip()
            if not sp:
                return _err("MISSING_PROMPT", "提示词不能为空", 400)
            if len(sp) > 5000:
                return _err("PROMPT_TOO_LONG", "提示词不超过 5000 字符", 400)
            update['system_prompt'] = sp

        updated = storage.update_custom_agent(agent_id, **update)
        return jsonify(updated)

    @api.doc(tags=['自定义智能体'])
    def delete(self, agent_id):
        storage = get_storage()
        if not storage.get_custom_agent(agent_id):
            return _err("AGENT_NOT_FOUND", "智能体不存在", 404)
        storage.delete_custom_agent(agent_id)
        return jsonify({"agent_id": agent_id, "status": "deleted"})
