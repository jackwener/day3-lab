"""页面路由 — 提供前端 HTML"""

import os
from flask import Blueprint, send_from_directory

PAGE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'front'))

page_bp = Blueprint('page', __name__)


@page_bp.route('/')
def index():
    """首页 — 返回前端 SPA 入口页面"""
    return send_from_directory(PAGE_DIR, 'index.html')


@page_bp.route('/<path:filename>')
def static_file(filename):
    """前端静态资源（JS/CSS/图片等）"""
    return send_from_directory(PAGE_DIR, filename)
