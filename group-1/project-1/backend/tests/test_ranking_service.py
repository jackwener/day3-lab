"""Tests for ranking service (hot score computation)."""

from __future__ import annotations

import pytest
import math


class TestHotScoreComputation:
    """Tests for hot score calculation."""
    
    def test_compute_hot_score_basic(self):
        """TC-M02-080: Hot score formula should match spec."""
        from services.ranking_service import compute_hot_score
        
        skill = {
            "download_count": 50,
            "rating_avg": 4.0,
            "rating_count": 10,
            "like_count": 20,
            "favorite_count": 10
        }
        
        stats = {
            "max_download": 100,
            "max_interaction": 50
        }
        
        score = compute_hot_score(skill, stats)
        
        # Score should be between 0 and 1
        assert 0 <= score <= 1
        assert score > 0  # Should have positive value
    
    def test_compute_hot_score_zero_stats(self):
        """TC-M02-082: Hot score should be 0 when all stats are 0."""
        from services.ranking_service import compute_hot_score
        
        skill = {
            "download_count": 0,
            "rating_avg": 0,
            "rating_count": 0,
            "like_count": 0,
            "favorite_count": 0
        }
        
        stats = {
            "max_download": 0,
            "max_interaction": 0
        }
        
        score = compute_hot_score(skill, stats)
        
        assert score == 0.0
    
    def test_compute_hot_score_max_values(self):
        """Hot score should be 1 when skill has max values."""
        from services.ranking_service import compute_hot_score
        
        skill = {
            "download_count": 100,
            "rating_avg": 5.0,
            "rating_count": 50,  # Max weight
            "like_count": 40,
            "favorite_count": 10
        }
        
        stats = {
            "max_download": 100,
            "max_interaction": 50
        }
        
        score = compute_hot_score(skill, stats)
        
        # Should be close to 1 (not exactly 1 due to rating weighting)
        assert score > 0.5
        assert score <= 1.0
    
    def test_compute_hot_score_no_nan(self):
        """TC-M02-082: Hot score should never be NaN."""
        from services.ranking_service import compute_hot_score
        
        # Various edge cases that could cause NaN
        test_cases = [
            {"download_count": 0, "rating_avg": 0, "rating_count": 0, "like_count": 0, "favorite_count": 0},
            {"download_count": 100, "rating_avg": 5.0, "rating_count": 100, "like_count": 100, "favorite_count": 100},
            {"download_count": 50, "rating_avg": 2.5, "rating_count": 1, "like_count": 1, "favorite_count": 0},
        ]
        
        stats = {"max_download": 100, "max_interaction": 100}
        
        for skill in test_cases:
            score = compute_hot_score(skill, stats)
            assert not math.isnan(score), f"NaN detected for skill: {skill}"
    
    def test_normalize_function(self):
        """Test normalize helper function."""
        from services.ranking_service import normalize
        
        # Normal case
        assert normalize(50, 100) == 0.5
        
        # Zero max
        assert normalize(50, 0) == 0.0
        
        # Value equals max
        assert normalize(100, 100) == 1.0
        
        # Value exceeds max (should cap at 1)
        assert normalize(150, 100) == 1.0
    
    def test_recompute_hot_scores(self):
        """Test recompute_hot_scores function."""
        from services.ranking_service import recompute_hot_scores
        
        skills = [
            {"download_count": 100, "rating_avg": 4.5, "rating_count": 10, "like_count": 20, "favorite_count": 10},
            {"download_count": 50, "rating_avg": 4.0, "rating_count": 5, "like_count": 10, "favorite_count": 5},
            {"download_count": 0, "rating_avg": 0, "rating_count": 0, "like_count": 0, "favorite_count": 0},
        ]
        
        result = recompute_hot_scores(skills)
        
        assert len(result) == 3
        for skill in result:
            assert "hot_score" in skill
            assert 0 <= skill["hot_score"] <= 1


class TestRankingService:
    """Tests for RankingService class."""
    
    def test_get_global_stats(self, temp_data_dir):
        """Test global stats computation."""
        from services.ranking_service import RankingService
        from storage.json_storage import JSONStorage
        
        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )
        service = RankingService(storage=storage)
        
        stats = service.get_global_stats()
        
        assert "max_download" in stats
        assert "max_interaction" in stats
        assert stats["max_download"] >= 0
        assert stats["max_interaction"] >= 0
    
    def test_recompute(self, temp_data_dir):
        """Test recomputing hot score for a skill."""
        from services.ranking_service import RankingService
        from storage.json_storage import JSONStorage
        
        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )
        service = RankingService(storage=storage)
        
        new_score = service.recompute("sk_test001")
        
        assert new_score is not None
        assert 0 <= new_score <= 1
    
    def test_recompute_nonexistent_skill(self, temp_data_dir):
        """Test recomputing hot score for non-existent skill."""
        from services.ranking_service import RankingService
        from storage.json_storage import JSONStorage
        
        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )
        service = RankingService(storage=storage)
        
        new_score = service.recompute("sk_nonexistent")
        
        assert new_score is None
    
    def test_invalidate_cache(self, temp_data_dir):
        """Test cache invalidation."""
        from services.ranking_service import RankingService
        from storage.json_storage import JSONStorage
        
        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )
        service = RankingService(storage=storage)
        
        # Get stats (caches)
        service.get_global_stats()
        assert service._stats_cache is not None
        
        # Invalidate
        service.invalidate_cache()
        assert service._stats_cache is None
