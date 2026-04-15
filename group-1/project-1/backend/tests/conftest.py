"""Pytest fixtures for testing."""

from __future__ import annotations

import io
import os
import json
import zipfile
from pathlib import Path

import pytest

# Set testing environment before importing app
os.environ['FLASK_ENV'] = 'testing'
os.environ['LLM_API_KEY'] = 'test-key'

from utils.rate_limiter import reset_rate_limits


DEFAULT_CATEGORIES = [
    {"key": "frontend", "label": "前端"},
    {"key": "backend", "label": "后端"},
    {"key": "security", "label": "安全"},
    {"key": "bigdata", "label": "大数据"},
    {"key": "coding", "label": "写代码"},
    {"key": "ppt", "label": "PPT"},
    {"key": "writing", "label": "写作"},
    {"key": "other", "label": "其它"},
]


@pytest.fixture
def app(tmp_path):
    """Create test application."""
    reset_rate_limits()
    
    from app import create_app
    
    data_dir = tmp_path / "data"
    bundles_dir = data_dir / "bundles"
    tmp_dir = tmp_path / "tmp"

    bundles_dir.mkdir(parents=True)
    tmp_dir.mkdir(parents=True)

    # Create bundle directory for sk_test_001 (has_bundle=True)
    bundle_001 = bundles_dir / "sk_test_001"
    bundle_001.mkdir()
    (bundle_001 / "skill.md").write_text("# React Test Utils", encoding="utf-8")

    # Seed published skills for query/search tests + draft skills for interact tests
    seed_skills = [
        {
            "skill_id": "sk_test_001",
            "name": "React Test Utils",
            "author": "Test Author",
            "category": "frontend",
            "description": "React前端测试工具",
            "install_command": "npm install",
            "skill_md": "# React Test Utils\nTesting utilities.",
            "skill_md_html": "<h1>React Test Utils</h1><p>Testing utilities.</p>",
            "tags": ["test", "frontend", "react"],
            "status": "published",
            "view_count": 100,
            "download_count": 50,
            "like_count": 20,
            "favorite_count": 10,
            "rating_avg": 4.5,
            "rating_count": 10,
            "hot_score": 0.6,
            "has_bundle": True,
            "bundle_path": str(bundle_001),
            "bundle_size": 1024,
            "file_count": 5,
            "featured_weight": 0,
            "created_at": "2026-04-10T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z"
        },
        {
            "skill_id": "sk_test_002",
            "name": "Python Backend Utils",
            "author": "Test Author",
            "category": "backend",
            "description": "Python后端工具",
            "install_command": "pip install",
            "skill_md": "# Python Utils",
            "skill_md_html": "<h1>Python Utils</h1>",
            "tags": ["python", "utils"],
            "status": "published",
            "view_count": 80,
            "download_count": 30,
            "like_count": 15,
            "favorite_count": 5,
            "rating_avg": 4.2,
            "rating_count": 8,
            "hot_score": 0.4,
            "has_bundle": False,
            "bundle_path": None,
            "bundle_size": None,
            "file_count": None,
            "featured_weight": 0,
            "created_at": "2026-04-11T10:00:00Z",
            "updated_at": "2026-04-14T10:00:00Z"
        },
    ]

    # Add draft skills for interact tests (sk_01HX001..sk_01HX005)
    for i in range(1, 6):
        seed_skills.append({
            "skill_id": f"sk_01HX00{i}",
            "name": f"Interact Test Skill {i}",
            "author": "Test",
            "category": "backend",
            "description": f"Test skill {i}",
            "install_command": "",
            "skill_md": f"# Skill {i}",
            "skill_md_html": f"<h1>Skill {i}</h1>",
            "tags": ["test"],
            "status": "draft",
            "view_count": 0,
            "download_count": 0,
            "like_count": 0,
            "favorite_count": 0,
            "rating_avg": 0.0,
            "rating_count": 0,
            "hot_score": 0.0,
            "has_bundle": False,
            "bundle_path": None,
            "bundle_size": None,
            "file_count": None,
            "featured_weight": 0,
            "created_at": "2026-04-15T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z"
        })

    (data_dir / "skills.json").write_text(
        json.dumps(seed_skills, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (data_dir / "interactions.json").write_text(
        json.dumps({"likes": {}, "favorites": {}, "ratings": {}}),
        encoding="utf-8",
    )
    (data_dir / "categories.json").write_text(
        json.dumps(DEFAULT_CATEGORIES, ensure_ascii=False),
        encoding="utf-8",
    )

    application = create_app(
        test_config={
            "TESTING": True,
            "SKILLS_JSON_PATH": str(data_dir / "skills.json"),
            "SKILLS_PATH": str(data_dir / "skills.json"),
            "INTERACTIONS_JSON_PATH": str(data_dir / "interactions.json"),
            "INTERACTIONS_PATH": str(data_dir / "interactions.json"),
            "CATEGORIES_JSON_PATH": str(data_dir / "categories.json"),
            "CATEGORIES_PATH": str(data_dir / "categories.json"),
            "BUNDLES_DIR": str(bundles_dir),
            "TMP_DIR": str(tmp_dir),
        }
    )
    yield application


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()


@pytest.fixture
def storage(app):
    """Get storage instance from app extensions."""
    return app.extensions.get("storage")


@pytest.fixture
def make_zip():
    """Factory fixture to create zip files for testing."""
    def _make_zip(entries):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for entry in entries:
                info = zipfile.ZipInfo(entry["name"])
                if entry.get("external_attr") is not None:
                    info.external_attr = entry["external_attr"]
                data = entry.get("data", b"")
                if isinstance(data, str):
                    data = data.encode("utf-8")
                archive.writestr(info, data)
        return buffer.getvalue()

    return _make_zip


@pytest.fixture
def sample_skill():
    """Sample skill data for testing."""
    return {
        "skill_id": "sk_test001",
        "name": "Test Skill",
        "author": "Test Author",
        "category": "frontend",
        "description": "A test skill for unit testing",
        "install_command": "npm install test-skill",
        "skill_md": "# Test Skill\n\nThis is a test.\n\n```bash\necho 'hello'\n```",
        "skill_md_html": "<h1>Test Skill</h1><p>This is a test.</p>",
        "tags": ["test", "unit"],
        "status": "published",
        "view_count": 0,
        "download_count": 0,
        "like_count": 0,
        "favorite_count": 0,
        "rating_avg": 0.0,
        "rating_count": 0,
        "hot_score": 0.0,
        "has_bundle": False,
        "bundle_size": None,
        "file_count": None,
        "featured_weight": 0,
        "created_at": "2026-04-15T10:00:00Z",
        "updated_at": "2026-04-15T10:00:00Z"
    }


@pytest.fixture
def sample_skills():
    """Multiple sample skills for testing."""
    return [
        {
            "skill_id": "sk_test001",
            "name": "React Test Utils",
            "author": "Test Author",
            "category": "frontend",
            "description": "React testing utilities",
            "install_command": "npm install react-test-utils",
            "skill_md": "# React Test Utils\n\nTesting utilities for React.\n\n```javascript\ntest('example', () => {})\n```",
            "skill_md_html": "<h1>React Test Utils</h1>",
            "tags": ["react", "test"],
            "status": "published",
            "view_count": 100,
            "download_count": 50,
            "like_count": 20,
            "favorite_count": 10,
            "rating_avg": 4.5,
            "rating_count": 10,
            "hot_score": 0.6,
            "has_bundle": True,
            "bundle_size": 1024000,
            "file_count": 5,
            "featured_weight": 0,
            "created_at": "2026-04-10T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z"
        },
        {
            "skill_id": "sk_test002",
            "name": "Python Utils",
            "author": "Test Author",
            "category": "backend",
            "description": "Python utility functions",
            "install_command": "pip install python-utils",
            "skill_md": "# Python Utils\n\nUtility functions for Python.\n\n```python\nprint('hello')\n```",
            "skill_md_html": "<h1>Python Utils</h1>",
            "tags": ["python", "utils"],
            "status": "published",
            "view_count": 80,
            "download_count": 30,
            "like_count": 15,
            "favorite_count": 5,
            "rating_avg": 4.2,
            "rating_count": 8,
            "hot_score": 0.4,
            "has_bundle": False,
            "bundle_size": None,
            "file_count": None,
            "featured_weight": 0,
            "created_at": "2026-04-11T10:00:00Z",
            "updated_at": "2026-04-14T10:00:00Z"
        }
    ]


@pytest.fixture
def temp_data_dir(tmp_path):
    """Create temporary data directory for tests."""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    
    # Create empty interactions.json
    interactions = {
        "likes": {},
        "favorites": {},
        "ratings": {}
    }
    with open(data_dir / "interactions.json", 'w') as f:
        json.dump(interactions, f)
    
    # Create sample skills.json
    skills = [
        {
            "skill_id": "sk_test001",
            "name": "Test Skill 1",
            "author": "Author 1",
            "category": "frontend",
            "description": "Description 1",
            "install_command": "npm install test1",
            "skill_md": "# Test 1",
            "skill_md_html": "<h1>Test 1</h1>",
            "tags": ["test"],
            "status": "published",
            "view_count": 10,
            "download_count": 5,
            "like_count": 2,
            "favorite_count": 1,
            "rating_avg": 4.0,
            "rating_count": 3,
            "hot_score": 0.3,
            "has_bundle": False,
            "bundle_size": None,
            "file_count": None,
            "featured_weight": 0,
            "created_at": "2026-04-15T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z"
        },
        {
            "skill_id": "sk_test002",
            "name": "Test Skill 2",
            "author": "Author 2",
            "category": "backend",
            "description": "Description 2",
            "install_command": "pip install test2",
            "skill_md": "# Test 2",
            "skill_md_html": "<h1>Test 2</h1>",
            "tags": ["test"],
            "status": "published",
            "view_count": 20,
            "download_count": 10,
            "like_count": 5,
            "favorite_count": 2,
            "rating_avg": 4.5,
            "rating_count": 4,
            "hot_score": 0.5,
            "has_bundle": False,
            "bundle_size": None,
            "file_count": None,
            "featured_weight": 0,
            "created_at": "2026-04-15T10:00:00Z",
            "updated_at": "2026-04-15T10:00:00Z"
        }
    ]
    with open(data_dir / "skills.json", 'w') as f:
        json.dump(skills, f)
    
    # Create categories.json
    with open(data_dir / "categories.json", 'w') as f:
        json.dump(DEFAULT_CATEGORIES, f)
    
    return data_dir
