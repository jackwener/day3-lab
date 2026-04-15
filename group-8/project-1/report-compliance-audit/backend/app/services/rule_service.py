# -*- coding: utf-8 -*-
"""规则服务"""

import json
from app.extensions import db
from app.models import Rule, Issue
from app.utils.errors import NotFoundError


# 内置规则定义
BUILTIN_RULES = [
    {
        'id': 'R-C-01',
        'name': '敏感信息泄露检测',
        'category': 'compliance',
        'severity': 'P0',
        'mode': ['ai', 'combined'],
        'description': '检测研报中是否包含未公开的内幕信息、客户持仓明细、未披露的重大事项等敏感内容',
        'example': '未公开的内幕信息、客户持仓明细、未披露的重大事项',
        'enabled': True
    },
    {
        'id': 'R-C-02',
        'name': '政治敏感词检测',
        'category': 'compliance',
        'severity': 'P1',
        'mode': ['rule', 'combined'],
        'description': '检测涉及政治人物的敏感表述、不当政治评论等内容',
        'example': '涉及政治人物的敏感表述、不当政治评论',
        'enabled': True
    },
    {
        'id': 'R-C-03',
        'name': '内幕信息检测',
        'category': 'compliance',
        'severity': 'P0',
        'mode': ['ai', 'combined'],
        'description': '检测可能涉及内幕交易的信息，如未公开的业绩数据、重大合同等',
        'example': '未公开的业绩数据、重大合同、并购信息',
        'enabled': True
    },
    {
        'id': 'R-CO-01',
        'name': '风险提示完整性',
        'category': 'content',
        'severity': 'P0',
        'mode': ['ai', 'combined'],
        'description': '检查研报是否包含明确且全面的风险提示段落，覆盖主要风险类型',
        'example': '研报必须包含明确的风险提示段落',
        'enabled': True
    },
    {
        'id': 'R-CO-02',
        'name': '数据来源标注',
        'category': 'content',
        'severity': 'P1',
        'mode': ['rule', 'ai', 'combined'],
        'description': '检查研报中的数据是否标注了来源，确保数据可追溯',
        'example': '数据来源需标注出处，如"根据Wind数据..."',
        'enabled': True
    },
    {
        'id': 'R-CO-03',
        'name': '投资评级一致性',
        'category': 'content',
        'severity': 'P2',
        'mode': ['rule', 'ai', 'combined'],
        'description': '检查研报中的投资评级在全文中是否一致',
        'example': '买入/增持/中性/减持评级需全文一致',
        'enabled': True
    },
    {
        'id': 'R-CO-04',
        'name': '诱导性语言检测',
        'category': 'content',
        'severity': 'P0',
        'mode': ['ai', 'combined'],
        'description': '检测研报中是否存在诱导性、夸张性语言，如"确定上涨"、"必涨"等',
        'example': '确定上涨、必涨、稳赚不赔等诱导性表述',
        'enabled': True
    },
    {
        'id': 'R-CO-05',
        'name': '分析师信息披露',
        'category': 'content',
        'severity': 'P1',
        'mode': ['rule', 'combined'],
        'description': '检查研报是否包含分析师执业证书编号、利益冲突声明等信息',
        'example': '分析师执业证书编号、利益冲突声明',
        'enabled': True
    }
]


class RuleService:
    """规则服务"""
    
    def __init__(self):
        pass
    
    def init_builtin_rules(self):
        """初始化内置规则"""
        for rule_data in BUILTIN_RULES:
            existing = Rule.query.get(rule_data['id'])
            if not existing:
                rule = Rule(
                    id=rule_data['id'],
                    name=rule_data['name'],
                    category=rule_data['category'],
                    severity=rule_data['severity'],
                    mode=json.dumps(rule_data['mode']),
                    description=rule_data['description'],
                    example=rule_data['example'],
                    enabled=rule_data['enabled']
                )
                db.session.add(rule)
        
        db.session.commit()
    
    def get_rules(self, category=None, enabled=None):
        """获取规则列表"""
        query = Rule.query
        
        if category:
            query = query.filter(Rule.category == category)
        if enabled is not None:
            query = query.filter(Rule.enabled == enabled)
        
        return query.all()
    
    def get_rule(self, rule_id):
        """获取单个规则"""
        rule = Rule.query.get(rule_id)
        if not rule:
            raise NotFoundError("规则", rule_id)
        return rule
    
    def update_rule(self, rule_id, enabled):
        """更新规则状态"""
        rule = self.get_rule(rule_id)
        rule.enabled = enabled
        db.session.commit()
        return rule
    
    def execute_rules(self, content, mode):
        """执行规则检查
        
        Args:
            content: 研报文本内容
            mode: 审核模式 (rule/ai/combined)
            
        Returns:
            list: Issue 列表
        """
        issues = []
        
        # 获取适用的规则
        rules = self._get_applicable_rules(mode)
        
        for rule in rules:
            if not rule.enabled:
                continue
            
            # 根据规则类型执行检查
            rule_issues = self._execute_single_rule(content, rule)
            issues.extend(rule_issues)
        
        return issues
    
    def _get_applicable_rules(self, mode):
        """获取适用的规则"""
        rules = Rule.query.filter(Rule.enabled == True).all()
        
        applicable = []
        for rule in rules:
            rule_modes = json.loads(rule.mode) if isinstance(rule.mode, str) else rule.mode
            if mode in rule_modes:
                applicable.append(rule)
        
        return applicable
    
    def _execute_single_rule(self, content, rule):
        """执行单个规则检查"""
        issues = []
        
        if rule.id == 'R-C-02':  # 政治敏感词检测
            issues.extend(self._check_political_sensitive(content, rule))
        elif rule.id == 'R-CO-01':  # 风险提示完整性
            issues.extend(self._check_risk_disclosure(content, rule))
        elif rule.id == 'R-CO-02':  # 数据来源标注
            issues.extend(self._check_data_source(content, rule))
        elif rule.id == 'R-CO-03':  # 投资评级一致性
            issues.extend(self._check_rating_consistency(content, rule))
        elif rule.id == 'R-CO-05':  # 分析师信息披露
            issues.extend(self._check_analyst_info(content, rule))
        # 其他规则由AI检测
        
        return issues
    
    def _check_political_sensitive(self, content, rule):
        """检测政治敏感词"""
        issues = []
        
        # 敏感词列表（示例）
        sensitive_words = [
            '政治', '政府', '领导', '中央', '党',
        ]
        
        for word in sensitive_words:
            if word in content:
                # 找到位置
                idx = content.find(word)
                context = content[max(0, idx-20):idx+50]
                
                issue = Issue(
                    id=Issue.generate_id(),
                    rule_id=rule.id,
                    rule_name=rule.name,
                    category=rule.category,
                    severity=rule.severity,
                    location=f"第{content[:idx].count(chr(10))+1}行附近",
                    excerpt=f"...{context}...",
                    suggestion="请检查该表述是否适当，避免涉及政治敏感内容"
                )
                issues.append(issue)
        
        return issues
    
    def _check_risk_disclosure(self, content, rule):
        """检测风险提示完整性"""
        issues = []
        
        # 检查是否包含风险提示章节
        risk_keywords = ['风险提示', '风险因素', '风险说明', '投资风险']
        has_risk = any(kw in content for kw in risk_keywords)
        
        if not has_risk:
            issue = Issue(
                id=Issue.generate_id(),
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                severity=rule.severity,
                location="全文末尾",
                excerpt="报告缺少独立的「风险提示」章节",
                suggestion="在报告末尾增加完整的风险提示段落，涵盖行业风险、政策风险与市场波动风险"
            )
            issues.append(issue)
        
        return issues
    
    def _check_data_source(self, content, rule):
        """检测数据来源标注"""
        issues = []
        
        # 检查是否包含数据来源标注
        source_keywords = ['来源：', '数据来源：', '根据', '据统计', 'Wind', 'Bloomberg']
        paragraphs = content.split('\n\n')
        
        for i, para in enumerate(paragraphs):
            # 如果段落包含数字数据但没有来源标注
            has_numbers = any(c.isdigit() for c in para)
            has_source = any(kw in para for kw in source_keywords)
            
            if has_numbers and not has_source and len(para) > 50:
                issue = Issue(
                    id=Issue.generate_id(),
                    rule_id=rule.id,
                    rule_name=rule.name,
                    category=rule.category,
                    severity=rule.severity,
                    location=f"第{i+1}段",
                    excerpt=para[:100] + "...",
                    suggestion="请标注数据来源，如'根据Wind数据...'"
                )
                issues.append(issue)
                break  # 只报告一个
        
        return issues
    
    def _check_rating_consistency(self, content, rule):
        """检测投资评级一致性"""
        issues = []
        
        # 提取所有评级词汇
        ratings = ['买入', '增持', '中性', '减持', '卖出', '强烈推荐', '推荐']
        found_ratings = set()
        
        for rating in ratings:
            if rating in content:
                found_ratings.add(rating)
        
        # 如果存在多个不同的评级
        if len(found_ratings) > 1:
            issue = Issue(
                id=Issue.generate_id(),
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                severity=rule.severity,
                location="全文",
                excerpt=f"发现多个不同的投资评级: {', '.join(found_ratings)}",
                suggestion="请确保全文投资评级表述一致"
            )
            issues.append(issue)
        
        return issues
    
    def _check_analyst_info(self, content, rule):
        """检测分析师信息披露"""
        issues = []
        
        # 检查是否包含分析师执业信息
        has_cert = '执业证书' in content or '执业编号' in content or '证书编号' in content
        has_conflict = '利益冲突' in content or '无利益冲突' in content
        
        if not has_cert:
            issue = Issue(
                id=Issue.generate_id(),
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                severity=rule.severity,
                location="文末",
                excerpt="缺少分析师执业证书编号",
                suggestion="请在文末添加分析师执业证书编号"
            )
            issues.append(issue)
        
        if not has_conflict:
            issue = Issue(
                id=Issue.generate_id(),
                rule_id=rule.id,
                rule_name=rule.name,
                category=rule.category,
                severity='P2',  # 降级
                location="文末",
                excerpt="缺少利益冲突声明",
                suggestion="请在文末添加利益冲突声明"
            )
            issues.append(issue)
        
        return issues


# 单例
rule_service = RuleService()
