"""
Demo Provider - 离线演示模式
当没有配置任何LLM密钥时，提供基础的问答回复
"""


class DemoProvider:
    """Demo模式Provider，纯字符串拼接返回"""
    
    def __init__(self):
        self.name = "demo"
    
    def ask(self, query: str) -> dict:
        """
        生成Demo回复
        
        Args:
            query: 用户提问
            
        Returns:
            {
                "answer": str,
                "llm_used": False,
                "model": None,
                "answer_source": "demo"
            }
        """
        # 生成Demo回复
        answer = self._generate_demo_answer(query)
        
        return {
            "answer": answer,
            "llm_used": False,
            "model": None,
            "answer_source": "demo"
        }
    
    def _generate_demo_answer(self, query: str) -> str:
        """生成Demo回复内容"""
        # 简单的关键词匹配回复
        query_lower = query.lower()
        
        if any(kw in query_lower for kw in ["你好", "hello", "hi"]):
            return "你好！我是投研问答助手（Demo模式）。由于当前未配置LLM服务，我只能提供有限的演示回复。"
        
        if any(kw in query_lower for kw in ["谢谢", "感谢"]):
            return "不客气！如需更智能的回复，请配置CoPaw或百炼服务。"
        
        if any(kw in query_lower for kw in ["研报", "行业", "分析"]):
            return "【Demo模式】我注意到您询问的是研报相关内容。在实际配置LLM服务后，我可以帮您：\n\n1. 抽取研报关键指标\n2. 对比多篇研报观点\n3. 归纳行业趋势\n\n请配置CoPaw或百炼服务以获得完整功能。"
        
        # 通用回复
        return f"【Demo模式】您的问题是：{query}\n\n当前处于离线演示模式。如需AI智能回复，请配置以下服务之一：\n\n- CoPaw桥接服务\n- 百炼(DashScope)服务\n\n配置方法请参考项目文档。"


# 全局Demo Provider实例
_demo_provider = None


def get_demo_provider() -> DemoProvider:
    """获取Demo Provider单例"""
    global _demo_provider
    if _demo_provider is None:
        _demo_provider = DemoProvider()
    return _demo_provider
