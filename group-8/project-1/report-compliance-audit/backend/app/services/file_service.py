# -*- coding: utf-8 -*-
"""文件上传与解析服务"""

import os
import uuid
from datetime import datetime
from app.utils.errors import FileError, ErrorCodes


class FileService:
    """文件服务"""
    
    UPLOAD_FOLDER = 'uploads'
    
    def __init__(self, app=None):
        self.upload_folder = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """初始化"""
        self.upload_folder = app.config.get('UPLOAD_FOLDER', self.UPLOAD_FOLDER)
        os.makedirs(self.upload_folder, exist_ok=True)
    
    def save_file(self, file_storage):
        """保存上传文件
        
        Args:
            file_storage: Werkzeug FileStorage 对象
            
        Returns:
            tuple: (file_path, file_name)
        """
        if not file_storage:
            raise FileError(ErrorCodes.INVALID_REQUEST, "未提供文件")
        
        # 检查文件类型
        from app.utils.validators import allowed_file
        if not allowed_file(file_storage.filename):
            raise FileError(
                ErrorCodes.UNSUPPORTED_FILE_TYPE,
                "不支持的文件格式，仅支持 .pdf, .docx, .doc",
                {"filename": file_storage.filename}
            )
        
        # 检查文件大小
        from app.utils.validators import validate_file_size
        if not validate_file_size(file_storage):
            raise FileError(
                ErrorCodes.FILE_TOO_LARGE,
                "文件大小超过50MB限制",
                {"filename": file_storage.filename}
            )
        
        # 生成文件名
        _, ext = os.path.splitext(file_storage.filename.lower())
        new_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(self.upload_folder, new_filename)
        
        # 保存文件
        file_storage.save(file_path)
        
        return file_path, file_storage.filename
    
    def parse_file(self, file_path):
        """解析文件内容
        
        Args:
            file_path: 文件路径
            
        Returns:
            dict: 包含 text, title, author 的字典
        """
        _, ext = os.path.splitext(file_path.lower())
        
        if ext == '.pdf':
            return self._parse_pdf(file_path)
        elif ext in ['.docx', '.doc']:
            return self._parse_word(file_path)
        else:
            raise FileError(
                ErrorCodes.UNSUPPORTED_FILE_TYPE,
                f"不支持的文件格式: {ext}"
            )
    
    def _parse_pdf(self, file_path):
        """解析PDF文件"""
        text_content = []
        title = None
        author = None
        
        try:
            import pdfplumber
            
            with pdfplumber.open(file_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                    
                    # 从第一页提取标题
                    if i == 0 and text:
                        lines = text.strip().split('\n')
                        if lines:
                            title = lines[0][:100]  # 取第一行作为标题
                        
                        # 尝试提取作者
                        for line in lines[1:5]:  # 检查前几行
                            if '分析师' in line or '研究员' in line or '作者' in line:
                                author = line.strip()[:50]
                                break
        except Exception as e:
            # 回退到 PyPDF2
            try:
                from PyPDF2 import PdfReader
                
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                
                # 提取元信息
                if reader.metadata:
                    title = reader.metadata.get('/Title', None)
                    author = reader.metadata.get('/Author', None)
            except Exception as e2:
                raise FileError(
                    ErrorCodes.INVALID_REQUEST,
                    f"PDF解析失败: {str(e2)}"
                )
        
        full_text = '\n\n'.join(text_content)
        
        return {
            'text': full_text,
            'title': title or '未知标题',
            'author': author or '未知作者'
        }
    
    def _parse_word(self, file_path):
        """解析Word文件"""
        text_content = []
        title = None
        author = None
        
        try:
            from docx import Document
            
            doc = Document(file_path)
            
            for i, para in enumerate(doc.paragraphs):
                text = para.text.strip()
                if text:
                    text_content.append(text)
                    
                    # 第一个非空段落作为标题
                    if i == 0 and not title:
                        title = text[:100]
                    
                    # 尝试提取作者
                    if not author and ('分析师' in text or '研究员' in text or '作者' in text):
                        author = text[:50]
            
            # 尝试从文档属性获取信息
            if doc.core_properties:
                if doc.core_properties.title:
                    title = doc.core_properties.title
                if doc.core_properties.author:
                    author = doc.core_properties.author
                    
        except Exception as e:
            raise FileError(
                ErrorCodes.INVALID_REQUEST,
                f"Word解析失败: {str(e)}"
            )
        
        full_text = '\n\n'.join(text_content)
        
        return {
            'text': full_text,
            'title': title or '未知标题',
            'author': author or '未知作者'
        }


# 单例
file_service = FileService()
