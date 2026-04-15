"""Category data model."""

from dataclasses import dataclass, asdict
from typing import Any


@dataclass
class Category:
    """Category entity representing a skill category.
    
    Attributes:
        key: Category key (English identifier)
        label: Display name (Chinese)
        count: Number of skills in this category (computed at runtime)
    """
    key: str
    label: str
    count: int = 0
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary.
        
        Returns:
            dict: Dictionary representation
        """
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Category":
        """Create Category from dictionary.
        
        Args:
            data: Dictionary containing category data
        
        Returns:
            Category: New Category instance
        """
        return cls(
            key=data.get("key", ""),
            label=data.get("label", ""),
            count=data.get("count", 0)
        )


# Default categories (whitelist)
DEFAULT_CATEGORIES = [
    Category("frontend", "前端开发"),
    Category("backend", "后端开发"),
    Category("devops", "DevOps"),
    Category("ai-ml", "AI / ML"),
    Category("database", "数据库"),
    Category("testing", "测试"),
    Category("security", "安全"),
    Category("mobile", "移动开发"),
    Category("tools", "效率工具"),
    Category("cloud", "云原生"),
    Category("bigdata", "大数据"),
    Category("coding", "写代码"),
    Category("ppt", "PPT"),
    Category("writing", "写作"),
    Category("other", "其它")
]

# Category whitelist key list (for backward compatibility)
CATEGORY_WHITELIST = [c.key for c in DEFAULT_CATEGORIES]


def is_valid_category(key: str) -> bool:
    """Check if category key is in whitelist.
    
    Args:
        key: Category key to check
    
    Returns:
        bool: True if valid category
    """
    return key in CATEGORY_WHITELIST
