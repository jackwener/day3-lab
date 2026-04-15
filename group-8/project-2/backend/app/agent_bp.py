import os
import uuid
import time
from flask import Blueprint, request, current_app
from .helpers import ok, err
from .storage import Storage
from .agent import CoPawAgent
from .report_parser import parse_report, normalize_v1_data
from .stock_mock import get_stock_detail as fetch_stock_detail
from .opinion_analyzer import find_common_and_diff_opinions

agent_bp = Blueprint("agent", __name__)


@agent_bp.route("/capabilities", methods=["GET"])
def get_capabilities():
    """
    能力探测
    ---
    tags:
      - 系统
    responses:
      200:
        description: 返回当前 LLM 配置状态
        schema:
          type: object
          properties:
            traceId:
              type: string
            copaw_configured:
              type: boolean
            bailian_configured:
              type: boolean
            model:
              type: string
              nullable: true
    """
    copaw_auth_url = os.environ.get("IRA_COPAW_AUTH_URL")
    copaw_qa_url = os.environ.get("IRA_COPAW_QA_URL")
    dashscope_api_key = os.environ.get("DASHSCOPE_API_KEY")

    copaw_configured = bool(copaw_auth_url and copaw_qa_url)
    bailian_configured = bool(dashscope_api_key)

    model = "qwen-plus" if bailian_configured else None

    return ok({
        "copaw_configured": copaw_configured,
        "bailian_configured": bailian_configured,
        "model": model
    })


@agent_bp.route("/ask", methods=["POST"])
def ask():
    """
    问答提交
    ---
    tags:
      - 问答
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - query
            - session_id
          properties:
            query:
              type: string
              description: 用户提问（1-500字符）
              example: "什么是基金？"
            session_id:
              type: string
              description: 会话ID（UUID格式）
              example: "550e8400-e29b-41d4-a716-446655440000"
    responses:
      200:
        description: 问答成功
        schema:
          type: object
          properties:
            traceId:
              type: string
            answer:
              type: string
            llm_used:
              type: boolean
            model:
              type: string
              nullable: true
            response_time_ms:
              type: integer
            answer_source:
              type: string
              enum: [copaw, bailian, demo]
      400:
        description: 参数校验失败（EMPTY_QUERY / INVALID_QUERY）
    """
    data = request.get_json() or {}
    query = data.get("query", "")
    session_id = data.get("session_id")

    # 校验 query
    if not query or not query.strip():
        return err("EMPTY_QUERY", "查询内容不能为空", status=400)

    if len(query) > 500:
        return err("INVALID_QUERY", "查询内容超过500字符限制", status=400)

    # 校验 session_id
    if not session_id:
        return err("INVALID_QUERY", "缺少 session_id", status=400)

    # 调用 Agent
    agent = CoPawAgent()
    result = agent.ask(query, session_id)

    # 持久化记录
    storage = Storage(current_app.config["DATA_DIR"])
    storage.add_record(
        session_id=session_id,
        query=query,
        answer=result["answer"],
        llm_used=result["llm_used"],
        model=result["model"],
        response_time_ms=result["response_time_ms"],
        answer_source=result["answer_source"]
    )

    return ok({
        "answer": result["answer"],
        "llm_used": result["llm_used"],
        "model": result["model"],
        "response_time_ms": result["response_time_ms"],
        "answer_source": result["answer_source"]
    })


@agent_bp.route("/sessions", methods=["GET"])
def get_sessions():
    """
    获取会话列表
    ---
    tags:
      - 会话管理
    responses:
      200:
        description: 返回所有会话
        schema:
          type: object
          properties:
            traceId:
              type: string
            sessions:
              type: array
              items:
                type: object
                properties:
                  session_id:
                    type: string
                  title:
                    type: string
                  created_at:
                    type: string
                  query_count:
                    type: integer
    """
    storage = Storage(current_app.config["DATA_DIR"])
    sessions = storage.get_sessions()
    return ok({"sessions": sessions})


@agent_bp.route("/sessions", methods=["POST"])
def create_session():
    """
    新建会话
    ---
    tags:
      - 会话管理
    parameters:
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            title:
              type: string
              description: 会话标题（≤23字符），默认"新会话"
              example: "投资咨询"
    responses:
      201:
        description: 创建成功
        schema:
          type: object
          properties:
            traceId:
              type: string
            session_id:
              type: string
            title:
              type: string
            created_at:
              type: string
            query_count:
              type: integer
      400:
        description: 标题过长（INVALID_QUERY）
    """
    data = request.get_json() or {}
    title = data.get("title", "新会话")

    # 校验 title 长度
    if len(title) > 23:
        return err("INVALID_QUERY", "会话标题超过23字符限制", status=400)

    # 生成 UUID
    session_id = str(uuid.uuid4())

    # 创建会话
    storage = Storage(current_app.config["DATA_DIR"])
    session = storage.create_session(session_id, title)

    return ok({
        "session_id": session["session_id"],
        "title": session["title"],
        "created_at": session["created_at"],
        "query_count": session["query_count"]
    }, status=201)


@agent_bp.route("/sessions/<id>", methods=["DELETE"])
def delete_session(id):
    """
    删除会话
    ---
    tags:
      - 会话管理
    parameters:
      - in: path
        name: id
        type: string
        required: true
        description: 会话ID（UUID格式）
    responses:
      200:
        description: 删除成功
        schema:
          type: object
          properties:
            traceId:
              type: string
            message:
              type: string
            deleted_session_id:
              type: string
      400:
        description: ID格式错误（INVALID_SESSION_ID）
      404:
        description: 会话不存在（SESSION_NOT_FOUND）
    """
    # 校验 UUID 格式
    try:
        uuid.UUID(id)
    except ValueError:
        return err("INVALID_SESSION_ID", "无效的会话ID格式", status=400)

    storage = Storage(current_app.config["DATA_DIR"])

    # 检查会话是否存在
    session = storage.get_session(id)
    if not session:
        return err("SESSION_NOT_FOUND", "会话不存在", status=404)

    # 删除会话
    storage.delete_session(id)

    return ok({
        "message": "会话已删除",
        "deleted_session_id": id
    })


@agent_bp.route("/sessions/<id>/records", methods=["GET"])
def get_records(id):
    """
    获取问答记录
    ---
    tags:
      - 问答
    parameters:
      - in: path
        name: id
        type: string
        required: true
        description: 会话ID（UUID格式）
    responses:
      200:
        description: 返回问答记录列表
        schema:
          type: object
          properties:
            traceId:
              type: string
            records:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  session_id:
                    type: string
                  query:
                    type: string
                  answer:
                    type: string
                  llm_used:
                    type: boolean
                  model:
                    type: string
                    nullable: true
                  response_time_ms:
                    type: integer
                  answer_source:
                    type: string
                  timestamp:
                    type: string
      400:
        description: ID格式错误（INVALID_SESSION_ID）
      404:
        description: 会话不存在（SESSION_NOT_FOUND）
    """
    # 校验 UUID 格式
    try:
        uuid.UUID(id)
    except ValueError:
        return err("INVALID_SESSION_ID", "无效的会话ID格式", status=400)

    storage = Storage(current_app.config["DATA_DIR"])

    # 检查会话是否存在
    session = storage.get_session(id)
    if not session:
        return err("SESSION_NOT_FOUND", "会话不存在", status=404)

    records = storage.get_records_by_session(id)
    return ok({"records": records})


# ==================== 股票端点 ====================

@agent_bp.route("/stock/<code>/detail", methods=["GET"])
def get_stock_detail(code):
    """
    获取Mock股票详情
    ---
    tags:
      - 股票
    parameters:
      - in: path
        name: code
        type: string
        required: true
        description: 股票代码（SH/SZ+6位数字）
    responses:
      200:
        description: 股票详情
      400:
        description: 无效的股票代码格式
      404:
        description: 股票代码不存在
    """
    import re
    # 1. 校验 code 格式
    if not re.match(r'^(SH|SZ)\d{6}$', code):
        return err("INVALID_STOCK_CODE", "无效的股票代码格式", status=400)
    
    # 2. 查询 Mock 数据
    detail = fetch_stock_detail(code)
    if not detail:
        return err("STOCK_NOT_FOUND", "股票代码不存在", status=404)
    
    # 3. 返回成功
    return ok(detail)


# ==================== 研报端点 ====================

@agent_bp.route("/reports/upload", methods=["POST"])
def upload_report():
    """
    上传研报
    ---
    tags:
      - 研报
    consumes:
      - multipart/form-data
    parameters:
      - in: formData
        name: file
        type: file
        required: true
        description: 研报文件（PDF/HTML，≤50MB）
      - in: formData
        name: session_id
        type: string
        required: false
        description: 关联会话ID
    responses:
      201:
        description: 上传解析成功
      400:
        description: 文件类型错误或文件过大
    """
    if "file" not in request.files:
        return err("INVALID_FILE_TYPE", "未上传文件", status=400)
    
    file = request.files["file"]
    session_id = request.form.get("session_id")
    
    if not file.filename:
        return err("INVALID_FILE_TYPE", "文件名为空", status=400)
    
    # 文件类型校验
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ("pdf", "html", "htm"):
        return err("INVALID_FILE_TYPE", f"不支持的文件类型: {ext}，仅支持 PDF/HTML", status=400)
    
    file_type = "html" if ext in ("html", "htm") else "pdf"
    
    # 读取文件内容检查大小（50MB限制）
    file_data = file.read()
    file_size = len(file_data)
    if file_size > 50 * 1024 * 1024:
        return err("FILE_TOO_LARGE", "文件大小超过50MB限制", status=400)
    
    # 保存文件
    data_dir = current_app.config["DATA_DIR"]
    uploads_dir = os.path.join(data_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    safe_filename = f"{report_id}_{file.filename}"
    file_path = os.path.join(uploads_dir, safe_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_data)
    
    # 解析研报
    parse_result = parse_report(file_path, file_type)
    
    # 构建报告记录
    from datetime import datetime, timezone
    report = {
        "report_id": report_id,
        "session_id": session_id,
        "file_name": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "file_path": file_path,
        "uploaded_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": parse_result["status"],
        "extracted_data": parse_result.get("extracted_data"),
        "error_message": parse_result.get("error_message"),
    }
    
    storage = Storage(data_dir)
    storage.save_report(report)
    
    return ok({
        "report_id": report_id,
        "file_name": file.filename,
        "file_type": file_type,
        "file_size": file_size,
        "status": report["status"],
        "extracted_data": report["extracted_data"],
    }, status=201)


@agent_bp.route("/reports", methods=["GET"])
def get_reports():
    """
    获取研报列表
    ---
    tags:
      - 研报
    parameters:
      - in: query
        name: session_id
        type: string
        required: false
        description: 按会话ID过滤
      - in: query
        name: search
        type: string
        required: false
        description: 文件名模糊搜索（≤50字符）
      - in: query
        name: institution
        type: string
        required: false
        description: 按机构筛选
      - in: query
        name: stock_code
        type: string
        required: false
        description: 按股票代码筛选
    responses:
      200:
        description: 研报列表
      400:
        description: 搜索关键词过长
    """
    session_id = request.args.get("session_id")
    search = request.args.get("search")
    institution = request.args.get("institution")
    stock_code = request.args.get("stock_code")
    
    # 搜索关键词长度校验
    if search and len(search) > 50:
        return err("INVALID_QUERY", "搜索关键词过长", status=400)
    
    storage = Storage(current_app.config["DATA_DIR"])
    reports = storage.get_reports(
        session_id=session_id,
        search=search,
        institution=institution,
        stock_code=stock_code
    )
    # 返回时不包含 file_path 和 raw_text（安全+性能）
    safe_reports = []
    for r in reports:
        safe_r = {k: v for k, v in r.items() if k not in ("file_path",)}
        ed = safe_r.get("extracted_data")
        if ed:
            # V1 -> V2 兼容转换
            ed = normalize_v1_data(ed)
            # 去掉原文字段
            if "raw_text" in ed:
                ed = {k: v for k, v in ed.items() if k != "raw_text"}
            safe_r["extracted_data"] = ed
        safe_reports.append(safe_r)
    return ok({"reports": safe_reports})


@agent_bp.route("/reports/aggregations", methods=["GET"])
def get_report_aggregations():
    """
    获取研报聚合数据（用于筛选下拉框）
    ---
    tags:
      - 研报
    responses:
      200:
        description: 聚合数据
        schema:
          type: object
          properties:
            institutions:
              type: array
              items:
                type: string
            stock_codes:
              type: array
              items:
                type: string
      500:
        description: 聚合计算失败
    """
    try:
        storage = Storage(current_app.config["DATA_DIR"])
        reports = storage.get_reports()
        
        institutions = set()
        stock_codes = set()
        
        for report in reports:
            data = report.get('extracted_data', {})
            if data.get('institution'):
                institutions.add(data['institution'])
            for code in data.get('stock_codes', []):
                stock_codes.add(code)
        
        return ok({
            "institutions": sorted(list(institutions)),
            "stock_codes": sorted(list(stock_codes))
        })
    except Exception as e:
        return err("AGGREGATION_ERROR", str(e), status=500)


@agent_bp.route("/reports/<report_id>", methods=["GET"])
def get_report_detail(report_id):
    """
    获取研报详情
    ---
    tags:
      - 研报
    parameters:
      - in: path
        name: report_id
        type: string
        required: true
    responses:
      200:
        description: 研报详情
      404:
        description: 研报不存在
    """
    storage = Storage(current_app.config["DATA_DIR"])
    report = storage.get_report_by_id(report_id)
    if not report:
        return err("REPORT_NOT_FOUND", "研报不存在", status=404)
    # 不暴露 file_path
    safe_report = {k: v for k, v in report.items() if k != "file_path"}
    # 对旧格式数据进行兼容转换
    if safe_report.get("extracted_data"):
        safe_report["extracted_data"] = normalize_v1_data(safe_report["extracted_data"])
    return ok({"report": safe_report})


@agent_bp.route("/reports/<report_id>", methods=["DELETE"])
def delete_report(report_id):
    """
    删除研报
    ---
    tags:
      - 研报
    parameters:
      - in: path
        name: report_id
        type: string
        required: true
        description: 研报ID（rpt_前缀）
    responses:
      200:
        description: 删除成功
      404:
        description: 研报不存在
      500:
        description: 删除失败
    """
    storage = Storage(current_app.config["DATA_DIR"])
    
    # 检查该研报是否存在
    report = storage.get_report_by_id(report_id)
    if not report:
        return err("REPORT_NOT_FOUND", "研报不存在", status=404)
    
    # 执行级联删除
    success = storage.delete_report(report_id)
    if not success:
        return err("DELETE_FAILED", "删除失败", status=500)
    
    # 返回确认
    return ok({"message": f"研报 {report_id} 已删除"})


@agent_bp.route("/reports/compare", methods=["POST"])
def compare_reports():
    """
    研报对比
    ---
    tags:
      - 研报
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - report_ids
          properties:
            report_ids:
              type: array
              items:
                type: string
              description: 研报ID列表（2-5个）
    responses:
      200:
        description: 对比结果
      400:
        description: 参数错误
      404:
        description: 研报不存在
    """
    data = request.get_json() or {}
    report_ids = data.get("report_ids", [])
    
    if not isinstance(report_ids, list) or len(report_ids) < 2:
        return err("INVALID_QUERY", "至少需要2份研报进行对比", status=400)
    
    if len(report_ids) > 5:
        return err("INVALID_QUERY", "最多支持5份研报同时对比", status=400)
    
    storage = Storage(current_app.config["DATA_DIR"])
    reports = []
    for rid in report_ids:
        report = storage.get_report_by_id(rid)
        if not report:
            return err("REPORT_NOT_FOUND", f"研报不存在: {rid}", status=404)
        reports.append(report)
    
    # 构建对比表
    comparison_table = {
        "dimensions": ["rating", "target_price", "key_points"],
        "reports": []
    }
    
    for report in reports:
        ed = report.get("extracted_data") or {}
        # 对旧格式数据进行兼容转换
        ed = normalize_v1_data(ed)
        comparison_table["reports"].append({
            "report_id": report["report_id"],
            "file_name": report["file_name"],
            "rating": ed.get("rating"),
            "target_price": ed.get("target_price"),
            "key_points": ed.get("key_points", []),
        })
    
    # 计算共同观点和差异观点
    common_opinions = []
    diff_opinions = []
    
    if len(reports) >= 2:
        # 对所有研报组合进行两两对比
        for i in range(len(reports)):
            for j in range(i + 1, len(reports)):
                report_a = reports[i]
                report_b = reports[j]
                
                # 获取并规范化 extracted_data
                ed_a = normalize_v1_data(report_a.get("extracted_data") or {})
                ed_b = normalize_v1_data(report_b.get("extracted_data") or {})
                
                # 提取 key_points（已是 object[] 格式）
                kp_a = ed_a.get("key_points", [])
                kp_b = ed_b.get("key_points", [])
                
                # 调用观点分析
                result = find_common_and_diff_opinions(kp_a, kp_b, threshold=0.7)
                
                # 构造共同观点响应格式
                for common in result.get("common_opinions", []):
                    common_opinions.append({
                        "text": common.get("text", ""),
                        "reports": [
                            {"report_id": report_a["report_id"], "file_name": report_a["file_name"]},
                            {"report_id": report_b["report_id"], "file_name": report_b["file_name"]}
                        ]
                    })
                
                # 构造差异观点响应格式
                if result.get("diff_opinions_a"):
                    diff_opinions.append({
                        "report_id": report_a["report_id"],
                        "file_name": report_a["file_name"],
                        "opinions": result["diff_opinions_a"]
                    })
                if result.get("diff_opinions_b"):
                    diff_opinions.append({
                        "report_id": report_b["report_id"],
                        "file_name": report_b["file_name"],
                        "opinions": result["diff_opinions_b"]
                    })
    
    return ok({
        "comparison_table": comparison_table,
        "common_opinions": common_opinions,
        "diff_opinions": diff_opinions
    })
