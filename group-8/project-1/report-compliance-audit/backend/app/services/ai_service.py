# -*- coding: utf-8 -*-
"""AI服务抽象层"""

import os
import logging
from abc import ABC, abstractmethod
from app.models import Issue

logger = logging.getLogger(__name__)


class AIServiceInterface(ABC):
    """AI服务接口"""
    
    @abstractmethod
    def analyze(self, content: str, review_id: str) -> list:
        """分析内容，返回问题列表"""
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """检查服务是否可用"""
        pass


class MockAIService(AIServiceInterface):
    """Mock AI服务（测试用）"""
    
    def analyze(self, content: str, review_id: str) -> list:
        """模拟分析"""
        issues = []
        
        # 检测诱导性语言
        misleading_phrases = [
            ('确定上涨', '诱导性表述'),
            ('必涨', '诱导性表述'),
            ('稳赚', '诱导性表述'),
            ('无风险', '误导性表述'),
            ('零风险', '误导性表述'),
            ('强烈推荐买入', '诱导性表述'),
            ('立即买入', '诱导性表述'),
            ('不容错过', '诱导性表述'),
        ]
        
        for phrase, desc in misleading_phrases:
            if phrase in content:
                idx = content.find(phrase)
                context = content[max(0, idx-30):idx+50]
                
                issue = Issue(
                    id=Issue.generate_id(),
                    review_id=review_id,
                    rule_id='R-CO-04',
                    rule_name='诱导性语言检测',
                    category='content',
                    severity='P0',
                    location=f"第{content[:idx].count(chr(10))+1}行附近",
                    excerpt=f"...{context}...",
                    suggestion=f"请修改{desc}，使用客观中立的语言"
                )
                issues.append(issue)
        
        # 检测敏感信息
        sensitive_patterns = [
            ('内幕消息', '敏感信息'),
            ('未公开', '未公开信息'),
            ('据内部人士', '信息来源不明确'),
        ]
        
        for pattern, desc in sensitive_patterns:
            if pattern in content:
                idx = content.find(pattern)
                context = content[max(0, idx-30):idx+50]
                
                issue = Issue(
                    id=Issue.generate_id(),
                    review_id=review_id,
                    rule_id='R-C-01',
                    rule_name='敏感信息泄露检测',
                    category='compliance',
                    severity='P0',
                    location=f"第{content[:idx].count(chr(10))+1}行附近",
                    excerpt=f"...{context}...",
                    suggestion=f"请检查是否涉及{desc}"
                )
                issues.append(issue)
        
        return issues
    
    def is_available(self) -> bool:
        return True


class BailianAIService(AIServiceInterface):
    """百炼AI服务"""
    
    def __init__(self):
        self.api_key = os.getenv('DASHSCOPE_API_KEY')
        self.model = os.getenv('AI_MODEL', 'qwen-plus')
    
    def analyze(self, content: str, review_id: str) -> list:
        """使用百炼API分析内容"""
        if not self.api_key:
            logger.warning("DASHSCOPE_API_KEY未配置，跳过AI分析")
            return []
        
        try:
            import dashscope
            from dashscope import Generation
            
            # 截取内容（避免超长）
            max_length = 8000
            if len(content) > max_length:
                content = content[:max_length] + "..."
            
            prompt = f"""请分析以下研报内容，找出可能存在的合规问题。重点关注：
1. 诱导性语言：如"确定上涨"、"必涨"、"稳赚"等夸大性表述
2. 敏感信息：如内幕消息、未公开信息等
3. 风险提示缺失：是否有完整的风险提示章节
4. 数据来源：数据是否标注来源
5. 利益冲突：是否披露利益冲突

研报内容：
{content}

请以JSON格式返回发现的问题，格式如下：
[
  {{
    "ruleId": "规则ID",
    "ruleName": "规则名称", 
    "category": "compliance或content",
    "severity": "P0/P1/P2",
    "location": "位置描述",
    "excerpt": "问题内容摘录",
    "suggestion": "修改建议"
  }}
]

如果没有发现问题，返回空数组 []
"""
            
            response = Generation.call(
                model=self.model,
                prompt=prompt,
                api_key=self.api_key
            )
            
            if response.status_code == 200:
                result_text = response.output.text
                
                # 解析JSON
                import json
                import re
                
                # 提取JSON数组
                match = re.search(r'\[[\s\S]*\]', result_text)
                if match:
                    issues_data = json.loads(match.group())
                    issues = []
                    
                    for item in issues_data:
                        issue = Issue(
                            id=Issue.generate_id(),
                            review_id=review_id,
                            rule_id=item.get('ruleId', 'R-C-01'),
                            rule_name=item.get('ruleName', 'AI检测问题'),
                            category=item.get('category', 'content'),
                            severity=item.get('severity', 'P1'),
                            location=item.get('location', ''),
                            excerpt=item.get('excerpt', ''),
                            suggestion=item.get('suggestion', '')
                        )
                        issues.append(issue)
                    
                    return issues
            
            logger.warning(f"百炼API调用失败: {response.code} - {response.message}")
            return []
            
        except Exception as e:
            logger.error(f"百炼API调用异常: {str(e)}")
            return []
    
    def is_available(self) -> bool:
        return bool(self.api_key)


class AIService:
    """AI服务门面"""
    
    def __init__(self):
        self.bailian = BailianAIService()
        self.mock = MockAIService()
    
    def analyze(self, content: str, review_id: str) -> list:
        """分析内容，优先使用百炼，失败则使用Mock"""
        if self.bailian.is_available():
            issues = self.bailian.analyze(content, review_id)
            if issues:
                return issues
        
        # 降级到Mock
        return self.mock.analyze(content, review_id)
    
    def is_available(self) -> bool:
        return self.bailian.is_available()


# 单例
ai_service = AIService()
