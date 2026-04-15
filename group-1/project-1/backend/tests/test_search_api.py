"""Search API tests — 关键词搜索。"""


class TestSearchApi:
    """搜索相关测试。"""

    def test_search_by_keyword(self, client):
        resp = client.get("/api/v1/hub/skills?q=Test")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] >= 1

    def test_search_chinese_keyword(self, client):
        resp = client.get("/api/v1/hub/skills?q=测试")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] >= 1

    def test_search_no_results(self, client):
        resp = client.get("/api/v1/hub/skills?q=zzz_nonexistent_zzz")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_search_combined_with_category(self, client):
        resp = client.get("/api/v1/hub/skills?q=Test&category=frontend")
        assert resp.status_code == 200
        data = resp.get_json()
        for item in data["items"]:
            assert item["category"] == "frontend"

    def test_search_combined_with_sort(self, client):
        resp = client.get("/api/v1/hub/skills?q=test&sort=downloads")
        assert resp.status_code == 200
