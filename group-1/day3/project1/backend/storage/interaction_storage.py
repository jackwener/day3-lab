"""Interaction storage for likes, favorites, and ratings."""

import json
import os
import shutil
from pathlib import Path
from threading import RLock
from typing import Optional
from datetime import datetime


class InteractionStorage:
    """Storage for user interactions (likes, favorites, ratings).
    
    Data structure:
    {
        "likes": {
            "<skill_id>": ["visitor_1", "visitor_2"]
        },
        "favorites": {
            "<skill_id>": {
                "visitor_1": "2026-04-15T10:00:00Z"
            }
        },
        "ratings": {
            "<skill_id>": {
                "visitor_1": 5,
                "visitor_2": 4
            }
        }
    }
    """
    
    def __init__(self, path: str = "./data/interactions.json"):
        """Initialize interaction storage.
        
        Args:
            path: Path to interactions.json
        """
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = RLock()
        self._init_file()
    
    def _init_file(self) -> None:
        """Initialize file if it doesn't exist."""
        if not self.path.exists():
            self._write_data({
                "likes": {},
                "favorites": {},
                "ratings": {}
            })
    
    def _read_data(self) -> dict:
        """Read interaction data with locking.
        
        Returns:
            dict: Interaction data
        """
        backup_path = self.path.with_suffix('.json.bak')
        
        try:
            with self._lock:
                return json.loads(self.path.read_text(encoding='utf-8'))
        except (json.JSONDecodeError, FileNotFoundError):
            if backup_path.exists():
                return json.loads(backup_path.read_text(encoding='utf-8'))
            return {"likes": {}, "favorites": {}, "ratings": {}}
    
    def _write_data(self, data: dict) -> None:
        """Write interaction data atomically.
        
        Args:
            data: Data to write
        """
        backup_path = self.path.with_suffix('.json.bak')
        temp_path = self.path.with_suffix('.json.tmp')
        
        with self._lock:
            # Create backup
            if self.path.exists():
                try:
                    shutil.copy2(self.path, backup_path)
                except Exception:
                    pass
            
            # Write to temp then atomic rename
            temp_path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding='utf-8'
            )
            os.replace(temp_path, self.path)
    
    # ==================== Like Operations ====================
    
    def add_like(self, skill_id: str, visitor_id: str) -> bool:
        """Add a like (idempotent).
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if like was added, False if already liked
        """
        data = self._read_data()
        
        if skill_id not in data["likes"]:
            data["likes"][skill_id] = []
        
        if visitor_id in data["likes"][skill_id]:
            return False  # Already liked
        
        data["likes"][skill_id].append(visitor_id)
        self._write_data(data)
        return True
    
    def remove_like(self, skill_id: str, visitor_id: str) -> bool:
        """Remove a like (idempotent).
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if like was removed, False if not liked
        """
        data = self._read_data()
        
        if skill_id not in data["likes"]:
            return False
        
        if visitor_id not in data["likes"][skill_id]:
            return False
        
        data["likes"][skill_id].remove(visitor_id)
        self._write_data(data)
        return True
    
    def has_liked(self, skill_id: str, visitor_id: str) -> bool:
        """Check if visitor has liked a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if liked
        """
        data = self._read_data()
        return visitor_id in data["likes"].get(skill_id, [])
    
    def get_like_count(self, skill_id: str) -> int:
        """Get like count for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            int: Number of likes
        """
        data = self._read_data()
        return len(data["likes"].get(skill_id, []))
    
    # ==================== Favorite Operations ====================
    
    def add_favorite(self, skill_id: str, visitor_id: str) -> bool:
        """Add a favorite (idempotent).
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if favorite was added, False if already favorited
        """
        data = self._read_data()
        
        if skill_id not in data["favorites"]:
            data["favorites"][skill_id] = {}
        
        if visitor_id in data["favorites"][skill_id]:
            return False  # Already favorited
        
        data["favorites"][skill_id][visitor_id] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        self._write_data(data)
        return True
    
    def remove_favorite(self, skill_id: str, visitor_id: str) -> bool:
        """Remove a favorite (idempotent).
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if favorite was removed, False if not favorited
        """
        data = self._read_data()
        
        if skill_id not in data["favorites"]:
            return False
        
        if visitor_id not in data["favorites"][skill_id]:
            return False
        
        del data["favorites"][skill_id][visitor_id]
        self._write_data(data)
        return True
    
    def has_favorited(self, skill_id: str, visitor_id: str) -> bool:
        """Check if visitor has favorited a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if favorited
        """
        data = self._read_data()
        return visitor_id in data["favorites"].get(skill_id, {})
    
    def get_favorite_count(self, skill_id: str) -> int:
        """Get favorite count for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            int: Number of favorites
        """
        data = self._read_data()
        return len(data["favorites"].get(skill_id, {}))
    
    def get_favorites(self, visitor_id: str) -> list[dict]:
        """Get all favorites for a visitor.
        
        Args:
            visitor_id: Visitor ID
        
        Returns:
            list: List of {skill_id, created_at} sorted by date desc
        """
        data = self._read_data()
        
        favorites = []
        for skill_id, visitors in data["favorites"].items():
            if visitor_id in visitors:
                favorites.append({
                    "skill_id": skill_id,
                    "created_at": visitors[visitor_id]
                })
        
        # Sort by created_at descending
        favorites.sort(key=lambda x: x["created_at"], reverse=True)
        return favorites
    
    # ==================== Rating Operations ====================
    
    def set_rating(self, skill_id: str, visitor_id: str, score: int) -> tuple[Optional[int], int]:
        """Set a rating (overwrites existing).
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
            score: Rating score (1-5)
        
        Returns:
            tuple: (old_score or None, new_score)
        """
        data = self._read_data()
        
        if skill_id not in data["ratings"]:
            data["ratings"][skill_id] = {}
        
        old_score = data["ratings"][skill_id].get(visitor_id)
        data["ratings"][skill_id][visitor_id] = score
        
        self._write_data(data)
        return old_score, score
    
    def get_rating(self, skill_id: str, visitor_id: str) -> Optional[int]:
        """Get visitor's rating for a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            int or None: Rating score or None
        """
        data = self._read_data()
        return data["ratings"].get(skill_id, {}).get(visitor_id)
    
    def get_skill_ratings(self, skill_id: str) -> dict[str, int]:
        """Get all ratings for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            dict: {visitor_id: score}
        """
        data = self._read_data()
        return data["ratings"].get(skill_id, {})
    
    def get_rating_stats(self, skill_id: str) -> tuple[float, int]:
        """Get rating statistics for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            tuple: (average rating, count)
        """
        ratings = self.get_skill_ratings(skill_id)
        
        if not ratings:
            return 0.0, 0
        
        total = sum(ratings.values())
        count = len(ratings)
        avg = total / count
        
        return round(avg, 2), count


# Global storage instance
_interaction_storage: Optional[InteractionStorage] = None


def get_interaction_storage() -> InteractionStorage:
    """Get the global interaction storage instance.
    
    Returns:
        InteractionStorage: Global instance
    """
    global _interaction_storage
    if _interaction_storage is None:
        _interaction_storage = InteractionStorage()
    return _interaction_storage
