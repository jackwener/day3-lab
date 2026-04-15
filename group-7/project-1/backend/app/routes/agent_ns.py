"""
Flask-RESTX 命名空间定义 - 用于 Swagger API 文档
"""
from flask_restx import Namespace, Resource, fields

# 创建命名空间
agent_ns = Namespace('agent', description='投研问答助手 API')

# ==================== 数据模型定义 ====================

# 会话模型
session_model = agent_ns.model('Session', {
    'session_id': fields.String(description='会话ID', example='550e8400-e29b-41d4-a716-446655440000'),
    'title': fields.String(description='会话标题', example='新会话'),
    'created_at': fields.String(description='创建时间', example='2024-01-15T08:30:00'),
    'updated_at': fields.String(description='更新时间', example='2024-01-15T09:00:00'),
    'query_count': fields.Integer(description='问答次数', example=5)
})

# 会话列表响应模型
sessions_response_model = agent_ns.model('SessionsResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'total': fields.Integer(description='总会话数'),
    'page': fields.Integer(description='当前页码'),
    'page_size': fields.Integer(description='每页数量'),
    'sessions': fields.List(fields.Nested(session_model), description='会话列表')
})

# 创建会话请求模型
create_session_model = agent_ns.model('CreateSessionRequest', {
    'title': fields.String(description='会话标题（可选，默认"新会话"）', example='投资分析', max_length=100)
})

# 创建会话响应模型
created_session_model = agent_ns.model('CreatedSessionResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'session_id': fields.String(description='会话ID'),
    'title': fields.String(description='会话标题'),
    'created_at': fields.String(description='创建时间'),
    'query_count': fields.Integer(description='问答次数')
})

# 删除会话响应模型
delete_session_model = agent_ns.model('DeleteSessionResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'deleted': fields.Boolean(description='是否删除成功'),
    'session_id': fields.String(description='被删除的会话ID')
})

# 更新会话请求模型
update_session_model = agent_ns.model('UpdateSessionRequest', {
    'title': fields.String(description='新的会话标题（必填，最大100字符）', example='宁德时代财报分析', required=True, max_length=100)
})

# 更新会话响应模型
update_session_response_model = agent_ns.model('UpdateSessionResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'session_id': fields.String(description='会话ID'),
    'title': fields.String(description='更新后的标题'),
    'updated_at': fields.String(description='更新时间')
})

# 问答记录模型
record_model = agent_ns.model('Record', {
    'id': fields.String(description='记录ID'),
    'session_id': fields.String(description='会话ID'),
    'query': fields.String(description='用户问题'),
    'answer': fields.String(description='AI回答'),
    'llm_used': fields.Boolean(description='是否使用真实LLM'),
    'model': fields.String(description='使用的模型'),
    'response_time_ms': fields.Integer(description='响应时间（毫秒）'),
    'answer_source': fields.String(description='回答来源'),
    'timestamp': fields.String(description='时间戳')
})

# 记录列表响应模型
records_response_model = agent_ns.model('RecordsResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'session_id': fields.String(description='会话ID'),
    'total': fields.Integer(description='总记录数'),
    'records': fields.List(fields.Nested(record_model), description='问答记录列表')
})

# 问答请求模型
ask_request_model = agent_ns.model('AskRequest', {
    'query': fields.String(description='用户问题（必填，1-500字符）', example='分析一下新能源行业', required=True, min_length=1, max_length=500),
    'session_id': fields.String(description='会话ID（必填，UUID格式）', example='550e8400-e29b-41d4-a716-446655440000', required=True)
})

# 问答响应模型
ask_response_model = agent_ns.model('AskResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'answer': fields.String(description='AI回答'),
    'llm_used': fields.Boolean(description='是否使用真实LLM'),
    'model': fields.String(description='使用的模型'),
    'response_time_ms': fields.Integer(description='响应时间（毫秒）'),
    'answer_source': fields.String(description='回答来源')
})

# 能力状态模型
capability_model = agent_ns.model('Capability', {
    'name': fields.String(description='能力名称'),
    'available': fields.Boolean(description='是否可用'),
    'description': fields.String(description='能力描述')
})

capabilities_response_model = agent_ns.model('CapabilitiesResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'copaw_configured': fields.Boolean(description='CoPaw是否已配置'),
    'bailian_configured': fields.Boolean(description='百炼是否已配置'),
    'demo_available': fields.Boolean(description='Demo是否可用'),
    'version': fields.String(description='API版本')
})

# 健康检查响应模型
health_response_model = agent_ns.model('HealthResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'status': fields.String(description='健康状态'),
    'timestamp': fields.String(description='检查时间'),
    'services': fields.Raw(description='服务状态'),
    'metrics': fields.Raw(description='运行指标')
})

# 导出请求模型
export_request_model = agent_ns.model('ExportRequest', {
    'session_id': fields.String(description='会话ID', required=True),
    'format': fields.String(description='导出格式', enum=['json', 'txt'], required=True)
})

# 导出响应模型
export_response_model = agent_ns.model('ExportResponse', {
    'traceId': fields.String(description='链路追踪ID'),
    'export_id': fields.String(description='导出任务ID'),
    'status': fields.String(description='导出状态'),
    'download_url': fields.String(description='下载链接'),
    'expires_at': fields.String(description='过期时间')
})

# 错误响应模型
error_detail_model = agent_ns.model('ErrorDetail', {
    'code': fields.String(description='错误代码'),
    'message': fields.String(description='错误消息'),
    'details': fields.Raw(description='详细错误信息'),
    'traceId': fields.String(description='链路追踪ID')
})

error_response_model = agent_ns.model('ErrorResponse', {
    'error': fields.Nested(error_detail_model, description='错误信息')
})


# ==================== API 路由定义 ====================

@agent_ns.route('/sessions')
class SessionList(Resource):
    """会话列表管理"""
    
    @agent_ns.doc('get_sessions')
    @agent_ns.response(200, '成功', sessions_response_model)
    def get(self):
        """
        获取会话列表
        
        返回所有会话的列表，包含会话ID、标题、创建时间等信息
        """
        pass
    
    @agent_ns.doc('create_session')
    @agent_ns.expect(create_session_model)
    @agent_ns.response(201, '创建成功', created_session_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    def post(self):
        """
        创建新会话
        
        创建一个新的问答会话，可以指定会话标题（可选，默认为"新会话"）
        """
        pass


@agent_ns.route('/sessions/<string:session_id>')
@agent_ns.param('session_id', '会话ID（UUID格式）', example='550e8400-e29b-41d4-a716-446655440000')
class Session(Resource):
    """单个会话管理"""
    
    @agent_ns.doc('update_session')
    @agent_ns.expect(update_session_model)
    @agent_ns.response(200, '更新成功', update_session_response_model)
    @agent_ns.response(400, '标题无效或会话ID格式错误', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def put(self, session_id):
        """
        更新会话标题
        
        更新指定会话的标题，用于首次问答后自动命名
        """
        pass
    
    @agent_ns.doc('delete_session')
    @agent_ns.response(200, '删除成功', delete_session_model)
    @agent_ns.response(400, '会话ID格式无效', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def delete(self, session_id):
        """
        删除会话
        
        删除指定会话及其所有问答记录（级联删除）
        """
        pass


@agent_ns.route('/sessions/<string:session_id>/records')
@agent_ns.param('session_id', '会话ID（UUID格式）', example='550e8400-e29b-41d4-a716-446655440000')
class SessionRecords(Resource):
    """会话记录管理"""
    
    @agent_ns.doc('get_records')
    @agent_ns.response(200, '成功', records_response_model)
    @agent_ns.response(400, '会话ID格式无效', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def get(self, session_id):
        """
        获取会话的问答记录
        
        返回指定会话的所有问答记录列表
        """
        pass


@agent_ns.route('/ask')
class Ask(Resource):
    """问答功能"""
    
    @agent_ns.doc('ask')
    @agent_ns.expect(ask_request_model)
    @agent_ns.response(200, '回答成功', ask_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def post(self):
        """
        问答提交
        
        向指定会话提交问题，获取AI回答
        """
        pass


@agent_ns.route('/capabilities')
class Capabilities(Resource):
    """系统能力状态"""
    
    @agent_ns.doc('get_capabilities')
    @agent_ns.response(200, '成功', capabilities_response_model)
    def get(self):
        """
        获取系统能力状态
        
        返回系统各模块的可用状态和能力列表
        """
        pass


@agent_ns.route('/health')
class Health(Resource):
    """健康检查"""
    
    @agent_ns.doc('get_health')
    @agent_ns.response(200, '成功', health_response_model)
    def get(self):
        """
        获取系统健康状态
        
        返回系统健康状态和运行指标
        """
        pass


@agent_ns.route('/export')
class Export(Resource):
    """导出功能"""
    
    @agent_ns.doc('export_records')
    @agent_ns.expect(export_request_model)
    @agent_ns.response(200, '导出成功', export_response_model)
    @agent_ns.response(400, '参数错误', error_response_model)
    @agent_ns.response(404, '会话不存在', error_response_model)
    def post(self):
        """
        导出问答记录
        
        导出指定会话的问答记录为JSON或TXT格式
        """
        pass
