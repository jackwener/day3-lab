"""
routes/reports_bp.py — 研报管理路由
对齐规格: 09-API接口规格 §8~11
端点清单:
  GET    /reports
  POST   /reports
  DELETE /reports/<id>
  POST   /reports/<id>/analyze
"""
import os
import re
import uuid
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, current_app

reports_bp = Blueprint("reports", __name__)


# ------------------------------------------------------------------ #
# 辅助函数
# ------------------------------------------------------------------ #
def _trace() -> str:
    return f"tr_{uuid.uuid4().hex[:16]}"


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _err(http_code: int, code: str, message: str, details: dict | None = None):
    trace_id = _trace()
    return (
        jsonify({"error": {"code": code, "message": message, "details": details or {}, "traceId": trace_id}}),
        http_code,
    )


def _get_storage():
    return current_app.config["STORAGE"]


# 允许的文件扩展名
ALLOWED_EXTENSIONS = {'.pdf', '.doc', '.docx'}


def _allowed_file(filename: str) -> bool:
    """检查文件扩展名是否允许"""
    return os.path.splitext(filename.lower())[1] in ALLOWED_EXTENSIONS


# ------------------------------------------------------------------ #
# GET /reports — 研报列表
# ------------------------------------------------------------------ #
@reports_bp.route("/reports", methods=["GET"])
def get_reports():
    storage = _get_storage()
    
    # 分页参数
    page = max(1, int(request.args.get("page", 1)))
    page_size = min(100, max(1, int(request.args.get("page_size", 20))))
    
    # 筛选参数
    status_filter = request.args.get("status")
    company_filter = request.args.get("company")
    industry_filter = request.args.get("industry")
    
    all_reports = storage.get_reports()
    
    # 应用筛选
    filtered = all_reports
    if status_filter:
        filtered = [r for r in filtered if r.get("status") == status_filter]
    if company_filter:
        filtered = [r for r in filtered if company_filter.lower() in (r.get("company") or "").lower()]
    if industry_filter:
        filtered = [r for r in filtered if industry_filter.lower() in (r.get("industry") or "").lower()]
    
    # 按上传时间倒序
    filtered = sorted(filtered, key=lambda r: r.get("uploaded_at", ""), reverse=True)
    
    total = len(filtered)
    start = (page - 1) * page_size
    paginated = filtered[start: start + page_size]
    
    return (
        jsonify(
            {
                "traceId": _trace(),
                "total": total,
                "page": page,
                "page_size": page_size,
                "reports": paginated,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# POST /reports — 上传研报
# ------------------------------------------------------------------ #
@reports_bp.route("/reports", methods=["POST"])
def upload_report():
    storage = _get_storage()
    
    # 检查是否有文件
    if "file" not in request.files:
        return _err(400, "EMPTY_FILE", "请选择要上传的文件")
    
    file = request.files["file"]
    if file.filename == "":
        return _err(400, "EMPTY_FILE", "请选择要上传的文件")
    
    # 检查文件类型
    if not _allowed_file(file.filename):
        return _err(400, "INVALID_FILE_TYPE", "仅支持 PDF、DOC、DOCX 格式", {"supported": list(ALLOWED_EXTENSIONS)})
    
    # 获取标题（可选）
    title = request.form.get("title", "").strip()
    if not title:
        # 使用文件名（不含扩展名）作为默认标题
        title = os.path.splitext(file.filename)[0]
    
    if len(title) > 100:
        return _err(400, "INVALID_TITLE", "标题过长，最多100字符", {"max_length": 100})
    
    # 生成 report_id
    report_id = str(uuid.uuid4())
    
    # 保存文件
    uploads_dir = os.path.join(storage.data_dir, "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    saved_filename = f"{report_id}{file_ext}"
    filepath = os.path.join(uploads_dir, saved_filename)
    file.save(filepath)
    
    # 创建研报记录
    report = {
        "report_id": report_id,
        "title": title,
        "filename": file.filename,
        "file_path": filepath,
        "file_type": file_ext[1:],  # 去掉点号
        "status": "pending",  # pending, analyzing, analyzed, failed
        "company": None,
        "industry": None,
        "institution": None,
        "uploaded_at": _now_iso(),
        "analyzed_at": None,
        "analysis_result": None,
    }
    
    storage.create_report(report)
    
    return (
        jsonify(
            {
                "traceId": _trace(),
                "report_id": report_id,
                "title": title,
                "status": "pending",
                "uploaded_at": report["uploaded_at"],
            }
        ),
        201,
    )


# ------------------------------------------------------------------ #
# DELETE /reports/<id> — 删除研报
# ------------------------------------------------------------------ #
@reports_bp.route("/reports/<report_id>", methods=["DELETE"])
def delete_report(report_id):
    storage = _get_storage()
    
    if not UUID_RE.match(report_id):
        return _err(400, "INVALID_REPORT_ID", "report_id 格式非法", {"format": "UUID"})
    
    report = storage.get_report(report_id)
    if report is None:
        return _err(404, "REPORT_NOT_FOUND", "研报不存在", {"report_id": report_id})
    
    # 删除关联的文件
    file_path = report.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass  # 文件删除失败不影响数据库记录删除
    
    # 删除记录
    storage.delete_report(report_id)
    
    return (
        jsonify(
            {
                "traceId": _trace(),
                "deleted": True,
                "report_id": report_id,
            }
        ),
        200,
    )


# ------------------------------------------------------------------ #
# POST /reports/<id>/analyze — 分析研报
# ------------------------------------------------------------------ #
@reports_bp.route("/reports/<report_id>/analyze", methods=["POST"])
def analyze_report(report_id):
    """
    分析研报内容，提取公司、行业等信息。
    教学版本使用模拟分析，实际生产环境可接入LLM进行文档解析。
    """
    storage = _get_storage()
    
    if not UUID_RE.match(report_id):
        return _err(400, "INVALID_REPORT_ID", "report_id 格式非法", {"format": "UUID"})
    
    report = storage.get_report(report_id)
    if report is None:
        return _err(404, "REPORT_NOT_FOUND", "研报不存在", {"report_id": report_id})
    
    # 检查文件是否存在
    file_path = report.get("file_path")
    if not file_path or not os.path.exists(file_path):
        return _err(404, "FILE_NOT_FOUND", "研报文件不存在或已被删除")
    
    # 更新状态为分析中
    storage.update_report(report_id, {"status": "analyzing"})
    
    # 模拟分析过程（教学版本）
    # 实际生产环境应调用文档解析服务或LLM
    import random
    
    # 模拟从文件名或标题中提取公司和行业信息
    title = report.get("title", "")
    
    # 模拟公司列表
    mock_companies = ["腾讯控股", "阿里巴巴", "比亚迪", "宁德时代", "贵州茅台", "招商银行", "中国平安"]
    mock_industries = ["互联网", "新能源汽车", "金融", "消费品", "医疗健康", "半导体"]
    mock_institutions = ["中信证券", "中金公司", "华泰证券", "国泰君安", "招商证券"]
    
    # 随机选择（实际应从文档内容中提取）
    company = random.choice(mock_companies)
    industry = random.choice(mock_industries)
    institution = random.choice(mock_institutions)
    
    # 更新分析结果
    updates = {
        "status": "analyzed",
        "company": company,
        "industry": industry,
        "institution": institution,
        "analyzed_at": _now_iso(),
        "analysis_result": {
            "extracted_entities": {
                "company": company,
                "industry": industry,
                "institution": institution,
            },
            "summary": f"该研报为{company}的{industry}行业分析报告，由{institution}发布。",
        },
    }
    
    updated_report = storage.update_report(report_id, updates)
    
    return (
        jsonify(
            {
                "traceId": _trace(),
                "report_id": report_id,
                "status": "analyzed",
                "company": company,
                "industry": industry,
                "institution": institution,
                "analyzed_at": updates["analyzed_at"],
            }
        ),
        200,
    )
