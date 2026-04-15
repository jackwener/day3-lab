# -*- coding: utf-8 -*-
"""审核规则模型"""

from datetime import datetime
from app.extensions import db


class Rule(db.Model):
    """审核规则模型"""
    
    __tablename__ = 'rules'
    
    id = db.Column(db.String(20), primary_key=True)  # R-C-01 格式
    name = db.Column(db.String(100), nullable=False)  # 规则名称
    category = db.Column(db.String(20), nullable=False)  # 规则类别: compliance/content
    severity = db.Column(db.String(5), nullable=False)  # 严重程度: P0/P1/P2
    mode = db.Column(db.Text, nullable=False)  # 适用审核模式 JSON数组
    
    # 规则详情
    description = db.Column(db.Text, nullable=True)  # 规则描述
    example = db.Column(db.Text, nullable=True)  # 示例违规内容
    
    # 状态
    enabled = db.Column(db.Boolean, default=True)  # 是否启用
    
    # 时间戳
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """转换为字典"""
        import json
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'severity': self.severity,
            'mode': json.loads(self.mode) if isinstance(self.mode, str) else self.mode,
            'description': self.description,
            'example': self.example,
            'enabled': self.enabled,
        }
    
    def __repr__(self):
        return f'<Rule {self.id}>'
