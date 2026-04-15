# -*- coding: utf-8 -*-
"""审核路由"""

from flask import Blueprint, request, send_file
from app.utils.response import success_response, paginated_response
from app.utils.validators import (
    validate_page, validate_page_size, validate_date,
    validate_review_mode, validate_report_type
)
from app.utils.errors import ValidationError, NotFoundError, FileError, ErrorCodes
from app.services import file_service, review_service

review_bp = Blueprint('reviews', __name__, url_prefix='/api/v1/reviews')


@review_bp.route('', methods=['POST'])
def create_review():
    """
    提交审核
    ---
    tags:
      - Reviews
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: 研报文件(.pdf/.docx/.doc)，最大50MB
      - name: reportType
        in: formData
        type: string
        required: true
        enum: [日报, 周报, 深度研究, 首次覆盖, 行业报告]
        description: 研报类型
      - name: mode
        in: formData
        type: string
        required: true
        enum: [rule, ai, combined]
        description: 审核模式
    produces:
      - application/json
    responses:
      201:
        description: 审核已提交
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                id:
                  type: string
                status:
                  type: string
                message:
                  type: string
      400:
        description: 参数错误
    """
    # 检查文件
    if 'file' not in request.files:
        raise ValidationError("未提供文件")
    
    file = request.files['file']
    if not file or not file.filename:
        raise ValidationError("文件不能为空")
    
    # 获取参数
    report_type = request.form.get('reportType')
    mode = request.form.get('mode')
    
    # 校验参数
    try:
        validate_report_type(report_type)
        validate_review_mode(mode)
    except ValueError as e:
        raise ValidationError(str(e))
    
    # 保存文件
    file_path, file_name = file_service.save_file(file)
    
    # 创建审核记录
    review = review_service.create_review(
        report_type=report_type,
        mode=mode,
        file_path=file_path,
        file_name=file_name
    )
    
    # 启动审核流程
    review_service.start_review(review.id)
    
    return success_response({
        'id': review.id,
        'status': review.status,
        'message': '审核已提交，正在处理中'
    }), 201


@review_bp.route('/<review_id>/status', methods=['GET'])
def get_review_status(review_id):
    """
    获取审核状态
    ---
    tags:
      - Reviews
    parameters:
      - name: review_id
        in: path
        type: string
        required: true
        description: 审核记录ID
    produces:
      - application/json
    responses:
      200:
        description: 成功返回审核状态
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                id:
                  type: string
                status:
                  type: string
                progress:
                  type: integer
                currentStep:
                  type: string
                steps:
                  type: array
                  items:
                    type: object
                estimatedRemaining:
                  type: string
    """
    status = review_service.get_review_status(review_id)
    return success_response(status), 200


@review_bp.route('/<review_id>', methods=['GET'])
def get_review(review_id):
    """
    获取审核报告详情
    ---
    tags:
      - Reviews
    parameters:
      - name: review_id
        in: path
        type: string
        required: true
        description: 审核记录ID
    produces:
      - application/json
    responses:
      200:
        description: 成功返回审核报告
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                id:
                  type: string
                title:
                  type: string
                author:
                  type: string
                reportType:
                  type: string
                mode:
                  type: string
                status:
                  type: string
                score:
                  type: integer
                complianceIssues:
                  type: integer
                contentIssues:
                  type: integer
                submittedAt:
                  type: string
                completedAt:
                  type: string
                issues:
                  type: array
                  items:
                    type: object
      404:
        description: 审核记录不存在
    """
    review = review_service.get_review(review_id)
    
    # 获取问题列表
    issues = [issue.to_dict() for issue in review.issues]
    
    result = review.to_dict()
    result['issues'] = issues
    
    return success_response(result), 200


@review_bp.route('', methods=['GET'])
def list_reviews():
    """
    审核历史列表
    ---
    tags:
      - Reviews
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
        description: 页码
      - name: pageSize
        in: query
        type: integer
        default: 20
        description: 每页数量
      - name: search
        in: query
        type: string
        description: 搜索关键词
      - name: status
        in: query
        type: string
        enum: [pending, reviewing, passed, failed, warning]
        description: 状态筛选
      - name: mode
        in: query
        type: string
        enum: [rule, ai, combined]
        description: 模式筛选
      - name: startDate
        in: query
        type: string
        format: date
        description: 开始日期
      - name: endDate
        in: query
        type: string
        format: date
        description: 结束日期
    produces:
      - application/json
    responses:
      200:
        description: 成功返回审核历史列表
        schema:
          type: object
          properties:
            traceId:
              type: string
            data:
              type: object
              properties:
                total:
                  type: integer
                page:
                  type: integer
                pageSize:
                  type: integer
                list:
                  type: array
                  items:
                    type: object
    """
    # 解析参数
    page = validate_page(request.args.get('page'))
    page_size = validate_page_size(request.args.get('pageSize'))
    search = request.args.get('search')
    status = request.args.get('status')
    mode = request.args.get('mode')
    start_date = validate_date(request.args.get('startDate'))
    end_date = validate_date(request.args.get('endDate'))
    
    # 查询
    total, reviews = review_service.get_review_list(
        page=page,
        page_size=page_size,
        status=status,
        mode=mode,
        search=search,
        start_date=start_date,
        end_date=end_date
    )
    
    # 转换
    items = [review.to_list_dict() for review in reviews]
    
    return paginated_response(items, total, page, page_size), 200


@review_bp.route('/<review_id>/file', methods=['GET'])
def get_review_file(review_id):
    """
    获取原始研报文件
    ---
    tags:
      - Reviews
    parameters:
      - name: review_id
        in: path
        type: string
        required: true
        description: 审核记录ID
    produces:
      - application/pdf
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    responses:
      200:
        description: 成功返回原始文件
      404:
        description: 审核记录或文件不存在
    """
    import os
    from flask import send_file
    
    review = review_service.get_review(review_id)
    
    # file_path 存的是相对路径，转为绝对路径
    abs_path = os.path.abspath(review.file_path) if review.file_path else None
    if not abs_path or not os.path.exists(abs_path):
        raise NotFoundError(ErrorCodes.REVIEW_NOT_FOUND, "原始文件不存在")
    
    _, ext = os.path.splitext(abs_path.lower())
    mimetype = 'application/pdf' if ext == '.pdf' else \
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    return send_file(
        abs_path,
        mimetype=mimetype,
        download_name=review.file_name or f'report{ext}'
    )


@review_bp.route('/<review_id>/export', methods=['GET'])
def export_review(review_id):
    """
    导出审核报告
    ---
    tags:
      - Reviews
    parameters:
      - name: review_id
        in: path
        type: string
        required: true
        description: 审核记录ID
      - name: format
        in: query
        type: string
        enum: [pdf, docx]
        default: pdf
        description: 导出格式
    produces:
      - application/pdf
      - application/vnd.openxmlformats-officedocument.wordprocessingml.document
    responses:
      200:
        description: 成功返回文件
    """
    from flask import send_file
    from app.services.export_service import export_service
    
    review = review_service.get_review(review_id)
    export_format = request.args.get('format', 'pdf')
    issues = [issue for issue in review.issues]
    
    if export_format == 'docx':
        buffer = export_service.export_docx(review, issues)
        return send_file(
            buffer,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=f'审核报告_{review.id}.docx'
        )
    else:
        buffer = export_service.export_pdf(review, issues)
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'审核报告_{review.id}.pdf'
        )
