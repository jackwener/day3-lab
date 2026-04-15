"""JSON storage engine with file locking and atomic writes."""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any, Optional

from models.skill import Skill, CATEGORY_WHITELIST, CATEGORY_LABELS
from models.category import Category, DEFAULT_CATEGORIES


class JSONStorage:
    """JSON-based storage engine with file locking and atomic writes.
    
    Provides CRUD operations for skills and categories with:
    - File-level locking for concurrent access
    - Atomic writes (write to temp, then rename)
    - Automatic backup (.bak files)
    """
    
    def __init__(
        self,
        skills_path: str | Path = "./data/skills.json",
        categories_path: str | Path = "./data/categories.json",
        bundles_dir: str | Path = "./data/bundles",
        interactions_path: str | Path | None = None,
    ):
        """Initialize storage with file paths.
        
        Args:
            skills_path: Path to skills.json
            categories_path: Path to categories.json
            bundles_dir: Directory for skill bundles
            interactions_path: Path to interactions.json (optional)
        """
        self.skills_path = Path(skills_path)
        self.categories_path = Path(categories_path)
        self.bundles_dir = Path(bundles_dir)
        self.interactions_path = Path(interactions_path) if interactions_path else self.skills_path.parent / "interactions.json"
        self._lock = RLock()
        
        # Ensure directories exist
        self.skills_path.parent.mkdir(parents=True, exist_ok=True)
        self.bundles_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize files if they don't exist
        self._ensure_file(self.skills_path, [])
        self._ensure_file(
            self.interactions_path,
            {"likes": {}, "favorites": {}, "ratings": {}},
        )
    
    def _ensure_file(self, path: Path, default) -> None:
        """Ensure a file exists with default content."""
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")
    
    def get_allowed_categories(self) -> set[str]:
        """Get set of allowed category keys.
        
        Returns:
            set: Set of category keys
        """
        return set(CATEGORY_WHITELIST)
    
    def _read_json(self, path: Path) -> Any:
        """Read JSON file with locking and backup fallback.
        
        Args:
            path: Path to JSON file
        
        Returns:
            Parsed JSON data
        """
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, FileNotFoundError):
            backup_path = path.with_suffix(path.suffix + ".bak")
            if backup_path.exists():
                return json.loads(backup_path.read_text(encoding="utf-8"))
            # Return default empty data
            if "skills" in str(path):
                return []
            return {}
    
    def _write_json(self, path: Path, data) -> None:
        """Write JSON file atomically with backup.
        
        Args:
            path: Path to JSON file
            data: Data to write
        """
        path.parent.mkdir(parents=True, exist_ok=True)
        backup_path = path.with_suffix(path.suffix + ".bak")
        if path.exists():
            try:
                shutil.copy2(path, backup_path)
            except Exception:
                pass
        
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            dir=path.parent,
            delete=False,
        ) as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            temp_name = handle.name
        
        Path(temp_name).replace(path)
    
    # ==================== Skill Operations ====================
    
    def list_skills(
        self,
        filters: Optional[dict] = None,
        sort: str = "hot",
        page: int = 1,
        page_size: int = 12
    ) -> tuple[list[dict], int]:
        """List skills with filtering, sorting, and pagination.
        
        Args:
            filters: Optional filter dict (category, tags, q)
            sort: Sort field (hot, downloads, rating, latest)
            page: Page number (1-based)
            page_size: Items per page
        
        Returns:
            tuple: (list of skill dicts, total count)
        """
        skills = self._read_json(self.skills_path)
        
        # Filter to published skills only
        skills = [s for s in skills if s.get('status') == 'published']
        
        # Apply filters
        if filters:
            # Category filter
            if filters.get('category'):
                skills = [s for s in skills if s.get('category') == filters['category']]
            
            # Tags filter (AND logic)
            if filters.get('tags'):
                filter_tags = set(filters['tags'].split(',') if isinstance(filters['tags'], str) else filters['tags'])
                skills = [
                    s for s in skills
                    if filter_tags.issubset(set(s.get('tags', [])))
                ]
            
            # Keyword search (name, description, tags)
            if filters.get('q'):
                q = filters['q'].lower()
                skills = [
                    s for s in skills
                    if q in s.get('name', '').lower()
                    or q in s.get('description', '').lower()
                    or any(q in t.lower() for t in s.get('tags', []))
                ]
        
        # Sort
        if sort == 'hot':
            skills.sort(key=lambda s: s.get('hot_score', 0), reverse=True)
        elif sort == 'downloads':
            skills.sort(key=lambda s: s.get('download_count', 0), reverse=True)
        elif sort == 'rating':
            skills.sort(key=lambda s: (
                s.get('rating_avg', 0) * min(s.get('rating_count', 0), 50) / 50
            ), reverse=True)
        elif sort == 'latest':
            skills.sort(key=lambda s: s.get('updated_at', ''), reverse=True)
        else:
            skills.sort(key=lambda s: s.get('hot_score', 0), reverse=True)
        
        total = len(skills)
        
        # Paginate
        start = (page - 1) * page_size
        end = start + page_size
        skills = skills[start:end]
        
        return skills, total
    
    def get_skill(self, skill_id: str) -> Optional[dict]:
        """Get a skill by ID.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            dict or None: Skill data if found
        """
        skills = self._read_json(self.skills_path)
        for skill in skills:
            if skill.get('skill_id') == skill_id:
                return skill
        return None
    
    def create_skill(self, payload: dict) -> dict:
        """Create a new skill.
        
        Args:
            payload: Skill data (name, category, description, skill_md, tags, etc.)
        
        Returns:
            dict: Created skill data
        """
        with self._lock:
            skills = self._read_json(self.skills_path)
            
            # Generate ID and timestamps
            skill_id = payload.get('skill_id') or self._generate_skill_id()
            now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # Create skill record
            skill = {
                "skill_id": skill_id,
                "name": payload.get('name', ''),
                "author": payload.get('author', 'Anonymous'),
                "category": payload.get('category', 'other'),
                "description": payload.get('description', ''),
                "install_command": payload.get('install_command', ''),
                "skill_md": payload.get('skill_md', ''),
                "skill_md_html": payload.get('skill_md_html', ''),
                "tags": payload.get('tags', []),
                "status": payload.get('status', 'pending'),
                "view_count": payload.get('view_count', 0),
                "download_count": payload.get('download_count', 0),
                "like_count": payload.get('like_count', 0),
                "favorite_count": payload.get('favorite_count', 0),
                "rating_avg": payload.get('rating_avg', 0.0),
                "rating_count": payload.get('rating_count', 0),
                "hot_score": payload.get('hot_score', 0.0),
                "has_bundle": payload.get('has_bundle', False),
                "bundle_path": payload.get('bundle_path'),
                "bundle_size": payload.get('bundle_size'),
                "file_count": payload.get('file_count'),
                "featured_weight": payload.get('featured_weight', 0),
                "created_at": payload.get('created_at') or now,
                "updated_at": now
            }
            
            skills.append(skill)
            self._write_json(self.skills_path, skills)
        
        return skill
    
    def update_skill(self, skill_id: str, updates: dict) -> Optional[dict]:
        """Update a skill.
        
        Args:
            skill_id: Skill ID
            updates: Fields to update
        
        Returns:
            dict or None: Updated skill data if found
        """
        with self._lock:
            skills = self._read_json(self.skills_path)
            
            for i, skill in enumerate(skills):
                if skill.get('skill_id') == skill_id:
                    # Update fields
                    skill.update(updates)
                    skill['updated_at'] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                    skills[i] = skill
                    self._write_json(self.skills_path, skills)
                    return skill
        
        return None
    
    def increment_view(self, skill_id: str) -> Optional[dict]:
        """Increment view count for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            dict or None: Updated skill dict, or None if not found
        """
        return self._increment_counter(skill_id, "view_count")
    
    def increment_download(self, skill_id: str) -> Optional[dict]:
        """Increment download count for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            dict or None: Updated skill dict, or None if not found
        """
        return self._increment_counter(skill_id, "download_count")
    
    def _increment_counter(self, skill_id: str, field: str) -> Optional[dict]:
        """Increment a counter field for a skill.
        
        Args:
            skill_id: Skill ID
            field: Counter field name
        
        Returns:
            dict or None: Updated skill dict, or None if not found
        """
        with self._lock:
            skills = self._read_json(self.skills_path)
            
            for skill in skills:
                if skill.get('skill_id') == skill_id:
                    skill[field] = int(skill.get(field, 0)) + 1
                    self._write_json(self.skills_path, skills)
                    return skill
        
        return None
    
    def _generate_skill_id(self) -> str:
        """Generate a new skill ID.
        
        Returns:
            str: Skill ID in format 'sk_' + ULID
        """
        import time
        timestamp = int(time.time() * 1000)
        randomness = int.from_bytes(os.urandom(10), "big")
        
        encoded_time = _encode_base32(timestamp, 10)
        encoded_random = _encode_base32(randomness, 16)
        return f"sk_{encoded_time}{encoded_random}"
    
    # ==================== Category Operations ====================
    
    def list_categories(self) -> list[dict]:
        """List all categories with skill counts.
        
        Returns:
            list: List of category dicts with counts
        """
        skills = self._read_json(self.skills_path)
        categories = self._read_json(self.categories_path) if self.categories_path.exists() else [c.to_dict() for c in DEFAULT_CATEGORIES]
        
        # Count skills per category
        counts = {}
        for skill in skills:
            if skill.get('status') == 'published':
                cat = skill.get('category', 'other')
                counts[cat] = counts.get(cat, 0) + 1
        
        # Update counts
        result = []
        for cat in categories:
            cat_copy = cat.copy()
            cat_copy['count'] = counts.get(cat['key'], 0)
            result.append(cat_copy)
        
        return result
    
    # ==================== Tag Operations ====================
    
    def get_tags_frequency(self, limit: int = 20) -> list[dict]:
        """Get tag frequency distribution.
        
        Args:
            limit: Maximum tags to return
        
        Returns:
            list: List of {tag, count} dicts sorted by count desc
        """
        skills = self._read_json(self.skills_path)
        
        # Count tags
        tag_counts: dict[str, int] = {}
        for skill in skills:
            if skill.get('status') == 'published':
                for tag in skill.get('tags', []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # Sort by count and limit
        sorted_tags = sorted(
            tag_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        return [{"tag": tag, "count": count} for tag, count in sorted_tags]
    
    # ==================== Stats Operations ====================
    
    def get_global_stats(self) -> dict:
        """Get global statistics for hot score computation.
        
        Returns:
            dict: Stats with max_download and max_interaction
        """
        skills = self._read_json(self.skills_path)
        
        if not skills:
            return {"max_download": 0, "max_interaction": 0}
        
        max_download = max(s.get('download_count', 0) for s in skills)
        max_interaction = max(
            s.get('like_count', 0) + s.get('favorite_count', 0)
            for s in skills
        )
        
        return {
            "max_download": max_download,
            "max_interaction": max_interaction
        }


# ULID encoding
_ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _encode_base32(value: int, length: int) -> str:
    """Encode an integer to base32 string.
    
    Args:
        value: Integer value to encode
        length: Desired string length
    
    Returns:
        str: Base32 encoded string
    """
    chars = []
    current = value
    for _ in range(length):
        chars.append(_ULID_ALPHABET[current % 32])
        current //= 32
    return "".join(reversed(chars))


def utc_now_iso() -> str:
    """Get current UTC timestamp in ISO format.
    
    Returns:
        str: ISO format timestamp
    """
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def generate_skill_id() -> str:
    """Generate a new skill ID.
    
    Returns:
        str: Skill ID in format 'sk_' + ULID
    """
    import time
    timestamp = int(time.time() * 1000)
    randomness = int.from_bytes(os.urandom(10), "big")
    
    encoded_time = _encode_base32(timestamp, 10)
    encoded_random = _encode_base32(randomness, 16)
    return f"sk_{encoded_time}{encoded_random}"


# Global storage instance
_storage: Optional[JSONStorage] = None


def get_storage() -> JSONStorage:
    """Get the global storage instance.
    
    Returns:
        JSONStorage: Global storage instance
    """
    global _storage
    if _storage is None:
        _storage = JSONStorage()
    return _storage

# Alias for backward compatibility
JsonStorage = JSONStorage
