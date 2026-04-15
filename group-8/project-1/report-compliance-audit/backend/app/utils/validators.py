# -*- coding: utf-8 -*-
"""参数校验工具"""

import os
from datetime import datetime


# 允许的文件类型
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# 枚举值定义
REVIEW_MODES = ['rule', 'ai', 'combined']
REVIEW_STATUSES = ['pending', 'reviewing', 'passed', 'failed', 'warning']
REPORT_TYPES = ['日报', '周报', '深度研究', '首次覆盖', '行业报告']
SEVERITY_LEVELS = ['P0', 'P1', 'P2']
ISSUE_CATEGORIES = ['compliance', 'content']


def allowed_file(filename):
    """检查文件类型是否允许"""
    if not filename:
        return False
    _, ext = os.path.splitext(filename.lower())
    return ext in ALLOWED_EXTENSIONS


def validate_file_size(file_storage):
    """检查文件大小"""
    file_storage.seek(0, 2)  # 移动到文件末尾
    size = file_storage.tell()
    file_storage.seek(0)  # 重置到文件开头
    return size <= MAX_FILE_SIZE


def validate_page(value, default=1):
    """校验页码"""
    try:
        page = int(value) if value else default
        return max(1, page)
    except (TypeError, ValueError):
        return default


def validate_page_size(value, default=20, max_size=100):
    """校验每页数量"""
    try:
        page_size = int(value) if value else default
        return min(max(1, page_size), max_size)
    except (TypeError, ValueError):
        return default


def validate_date(date_str):
    """校验日期格式 YYYY-MM-DD"""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None


def validate_review_mode(mode):
    """校验审核模式"""
    if mode not in REVIEW_MODES:
        raise ValueError(f"无效的审核模式: {mode}，可选值: {REVIEW_MODES}")
    return mode


def validate_report_type(report_type):
    """校验研报类型"""
    if report_type not in REPORT_TYPES:
        raise ValueError(f"无效的研报类型: {report_type}，可选值: {REPORT_TYPES}")
    return report_type
