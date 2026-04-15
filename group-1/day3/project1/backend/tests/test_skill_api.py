"""Skill API tests — 列表、详情、标签、分类端点。"""


class TestListSkills:
    """GET /api/v1/hub/skills 列表与筛选。"""

    def test_list_skills_default(self, client):
        resp = client.get("/api/v1/hub/skills")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "traceId" in data
        assert "items" in data
        assert "total" in data
        assert data["total"] == 2  # only published
        assert data["page"] == 1
        assert data["page_size"] == 12

    def test_list_skills_filter_category(self, client):
        resp = client.get("/api/v1/hub/skills?category=frontend")
        data = resp.get_json()
        assert data["total"] == 1
        assert data["items"][0]["category"] == "frontend"

    def test_list_skills_invalid_category(self, client):
        resp = client.get("/api/v1/hub/skills?category=invalid_cat")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_CATEGORY"

    def test_list_skills_sort_downloads(self, client):
        resp = client.get("/api/v1/hub/skills?sort=downloads")
        data = resp.get_json()
        assert resp.status_code == 200
        items = data["items"]
        if len(items) > 1:
            assert items[0]["download_count"] >= items[1]["download_count"]

    def test_list_skills_sort_rating(self, client):
        resp = client.get("/api/v1/hub/skills?sort=rating")
        assert resp.status_code == 200

    def test_list_skills_sort_latest(self, client):
        resp = client.get("/api/v1/hub/skills?sort=latest")
        assert resp.status_code == 200

    def test_list_skills_invalid_sort(self, client):
        resp = client.get("/api/v1/hub/skills?sort=invalid")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_QUERY"

    def test_list_skills_pagination(self, client):
        resp = client.get("/api/v1/hub/skills?page=1&page_size=1")
        data = resp.get_json()
        assert len(data["items"]) == 1
        assert data["total"] == 2

    def test_list_skills_invalid_page_size(self, client):
        resp = client.get("/api/v1/hub/skills?page_size=100")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_PAGE"

    def test_list_skills_invalid_page_size_zero(self, client):
        resp = client.get("/api/v1/hub/skills?page_size=0")
        assert resp.status_code == 400

    def test_list_skills_query_too_long(self, client):
        long_q = "a" * 201
        resp = client.get(f"/api/v1/hub/skills?q={long_q}")
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["error"]["code"] == "INVALID_QUERY"

    def test_list_skills_tags_filter(self, client):
        resp = client.get("/api/v1/hub/skills?tags=test,frontend")
        data = resp.get_json()
        assert data["total"] == 1


class TestSkillDetail:
    """GET /api/v1/hub/skills/<id> 详情。"""

    def test_get_detail_success(self, client):
        resp = client.get("/api/v1/hub/skills/sk_test_001")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["skill_id"] == "sk_test_001"
        assert "skill_md" in data
        assert "skill_md_html" in data
        assert "created_at" in data
        assert "traceId" in data
        assert data["has_bundle"] is True
        assert data["bundle_size"] == 1024

    def test_get_detail_increments_view(self, client):
        # 第一次请求
        resp1 = client.get("/api/v1/hub/skills/sk_test_001")
        view1 = resp1.get_json()["view_count"]
        # 第二次请求
        resp2 = client.get("/api/v1/hub/skills/sk_test_001")
        view2 = resp2.get_json()["view_count"]
        assert view2 == view1 + 1

    def test_get_detail_not_found(self, client):
        resp = client.get("/api/v1/hub/skills/sk_nonexistent")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["error"]["code"] == "SKILL_NOT_FOUND"


class TestTags:
    """GET /api/v1/hub/skills/tags 标签频率。"""

    def test_get_tags(self, client):
        resp = client.get("/api/v1/hub/skills/tags")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "traceId" in data
        assert "items" in data
        assert isinstance(data["items"], list)
        # 检查结构
        if data["items"]:
            item = data["items"][0]
            assert "tag" in item
            assert "count" in item


class TestCategories:
    """GET /api/v1/hub/categories 分类白名单。"""

    def test_get_categories(self, client):
        resp = client.get("/api/v1/hub/categories")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "traceId" in data
        assert len(data["items"]) == 8
        keys = {c["key"] for c in data["items"]}
        assert "frontend" in keys
        assert "backend" in keys

    def test_categories_have_count(self, client):
        resp = client.get("/api/v1/hub/categories")
        data = resp.get_json()
        for item in data["items"]:
            assert "key" in item
            assert "label" in item
            assert "count" in item
