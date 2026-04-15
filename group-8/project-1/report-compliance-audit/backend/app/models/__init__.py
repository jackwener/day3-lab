# -*- coding: utf-8 -*-
"""数据模型"""

from app.extensions import db
from app.models.review import Review
from app.models.issue import Issue
from app.models.rule import Rule

__all__ = ['db', 'Review', 'Issue', 'Rule']
