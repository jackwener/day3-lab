"""Skill data model."""

from dataclasses import dataclass, field, asdict
from typing import Optional, Any
from datetime import datetime, timezone


@dataclass
class Skill:
    """Skill entity representing a skill package.
    
    Attributes:
        skill_id: Unique identifier (sk_ + ULID)
        name: Display name (1-80 chars)
        author: Author name (1-50 chars)
        category: Category key from whitelist
        description: Short description (1-200 chars)
        install_command: CLI command to install/use
        skill_md: Raw markdown content
        skill_md_html: Sanitized HTML from markdown
        tags: List of tags (0-6 items)
        status: Status enum (pending/published/rejected)
        view_count: Number of views
        download_count: Number of downloads
        like_count: Number of likes
        favorite_count: Number of favorites
        rating_avg: Average rating (0-5)
        rating_count: Number of ratings
        hot_score: Computed hot score for ranking
        has_bundle: Whether ZIP bundle exists
        bundle_size: ZIP file size in bytes
        file_count: Number of files in bundle
        featured_weight: Weight for featured positioning
        created_at: Creation timestamp (ISO-8601)
        updated_at: Last update timestamp (ISO-8601)
    """
    skill_id: str
    name: str
    author: str
    category: str
    description: str
    install_command: str
    skill_md: str
    skill_md_html: str
    tags: list[str] = field(default_factory=list)
    status: str = "pending"
    view_count: int = 0
    download_count: int = 0
    like_count: int = 0
    favorite_count: int = 0
    rating_avg: float = 0.0
    rating_count: int = 0
    hot_score: float = 0.0
    has_bundle: bool = False
    bundle_size: Optional[int] = None
    file_count: Optional[int] = None
    featured_weight: int = 0
    created_at: str = ""
    updated_at: str = ""
    
    def __post_init__(self):
        """Set timestamps if not provided."""
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        if not self.updated_at:
            self.updated_at = self.created_at
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary.
        
        Returns:
            dict: Dictionary representation of the skill
        """
        return asdict(self)
    
    def to_summary(self) -> dict[str, Any]:
        """Convert to SkillSummary DTO for list responses.
        
        Returns:
            dict: SkillSummary DTO
        """
        return {
            "skill_id": self.skill_id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "tags": self.tags,
            "rating_avg": round(self.rating_avg, 2),
            "rating_count": self.rating_count,
            "view_count": self.view_count,
            "download_count": self.download_count,
            "like_count": self.like_count,
            "favorite_count": self.favorite_count,
            "hot_score": self.hot_score,
            "has_bundle": self.has_bundle,
            "updated_at": self.updated_at
        }
    
    def to_detail(self) -> dict[str, Any]:
        """Convert to detail DTO for detail responses.
        
        Returns:
            dict: Detail DTO including markdown content
        """
        summary = self.to_summary()
        summary.update({
            "skill_md": self.skill_md,
            "skill_md_html": self.skill_md_html,
            "created_at": self.created_at,
            "bundle_size": self.bundle_size,
            "file_count": self.file_count
        })
        return summary
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Skill":
        """Create Skill from dictionary.
        
        Args:
            data: Dictionary containing skill data
        
        Returns:
            Skill: New Skill instance
        """
        return cls(
            skill_id=data.get("skill_id", ""),
            name=data.get("name", ""),
            author=data.get("author", ""),
            category=data.get("category", ""),
            description=data.get("description", ""),
            install_command=data.get("install_command", ""),
            skill_md=data.get("skill_md", ""),
            skill_md_html=data.get("skill_md_html", ""),
            tags=data.get("tags", []),
            status=data.get("status", "pending"),
            view_count=data.get("view_count", 0),
            download_count=data.get("download_count", 0),
            like_count=data.get("like_count", 0),
            favorite_count=data.get("favorite_count", 0),
            rating_avg=data.get("rating_avg", 0.0),
            rating_count=data.get("rating_count", 0),
            hot_score=data.get("hot_score", 0.0),
            has_bundle=data.get("has_bundle", False),
            bundle_size=data.get("bundle_size"),
            file_count=data.get("file_count"),
            featured_weight=data.get("featured_weight", 0),
            created_at=data.get("created_at", ""),
            updated_at=data.get("updated_at", "")
        )


# Category whitelist - these are the only valid category keys
CATEGORY_WHITELIST = [
    "frontend",
    "backend",
    "devops",
    "ai-ml",
    "database",
    "testing",
    "security",
    "mobile",
    "tools",
    "cloud",
    "bigdata",
    "coding",
    "ppt",
    "writing",
    "other"
]

# Category labels mapping
CATEGORY_LABELS = {
    "frontend": "前端开发",
    "backend": "后端开发",
    "devops": "DevOps",
    "ai-ml": "AI / ML",
    "database": "数据库",
    "testing": "测试",
    "security": "安全",
    "mobile": "移动开发",
    "tools": "效率工具",
    "cloud": "云原生",
    "bigdata": "大数据",
    "coding": "写代码",
    "ppt": "PPT",
    "writing": "写作",
    "other": "其它"
}

# SkillSummary DTO fields
SKILL_SUMMARY_FIELDS = [
    "skill_id", "name", "description", "category", "tags",
    "rating_avg", "rating_count", "view_count", "download_count",
    "like_count", "favorite_count", "hot_score", "has_bundle", "updated_at",
]

# SkillDetail extra fields
SKILL_DETAIL_EXTRA_FIELDS = [
    "skill_md", "skill_md_html", "created_at", "bundle_size", "file_count",
]

# Allowed status values
VALID_STATUSES = {"pending", "published", "rejected"}

# Allowed sort options
VALID_SORT_OPTIONS = {"hot", "downloads", "rating", "latest"}


def is_valid_category(category: str) -> bool:
    """Check if category is in whitelist.
    
    Args:
        category: Category key to check
    
    Returns:
        bool: True if valid category
    """
    return category in CATEGORY_WHITELIST


def get_category_label(category: str) -> str:
    """Get display label for category.
    
    Args:
        category: Category key
    
    Returns:
        str: Display label
    """
    return CATEGORY_LABELS.get(category, category)


def new_skill_dict(
    skill_id: str,
    name: str,
    author: str,
    category: str,
    description: str,
    install_command: str,
    skill_md: str,
    skill_md_html: str,
    tags: list[str] | None = None,
    status: str = "pending",
    has_bundle: bool = False,
    bundle_size: int | None = None,
    file_count: int | None = None,
    featured_weight: int = 0,
) -> dict:
    """Create a complete Skill dict with default values."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "skill_id": skill_id,
        "name": name,
        "author": author,
        "category": category,
        "description": description,
        "install_command": install_command,
        "skill_md": skill_md,
        "skill_md_html": skill_md_html,
        "tags": tags or [],
        "status": status,
        "view_count": 0,
        "download_count": 0,
        "like_count": 0,
        "favorite_count": 0,
        "rating_avg": 0.0,
        "rating_count": 0,
        "hot_score": 0.0,
        "has_bundle": has_bundle,
        "bundle_size": bundle_size,
        "file_count": file_count,
        "featured_weight": featured_weight,
        "created_at": now,
        "updated_at": now,
    }


def to_summary(skill: dict) -> dict:
    """Convert complete Skill dict to SkillSummary DTO."""
    result = {k: skill[k] for k in SKILL_SUMMARY_FIELDS if k in skill}
    result["rating_avg"] = round(float(result.get("rating_avg", 0)), 2)
    return result


def to_detail(skill: dict) -> dict:
    """Convert complete Skill dict to SkillDetail DTO."""
    fields = SKILL_SUMMARY_FIELDS + SKILL_DETAIL_EXTRA_FIELDS
    result = {k: skill[k] for k in fields if k in skill}
    result["rating_avg"] = round(float(result.get("rating_avg", 0)), 2)
    return result
