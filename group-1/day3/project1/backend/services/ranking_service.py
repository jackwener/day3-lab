"""Ranking service for hot score computation."""

from __future__ import annotations

from typing import Optional
from storage.json_storage import get_storage, JsonStorage


EPSILON = 1e-9


def normalize(value: float, max_value: float) -> float:
    """Normalize a value to 0-1 range.
    
    Args:
        value: Value to normalize
        max_value: Maximum value for normalization
    
    Returns:
        float: Normalized value (0-1), returns 0 if max is 0
    """
    if max_value <= 0:
        return 0.0
    return min(value / max_value, 1.0)


def _normalize(value: float, min_value: float, max_value: float) -> float:
    """Normalize a value to 0-1 range using min-max scaling.
    
    Args:
        value: Value to normalize
        min_value: Minimum value
        max_value: Maximum value
    
    Returns:
        float: Normalized value (0-1)
    """
    if abs(max_value - min_value) < EPSILON:
        return 0.0
    return (value - min_value) / (max_value - min_value + EPSILON)


def compute_rating_value(skill: dict) -> float:
    """Compute weighted rating value.
    
    Args:
        skill: Skill dict
    
    Returns:
        float: Weighted rating value
    """
    return float(skill.get("rating_avg", 0.0)) * min(int(skill.get("rating_count", 0)), 50) / 50.0


def compute_hot_score(skill: dict, stats: dict) -> float:
    """Compute hot score for a skill.
    
    Formula: 0.5 * norm(download) + 0.3 * norm(rating_weighted) + 0.2 * norm(interaction)
    
    Args:
        skill: Skill dict
        stats: Global stats dict with max_download and max_interaction
    
    Returns:
        float: Hot score (0-1 range)
    """
    max_download = stats.get("max_download", 0)
    max_interaction = stats.get("max_interaction", 0)
    
    # Download component (50% weight)
    download_count = skill.get("download_count", 0)
    d = normalize(download_count, max_download)
    
    # Rating component (30% weight) - weighted by count
    rating_avg = skill.get("rating_avg", 0)
    rating_count = skill.get("rating_count", 0)
    # Weight rating by count, capped at 50
    r = normalize(rating_avg * min(rating_count, 50) / 50, 5.0)
    
    # Interaction component (20% weight) - likes + favorites
    like_count = skill.get("like_count", 0)
    favorite_count = skill.get("favorite_count", 0)
    i = normalize(like_count + favorite_count, max_interaction)
    
    # Compute final score
    hot_score = 0.5 * d + 0.3 * r + 0.2 * i
    
    # Ensure no NaN
    if hot_score != hot_score:  # NaN check
        return 0.0
    
    return round(hot_score, 6)


def recompute_hot_scores(skills: list[dict]) -> list[dict]:
    """Recompute hot scores for all skills.
    
    Args:
        skills: List of skill dicts
    
    Returns:
        list: Updated skills list with new hot_score values
    """
    if not skills:
        return skills

    download_values = [float(skill.get("download_count", 0)) for skill in skills]
    rating_values = [compute_rating_value(skill) for skill in skills]
    engagement_values = [
        float(skill.get("like_count", 0) + skill.get("favorite_count", 0)) for skill in skills
    ]

    download_min, download_max = min(download_values), max(download_values)
    rating_min, rating_max = min(rating_values), max(rating_values)
    engage_min, engage_max = min(engagement_values), max(engagement_values)

    for index, skill in enumerate(skills):
        download_norm = _normalize(download_values[index], download_min, download_max)
        rating_norm = _normalize(rating_values[index], rating_min, rating_max)
        engagement_norm = _normalize(engagement_values[index], engage_min, engage_max)
        skill["hot_score"] = round(
            0.5 * download_norm + 0.3 * rating_norm + 0.2 * engagement_norm,
            6,
        )

    return skills


class RankingService:
    """Service for computing and updating hot scores."""
    
    def __init__(self, storage: Optional[JsonStorage] = None):
        """Initialize ranking service.
        
        Args:
            storage: JsonStorage instance (uses global if not provided)
        """
        self.storage = storage or get_storage()
        self._stats_cache: Optional[dict] = None
        self._stats_cache_time: float = 0
    
    def get_global_stats(self, cache_ttl: int = 60) -> dict:
        """Get global stats with caching.
        
        Args:
            cache_ttl: Cache TTL in seconds
        
        Returns:
            dict: Global stats
        """
        import time
        current_time = time.time()
        
        if self._stats_cache and (current_time - self._stats_cache_time) < cache_ttl:
            return self._stats_cache
        
        self._stats_cache = self.storage.get_global_stats()
        self._stats_cache_time = current_time
        return self._stats_cache
    
    def recompute(self, skill_id: str) -> Optional[float]:
        """Recompute hot score for a skill.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            float or None: New hot score, or None if skill not found
        """
        skill = self.storage.get_skill(skill_id)
        if not skill:
            return None
        
        stats = self.get_global_stats()
        new_score = compute_hot_score(skill, stats)
        
        # Update skill
        self.storage.update_skill(skill_id, {"hot_score": new_score})
        
        return new_score
    
    def recompute_all(self) -> int:
        """Recompute hot scores for all skills.
        
        Returns:
            int: Number of skills updated
        """
        skills, _ = self.storage.list_skills(page=1, page_size=10000)
        stats = self.get_global_stats()
        
        count = 0
        for skill in skills:
            skill_id = skill.get("skill_id")
            if skill_id:
                new_score = compute_hot_score(skill, stats)
                self.storage.update_skill(skill_id, {"hot_score": new_score})
                count += 1
        
        return count
    
    def invalidate_cache(self) -> None:
        """Invalidate stats cache."""
        self._stats_cache = None
        self._stats_cache_time = 0


# Global service instance
_ranking_service: Optional[RankingService] = None


def get_ranking_service() -> RankingService:
    """Get the global ranking service instance.
    
    Returns:
        RankingService: Global instance
    """
    global _ranking_service
    if _ranking_service is None:
        _ranking_service = RankingService()
    return _ranking_service
