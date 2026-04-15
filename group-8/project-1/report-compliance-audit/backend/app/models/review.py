# -*- coding: utf-8 -*-
"""审核记录模型"""

from datetime import datetime
from app.extensions import db


class Review(db.Model):
    """审核记录模型"""
    
    __tablename__ = 'reviews'
    
    id = db.Column(db.String(20), primary_key=True)  # RV-2026-0042 格式
    title = db.Column(db.String(500), nullable=True)  # 研报标题
    author = db.Column(db.String(100), nullable=True)  # 作者
    report_type = db.Column(db.String(50), nullable=False)  # 研报类型
    mode = db.Column(db.String(20), nullable=False)  # 审核模式: rule/ai/combined
    status = db.Column(db.String(20), nullable=False, default='pending')  # 审核状态
    score = db.Column(db.Integer, nullable=True)  # 综合评分 0-100
    
    # 文件相关
    file_path = db.Column(db.String(500), nullable=True)  # 文件存储路径
    file_name = db.Column(db.String(255), nullable=True)  # 原始文件名
    
    # 审核进度
    progress = db.Column(db.Integer, default=0)  # 进度百分比
    current_step = db.Column(db.String(100), nullable=True)  # 当前步骤
    
    # 问题统计
    compliance_issues = db.Column(db.Integer, default=0)  # 合规问题数
    content_issues = db.Column(db.Integer, default=0)  # 内容问题数
    
    # 时间戳
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)  # 提交时间
    completed_at = db.Column(db.DateTime, nullable=True)  # 完成时间
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联
    issues = db.relationship('Issue', backref='review', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'reportType': self.report_type,
            'mode': self.mode,
            'status': self.status,
            'score': self.score,
            'filePath': self.file_path,
            'fileName': self.file_name,
            'progress': self.progress,
            'currentStep': self.current_step,
            'complianceIssues': self.compliance_issues,
            'contentIssues': self.content_issues,
            'submittedAt': self.submitted_at.isoformat() + '+08:00' if self.submitted_at else None,
            'completedAt': self.completed_at.isoformat() + '+08:00' if self.completed_at else None,
        }
    
    def to_list_dict(self):
        """转换为列表字典（简化版）"""
        return {
            'id': self.id,
            'title': self.title,
            'author': self.author,
            'reportType': self.report_type,
            'mode': self.mode,
            'status': self.status,
            'score': self.score,
            'fileName': self.file_name,
            'complianceIssues': self.compliance_issues,
            'contentIssues': self.content_issues,
            'submittedAt': self.submitted_at.isoformat() + '+08:00' if self.submitted_at else None,
        }
    
    @staticmethod
    def generate_id():
        """生成审核记录ID"""
        year = datetime.now().year
        # 获取当年最大序号
        last_review = Review.query.filter(
            Review.id.like(f'RV-{year}-%')
        ).order_by(Review.id.desc()).first()
        
        if last_review:
            last_num = int(last_review.id.split('-')[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f'RV-{year}-{new_num:04d}'
    
    def __repr__(self):
        return f'<Review {self.id}>'
