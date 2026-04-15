"""LLM service for draft generation and smart search."""

import json
import time
import uuid
from typing import Optional
from openai import OpenAI

from utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpen
from utils.trace import generate_trace_id


# Template draft for fallback
TEMPLATE_DRAFT = '''# {title}

## 概述

这是一个自动生成的技能模板。请根据您的需求进行修改。

## 使用说明

```bash
# 安装命令
pip install your-package
```

## 示例代码

```python
# 示例代码
print("Hello, World!")
```

## 注意事项

- 请确保已安装相关依赖
- 建议在虚拟环境中运行
'''


class LLMService:
    """Service for LLM operations (draft generation, smart search).
    
    Uses OpenAI-compatible API (DashScope/Qwen) with:
    - 8 second timeout
    - Circuit breaker for fault tolerance
    - Three-level fallback: LLM -> keyword fallback -> template
    """
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: int = 8
    ):
        """Initialize LLM service.
        
        Args:
            api_key: API key (defaults to env var LLM_API_KEY)
            base_url: API base URL (defaults to DashScope)
            model: Model name (defaults to qwen-plus)
            timeout: Request timeout in seconds
        """
        import os
        
        self.api_key = api_key or os.environ.get("LLM_API_KEY", "")
        self.base_url = base_url or os.environ.get(
            "LLM_BASE_URL",
            "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )
        self.model = model or os.environ.get("LLM_MODEL", "qwen-plus")
        self.timeout = timeout
        
        # Initialize client
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=self.timeout
        )
        
        # Initialize circuit breaker
        self.circuit_breaker = CircuitBreaker(
            failure_threshold=5,
            recovery_timeout=60,
            name="llm"
        )
    
    def _call_llm(
        self,
        messages: list[dict],
        response_format: Optional[dict] = None
    ) -> tuple[Optional[str], float]:
        """Call LLM with circuit breaker protection.
        
        Args:
            messages: Chat messages
            response_format: Optional response format (e.g., {"type": "json_object"})
        
        Returns:
            tuple: (response content, latency_ms)
        """
        start_time = time.time()
        
        try:
            kwargs = {
                "model": self.model,
                "messages": messages
            }
            
            if response_format:
                kwargs["response_format"] = response_format
            
            response = self.circuit_breaker.call(
                lambda: self.client.chat.completions.create(**kwargs)
            )
            
            latency_ms = (time.time() - start_time) * 1000
            content = response.choices[0].message.content
            
            return content, latency_ms
            
        except CircuitBreakerOpen:
            latency_ms = (time.time() - start_time) * 1000
            return None, latency_ms
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            return None, latency_ms
    
    def generate_draft(
        self,
        intent: str,
        category: Optional[str] = None
    ) -> dict:
        """Generate a skill.md draft from user intent.
        
        Args:
            intent: User's intent description (10-200 chars)
            category: Optional category hint
        
        Returns:
            dict: {
                skill_md_draft: str,
                fallback: bool,
                upstream_latency_ms: int
            }
        """
        # Build prompt
        category_hint = f"Category: {category}\n" if category else ""
        
        system_prompt = """You are a helpful assistant that generates skill.md files.
A skill.md file should be a well-formatted Markdown document with:
1. A clear H1 title
2. A brief overview section
3. Usage instructions
4. At least one code block with example commands or code
5. Any relevant notes or warnings

Output ONLY the markdown content, nothing else."""

        user_prompt = f"""{category_hint}Generate a skill.md file for the following intent:
{intent}

Requirements:
- Include a clear H1 title
- Include usage instructions
- Include at least one code block (```code```)
- Total length should be at least 100 characters
- Write in Chinese if the intent is in Chinese"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call LLM
        content, latency_ms = self._call_llm(messages)
        
        # Check if valid
        if content and self._validate_draft(content):
            return {
                "skill_md_draft": content,
                "fallback": False,
                "upstream_latency_ms": int(latency_ms)
            }
        
        # Fallback: use template
        title = intent[:50] + "..." if len(intent) > 50 else intent
        draft = TEMPLATE_DRAFT.format(title=title)
        
        return {
            "skill_md_draft": draft,
            "fallback": True,
            "upstream_latency_ms": 0
        }
    
    def _validate_draft(self, content: str) -> bool:
        """Validate draft content.
        
        Must have:
        - At least 100 characters
        - At least one H1 heading
        - At least one code fence
        
        Args:
            content: Draft content
        
        Returns:
            bool: True if valid
        """
        if len(content) < 100:
            return False
        
        # Check for H1
        if not any(line.startswith('# ') for line in content.split('\n')):
            return False
        
        # Check for code fence
        if '```' not in content:
            return False
        
        return True
    
    def smart_search(
        self,
        query: str,
        skills: list[dict],
        limit: int = 10
    ) -> dict:
        """Perform smart search using LLM.
        
        Args:
            query: Search query (1-200 chars)
            skills: List of available skills
            limit: Maximum results to return
        
        Returns:
            dict: {
                keywords: list[str],
                categories: list[str],
                items: list[dict],
                fallback: bool,
                upstream_latency_ms: int
            }
        """
        # Build prompt for keyword/category extraction
        system_prompt = """You are a search assistant. Extract keywords and relevant categories from the user's query.
Output valid JSON with the following structure:
{
    "keywords": ["keyword1", "keyword2"],
    "categories": ["category1"]
}

Available categories: frontend, backend, security, bigdata, coding, ppt, writing, other

Output ONLY the JSON, nothing else."""

        user_prompt = f"""Extract keywords and categories from this search query:
{query}"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # Call LLM for keywords/categories
        content, latency_ms = self._call_llm(
            messages,
            response_format={"type": "json_object"}
        )
        
        # Parse response
        keywords = []
        categories = []
        
        if content:
            try:
                parsed = json.loads(content)
                keywords = parsed.get("keywords", [])
                categories = parsed.get("categories", [])
            except json.JSONDecodeError:
                pass
        
        # If LLM failed, use query as keyword
        if not keywords:
            keywords = [query]
            fallback = True
        else:
            fallback = False
        
        # Perform local search
        items = self._local_search(skills, keywords, categories, limit)
        
        # Ensure at least 5 items (if enough data)
        if len(items) < 5 and len(skills) >= 5:
            # Add more items to reach 5
            existing_ids = {item.get("skill_id") for item in items}
            for skill in skills:
                if skill.get("skill_id") not in existing_ids:
                    skill_copy = skill.copy()
                    skill_copy["match_reason"] = "Recommended based on available content"
                    items.append(skill_copy)
                    if len(items) >= 5:
                        break
        
        # Generate match reasons if LLM available and not in fallback
        if not fallback and items:
            items = self._generate_match_reasons(query, items)
        
        return {
            "keywords": keywords,
            "categories": categories,
            "items": items[:limit],
            "fallback": fallback,
            "upstream_latency_ms": int(latency_ms) if content else 0
        }
    
    def _local_search(
        self,
        skills: list[dict],
        keywords: list[str],
        categories: list[str],
        limit: int
    ) -> list[dict]:
        """Perform local keyword/category search.
        
        Args:
            skills: List of skills to search
            keywords: Keywords to match
            categories: Categories to filter
            limit: Maximum results
        
        Returns:
            list: Matching skills with match counts
        """
        results = []
        
        for skill in skills:
            score = 0
            
            # Category match
            if categories and skill.get("category") in categories:
                score += 10
            
            # Keyword matches
            skill_text = " ".join([
                skill.get("name", ""),
                skill.get("description", ""),
                " ".join(skill.get("tags", []))
            ]).lower()
            
            for keyword in keywords:
                if keyword.lower() in skill_text:
                    score += 1
            
            if score > 0:
                skill_copy = skill.copy()
                skill_copy["_match_score"] = score
                results.append(skill_copy)
        
        # Sort by match score
        results.sort(key=lambda x: x.get("_match_score", 0), reverse=True)
        
        # Remove internal score
        for item in results:
            item.pop("_match_score", None)
        
        return results[:limit]
    
    def _generate_match_reasons(
        self,
        query: str,
        items: list[dict]
    ) -> list[dict]:
        """Generate match reasons for items using LLM.
        
        Args:
            query: Original query
            items: Items to generate reasons for
        
        Returns:
            list: Items with match_reason added
        """
        if not items:
            return items
        
        # Build prompt
        item_summaries = [
            f"- {item.get('name', 'Unknown')}: {item.get('description', '')}"
            for item in items[:5]  # Limit to top 5
        ]
        
        system_prompt = """You are a search result explainer. For each item, provide a brief (one sentence) explanation of why it matches the query.
Output valid JSON array:
[{"skill_id": "id", "match_reason": "reason"}, ...]"""

        user_prompt = f"""Query: {query}

Items:
{chr(10).join(item_summaries)}

Provide a brief match reason for each item."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        content, _ = self._call_llm(
            messages,
            response_format={"type": "json_object"}
        )
        
        # Parse and merge reasons
        reasons_map = {}
        if content:
            try:
                parsed = json.loads(content)
                # Handle both array and object with items
                reason_list = parsed if isinstance(parsed, list) else parsed.get("items", [])
                for item in reason_list:
                    reasons_map[item.get("skill_id")] = item.get("match_reason")
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Add reasons to items
        for item in items:
            skill_id = item.get("skill_id")
            item["match_reason"] = reasons_map.get(
                skill_id,
                "Matches your search criteria"
            )
        
        return items


# Global service instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """Get the global LLM service instance.
    
    Returns:
        LLMService: Global instance
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
