"""Interaction service for likes, favorites, and ratings."""

from typing import Optional
from storage.json_storage import get_storage, JsonStorage
from storage.interaction_storage import get_interaction_storage, InteractionStorage
from services.ranking_service import get_ranking_service, RankingService


class InteractionService:
    """Service for handling user interactions.
    
    Coordinates between interaction storage and skill storage,
    updating counts and recomputing hot scores.
    """
    
    def __init__(
        self,
        storage: Optional[JsonStorage] = None,
        interaction_storage: Optional[InteractionStorage] = None,
        ranking_service: Optional[RankingService] = None
    ):
        """Initialize interaction service.
        
        Args:
            storage: JsonStorage instance
            interaction_storage: InteractionStorage instance
            ranking_service: RankingService instance
        """
        self.storage = storage or get_storage()
        self.interaction_storage = interaction_storage or get_interaction_storage()
        self.ranking_service = ranking_service or get_ranking_service()
    
    def _skill_exists(self, skill_id: str) -> bool:
        """Check if skill exists.
        
        Args:
            skill_id: Skill ID
        
        Returns:
            bool: True if exists
        """
        return self.storage.get_skill(skill_id) is not None
    
    # ==================== Like Operations ====================
    
    def like_skill(self, skill_id: str, visitor_id: str) -> dict:
        """Like a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            dict: {liked: bool, like_count: int}
        """
        if not self._skill_exists(skill_id):
            return {"error": "SKILL_NOT_FOUND"}
        
        # Add like (idempotent)
        added = self.interaction_storage.add_like(skill_id, visitor_id)
        
        # Update count only if newly added
        if added:
            new_count = self.interaction_storage.get_like_count(skill_id)
            self.storage.update_skill(skill_id, {"like_count": new_count})
            self.ranking_service.recompute(skill_id)
        else:
            new_count = self.interaction_storage.get_like_count(skill_id)
        
        return {
            "liked": True,
            "like_count": new_count
        }
    
    def unlike_skill(self, skill_id: str, visitor_id: str) -> dict:
        """Unlike a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            dict: {liked: bool, like_count: int}
        """
        if not self._skill_exists(skill_id):
            return {"error": "SKILL_NOT_FOUND"}
        
        # Remove like (idempotent)
        removed = self.interaction_storage.remove_like(skill_id, visitor_id)
        
        # Update count only if actually removed
        if removed:
            new_count = self.interaction_storage.get_like_count(skill_id)
            self.storage.update_skill(skill_id, {"like_count": new_count})
            self.ranking_service.recompute(skill_id)
        else:
            new_count = self.interaction_storage.get_like_count(skill_id)
        
        return {
            "liked": False,
            "like_count": new_count
        }
    
    def has_liked(self, skill_id: str, visitor_id: str) -> bool:
        """Check if visitor has liked a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if liked
        """
        return self.interaction_storage.has_liked(skill_id, visitor_id)
    
    # ==================== Favorite Operations ====================
    
    def favorite_skill(self, skill_id: str, visitor_id: str) -> dict:
        """Favorite a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            dict: {favorited: bool, favorite_count: int}
        """
        if not self._skill_exists(skill_id):
            return {"error": "SKILL_NOT_FOUND"}
        
        # Add favorite (idempotent)
        added = self.interaction_storage.add_favorite(skill_id, visitor_id)
        
        # Update count only if newly added
        if added:
            new_count = self.interaction_storage.get_favorite_count(skill_id)
            self.storage.update_skill(skill_id, {"favorite_count": new_count})
            self.ranking_service.recompute(skill_id)
        else:
            new_count = self.interaction_storage.get_favorite_count(skill_id)
        
        return {
            "favorited": True,
            "favorite_count": new_count
        }
    
    def unfavorite_skill(self, skill_id: str, visitor_id: str) -> dict:
        """Unfavorite a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            dict: {favorited: bool, favorite_count: int}
        """
        if not self._skill_exists(skill_id):
            return {"error": "SKILL_NOT_FOUND"}
        
        # Remove favorite (idempotent)
        removed = self.interaction_storage.remove_favorite(skill_id, visitor_id)
        
        # Update count only if actually removed
        if removed:
            new_count = self.interaction_storage.get_favorite_count(skill_id)
            self.storage.update_skill(skill_id, {"favorite_count": new_count})
            self.ranking_service.recompute(skill_id)
        else:
            new_count = self.interaction_storage.get_favorite_count(skill_id)
        
        return {
            "favorited": False,
            "favorite_count": new_count
        }
    
    def has_favorited(self, skill_id: str, visitor_id: str) -> bool:
        """Check if visitor has favorited a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            bool: True if favorited
        """
        return self.interaction_storage.has_favorited(skill_id, visitor_id)
    
    def get_visitor_favorites(self, visitor_id: str) -> list[dict]:
        """Get all favorites for a visitor.
        
        Args:
            visitor_id: Visitor ID
        
        Returns:
            list: List of skill summaries
        """
        favorites = self.interaction_storage.get_favorites(visitor_id)
        
        result = []
        for fav in favorites:
            skill = self.storage.get_skill(fav["skill_id"])
            if skill:
                result.append(skill)
        
        return result
    
    # ==================== Rating Operations ====================
    
    def rate_skill(self, skill_id: str, visitor_id: str, score: int) -> dict:
        """Rate a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
            score: Rating score (1-5)
        
        Returns:
            dict: {rating_avg: float, rating_count: int, my_score: int}
        """
        if not self._skill_exists(skill_id):
            return {"error": "SKILL_NOT_FOUND"}
        
        # Set rating (overwrites existing)
        old_score, new_score = self.interaction_storage.set_rating(
            skill_id, visitor_id, score
        )
        
        # Recompute average and count
        rating_avg, rating_count = self.interaction_storage.get_rating_stats(skill_id)
        
        # Update skill
        self.storage.update_skill(skill_id, {
            "rating_avg": rating_avg,
            "rating_count": rating_count
        })
        self.ranking_service.recompute(skill_id)
        
        return {
            "rating_avg": rating_avg,
            "rating_count": rating_count,
            "my_score": new_score
        }
    
    def get_rating(self, skill_id: str, visitor_id: str) -> Optional[int]:
        """Get visitor's rating for a skill.
        
        Args:
            skill_id: Skill ID
            visitor_id: Visitor ID
        
        Returns:
            int or None: Rating score
        """
        return self.interaction_storage.get_rating(skill_id, visitor_id)


# Global service instance
_interaction_service: Optional[InteractionService] = None


def get_interaction_service() -> InteractionService:
    """Get the global interaction service instance.
    
    Returns:
        InteractionService: Global instance
    """
    global _interaction_service
    if _interaction_service is None:
        _interaction_service = InteractionService()
    return _interaction_service
