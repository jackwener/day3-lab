# -*- coding: utf-8 -*-
"""审核问题模型"""

import uuid
from datetime import datetime
from app.extensions import db


class Issue(db.Model):
    """审核问题模型"""
    
    __tablename__ = 'issues'
    
    id = db.Column(db.String(20), primary_key=True)  # ISS-001 格式
    review_id = db.Column(db.String(20), db.ForeignKey('reviews.id'), nullable=False)
    rule_id = db.Column(db.String(20), nullable=False)  # 规则ID
    rule_name = db.Column(db.String(100), nullable=False)  # 规则名称
    category = db.Column(db.String(20), nullable=False)  # 问题类别: compliance/content
    severity = db.Column(db.String(5), nullable=False)  # 严重程度: P0/P1/P2
    
    # 问题详情
    location = db.Column(db.String(200), nullable=True)  # 问题位置描述
    excerpt = db.Column(db.Text, nullable=True)  # 问题内容摘录
    suggestion = db.Column(db.Text, nullable=True)  # 修改建议
    
    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'ruleId': self.rule_id,
            'ruleName': self.rule_name,
            'category': self.category,
            'severity': self.severity,
            'location': self.location,
            'excerpt': self.excerpt,
            'suggestion': self.suggestion,
        }
    
    @staticmethod
    def generate_id():
        """生成问题ID（基于 UUID 避免并发冲突）"""
        short = uuid.uuid4().hex[:8].upper()
        return f'ISS-{short}'
    
    def __repr__(self):
        return f'<Issue {self.id}>'
