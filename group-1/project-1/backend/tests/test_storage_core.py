"""Tests for storage core functionality."""

from __future__ import annotations

import pytest
import json
import os


class TestReadWriteJson:
    """Tests for low-level read/write methods."""
    
    def test_read_json_normal(self, storage):
        """Test reading JSON file normally."""
        data = storage._read_json(storage.skills_path)
        assert isinstance(data, list)
    
    def test_read_json_missing_file(self, tmp_path):
        """Test reading missing JSON file returns empty list."""
        from storage.json_storage import JSONStorage
        s = JSONStorage(
            skills_path=tmp_path / "nonexistent.json",
            categories_path=tmp_path / "categories.json",
        )
        result = s._read_json(s.skills_path)
        assert result == []
    
    def test_write_json_creates_backup(self, storage):
        """Test that writing JSON creates a backup file."""
        data = storage._read_json(storage.skills_path)
        data.append({"skill_id": "sk_new"})
        storage._write_json(storage.skills_path, data)
        bak = storage.skills_path.with_suffix(".json.bak")
        assert bak.exists()
    
    def test_write_then_read(self, storage):
        """Test writing and reading back JSON data."""
        storage._write_json(storage.skills_path, [{"test": True}])
        data = storage._read_json(storage.skills_path)
        assert data == [{"test": True}]
    
    def test_read_json_fallback_to_bak(self, tmp_path):
        """Test that reading falls back to .bak file when main file is corrupted."""
        from storage.json_storage import JSONStorage
        skills_path = tmp_path / "skills.json"
        bak_path = skills_path.with_suffix(".json.bak")

        # Write valid backup
        bak_path.write_text('[{"skill_id": "from_bak"}]', encoding="utf-8")
        # Write corrupted main file
        skills_path.write_text("{broken json", encoding="utf-8")

        s = JSONStorage(skills_path=skills_path,
                        categories_path=tmp_path / "c.json")
        data = s._read_json(skills_path)
        assert data[0]["skill_id"] == "from_bak"


class TestSkillsCrud:
    """Tests for Skills CRUD operations."""
    
    def test_list_skills_only_published(self, storage):
        """Test that list_skills only returns published skills."""
        # Add a pending skill
        storage.create_skill({
            "skill_id": "sk_pending",
            "name": "Pending Skill",
            "status": "pending",
            "category": "frontend",
            "tags": [],
        })
        
        items, total = storage.list_skills()
        for item in items:
            assert item["status"] == "published"

    def test_get_skill_exists(self, storage):
        """Test getting an existing skill."""
        # Create a skill first
        skill = storage.create_skill({
            "skill_id": "sk_test_get",
            "name": "Test Skill",
            "status": "published",
            "category": "frontend",
            "tags": [],
        })
        
        found = storage.get_skill("sk_test_get")
        assert found is not None
        assert found["name"] == "Test Skill"

    def test_get_skill_not_found(self, storage):
        """Test getting a non-existent skill."""
        assert storage.get_skill("sk_nonexistent") is None

    def test_create_skill(self, storage):
        """Test creating a new skill."""
        payload = {
            "skill_id": "sk_new_001",
            "name": "New Skill",
            "status": "published",
            "category": "frontend",
            "tags": [],
        }
        result = storage.create_skill(payload)
        assert result["skill_id"] == "sk_new_001"
        # Verify persistence
        found = storage.get_skill("sk_new_001")
        assert found is not None

    def test_update_skill(self, storage):
        """Test updating a skill."""
        # Create a skill first
        storage.create_skill({
            "skill_id": "sk_test_update",
            "name": "Original Name",
            "status": "published",
            "category": "frontend",
            "tags": [],
        })
        
        result = storage.update_skill("sk_test_update", {"name": "Updated"})
        assert result["name"] == "Updated"
        assert "updated_at" in result

    def test_update_skill_not_found(self, storage):
        """Test updating a non-existent skill."""
        result = storage.update_skill("sk_nonexistent", {"name": "X"})
        assert result is None

    def test_increment_view(self, storage):
        """Test incrementing view count."""
        # Create a skill first
        storage.create_skill({
            "skill_id": "sk_test_view",
            "name": "Test View",
            "status": "published",
            "category": "frontend",
            "tags": [],
            "view_count": 0,
        })
        
        new_count = storage.increment_view("sk_test_view")
        assert new_count["view_count"] == 1

    def test_increment_download(self, storage):
        """Test incrementing download count."""
        # Create a skill first
        storage.create_skill({
            "skill_id": "sk_test_download",
            "name": "Test Download",
            "status": "published",
            "category": "frontend",
            "tags": [],
            "download_count": 0,
        })
        
        new_count = storage.increment_download("sk_test_download")
        assert new_count["download_count"] == 1


class TestFiltering:
    """Tests for filtering and sorting."""
    
    def test_filter_by_category(self, storage):
        """Test filtering by category."""
        # Create skills in different categories
        storage.create_skill({
            "skill_id": "sk_frontend",
            "name": "Frontend Skill",
            "status": "published",
            "category": "frontend",
            "tags": [],
        })
        storage.create_skill({
            "skill_id": "sk_backend",
            "name": "Backend Skill",
            "status": "published",
            "category": "backend",
            "tags": [],
        })
        
        items, total = storage.list_skills(
            filters={"category": "frontend"}
        )
        for item in items:
            assert item["category"] == "frontend"

    def test_filter_by_keyword(self, storage):
        """Test filtering by keyword."""
        storage.create_skill({
            "skill_id": "sk_keyword_test",
            "name": "Keyword Test Skill",
            "description": "A skill for testing keyword search",
            "status": "published",
            "category": "frontend",
            "tags": [],
        })
        
        items, total = storage.list_skills(filters={"q": "keyword"})
        assert total >= 1

    def test_filter_by_tags_and(self, storage):
        """Test filtering by tags with AND logic."""
        storage.create_skill({
            "skill_id": "sk_tags_test",
            "name": "Tags Test Skill",
            "status": "published",
            "category": "frontend",
            "tags": ["test", "frontend"],
        })
        
        items, total = storage.list_skills(
            filters={"tags": "test,frontend"}
        )
        assert total >= 1
        for item in items:
            assert "test" in item["tags"]
            assert "frontend" in item["tags"]

    def test_sort_downloads(self, storage):
        """Test sorting by downloads."""
        storage.create_skill({
            "skill_id": "sk_high_dl",
            "name": "High Downloads",
            "status": "published",
            "category": "frontend",
            "tags": [],
            "download_count": 100,
        })
        storage.create_skill({
            "skill_id": "sk_low_dl",
            "name": "Low Downloads",
            "status": "published",
            "category": "backend",
            "tags": [],
            "download_count": 10,
        })
        
        items, _ = storage.list_skills(sort="downloads", page_size=100)
        # Find the two skills we created
        high_idx = next((i for i, s in enumerate(items) if s["skill_id"] == "sk_high_dl"), -1)
        low_idx = next((i for i, s in enumerate(items) if s["skill_id"] == "sk_low_dl"), -1)
        if high_idx >= 0 and low_idx >= 0:
            assert high_idx < low_idx  # Higher downloads should come first

    def test_sort_latest(self, storage):
        """Test sorting by latest."""
        items, _ = storage.list_skills(sort="latest")
        # Check that items are sorted by updated_at descending
        for i in range(len(items) - 1):
            assert items[i]["updated_at"] >= items[i + 1]["updated_at"]

    def test_pagination(self, storage):
        """Test pagination."""
        # Create multiple skills
        for i in range(5):
            storage.create_skill({
                "skill_id": f"sk_page_{i}",
                "name": f"Page Skill {i}",
                "status": "published",
                "category": "frontend",
                "tags": [],
            })
        
        items, total = storage.list_skills(page=1, page_size=2)
        assert len(items) == 2


class TestCategoriesAndTags:
    """Tests for categories and tags."""
    
    def test_list_categories_with_count(self, storage):
        """Test listing categories with skill counts."""
        # Create a skill in frontend category
        storage.create_skill({
            "skill_id": "sk_cat_test",
            "name": "Category Test",
            "status": "published",
            "category": "frontend",
            "tags": [],
        })
        
        cats = storage.list_categories()
        assert len(cats) == 8
        frontend_cat = next((c for c in cats if c["key"] == "frontend"), None)
        assert frontend_cat is not None
        assert frontend_cat["count"] >= 1

    def test_tags_frequency(self, storage):
        """Test getting tags frequency."""
        storage.create_skill({
            "skill_id": "sk_tag_freq",
            "name": "Tag Freq Test",
            "status": "published",
            "category": "frontend",
            "tags": ["common", "test"],
        })
        
        tags = storage.get_tags_frequency()
        assert isinstance(tags, list)
        for item in tags:
            assert "tag" in item
            assert "count" in item


class TestJsonStorage:
    """Tests for JsonStorage class."""
    
    def test_list_skills(self, temp_data_dir):
        """Test listing skills with pagination."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        skills, total = storage.list_skills(page=1, page_size=10)

        assert isinstance(skills, list)
        assert total >= 0
    
    def test_list_skills_with_filter(self, temp_data_dir):
        """Test listing skills with category filter."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        skills, total = storage.list_skills(
            filters={"category": "frontend"},
            page=1,
            page_size=10
        )

        # All returned skills should have frontend category
        for skill in skills:
            assert skill.get("category") == "frontend"
    
    def test_get_skill(self, temp_data_dir):
        """Test getting a single skill."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        skill = storage.get_skill("sk_test001")

        assert skill is not None
        assert skill.get("skill_id") == "sk_test001"
    
    def test_get_skill_nonexistent(self, temp_data_dir):
        """Test getting non-existent skill."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        skill = storage.get_skill("sk_nonexistent")

        assert skill is None
    
    def test_create_skill(self, temp_data_dir):
        """Test creating a skill."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        new_skill = storage.create_skill({
            "name": "New Test Skill",
            "category": "backend",
            "description": "A new test skill",
            "skill_md": "# New Skill",
            "skill_md_html": "<h1>New Skill</h1>"
        })

        assert new_skill["skill_id"].startswith("sk_")
        assert new_skill["name"] == "New Test Skill"
    
    def test_update_skill(self, temp_data_dir):
        """Test updating a skill."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        updated = storage.update_skill("sk_test001", {"like_count": 100})

        assert updated is not None
        assert updated["like_count"] == 100
    
    def test_get_tags_frequency(self, temp_data_dir):
        """Test getting tags frequency."""
        from storage.json_storage import JSONStorage

        storage = JSONStorage(
            skills_path=str(temp_data_dir / "skills.json"),
            categories_path=str(temp_data_dir / "categories.json")
        )

        tags = storage.get_tags_frequency(limit=10)

        assert isinstance(tags, list)
        for item in tags:
            assert "tag" in item
            assert "count" in item


class TestInteractionStorage:
    """Tests for InteractionStorage class."""
    
    def test_add_like(self, temp_data_dir):
        """Test adding a like."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        result = storage.add_like("sk_test001", "v_visitor1")

        assert result is True  # New like added
    
    def test_add_like_idempotent(self, temp_data_dir):
        """Test that duplicate like is idempotent."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # First like
        storage.add_like("sk_test002", "v_visitor2")

        # Second like (should not add)
        result = storage.add_like("sk_test002", "v_visitor2")

        assert result is False  # Already liked
    
    def test_remove_like(self, temp_data_dir):
        """Test removing a like."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # Add first
        storage.add_like("sk_test003", "v_visitor3")

        # Remove
        result = storage.remove_like("sk_test003", "v_visitor3")

        assert result is True
    
    def test_has_liked(self, temp_data_dir):
        """Test checking if liked."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # Not liked initially
        assert storage.has_liked("sk_test004", "v_visitor4") is False

        # Add like
        storage.add_like("sk_test004", "v_visitor4")

        # Now liked
        assert storage.has_liked("sk_test004", "v_visitor4") is True
    
    def test_add_favorite(self, temp_data_dir):
        """Test adding a favorite."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        result = storage.add_favorite("sk_test001", "v_visitor1")

        assert result is True
    
    def test_get_favorites(self, temp_data_dir):
        """Test getting user favorites."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # Add some favorites
        storage.add_favorite("sk_test001", "v_test_fav")
        storage.add_favorite("sk_test002", "v_test_fav")

        # Get favorites
        favorites = storage.get_favorites("v_test_fav")

        assert len(favorites) >= 2
    
    def test_set_rating(self, temp_data_dir):
        """Test setting a rating."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        old, new = storage.set_rating("sk_test001", "v_visitor1", 5)

        assert old is None  # First rating
        assert new == 5
    
    def test_set_rating_overwrite(self, temp_data_dir):
        """Test overwriting a rating."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # First rating
        storage.set_rating("sk_test002", "v_visitor2", 3)

        # Overwrite
        old, new = storage.set_rating("sk_test002", "v_visitor2", 5)

        assert old == 3
        assert new == 5
    
    def test_get_rating_stats(self, temp_data_dir):
        """Test getting rating statistics."""
        from storage.interaction_storage import InteractionStorage

        storage = InteractionStorage(
            path=str(temp_data_dir / "interactions.json")
        )

        # Add some ratings
        storage.set_rating("sk_test003", "v1", 5)
        storage.set_rating("sk_test003", "v2", 4)
        storage.set_rating("sk_test003", "v3", 3)

        avg, count = storage.get_rating_stats("sk_test003")

        assert count == 3
        assert 4.0 <= avg <= 4.1  # (5+4+3)/3 = 4.0
