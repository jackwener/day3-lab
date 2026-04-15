from pathlib import Path


def test_create_skill_returns_201_and_detail_renders_sanitized_html(client, storage):
    skill_md = (
        "# Title\n\n<script>alert(1)</script>\n\n"
        '<img src="javascript:alert(1)" onerror="alert(1)">'
    )
    response = client.post(
        "/api/v1/hub/skills",
        json={
            "name": "Secure Upload Notes",
            "category": "backend",
            "description": "Backend submission workflow",
            "skill_md": skill_md,
            "tags": ["flask", "zip"],
        },
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["skill_id"].startswith("sk_")
    assert payload["created_at"].endswith("Z")

    stored = storage.get_skill(payload["skill_id"])
    assert stored["status"] == "pending"
    assert stored["has_bundle"] is False
    assert "<script" not in stored["skill_md_html"]
    assert "javascript:" not in stored["skill_md_html"]
    assert "onerror" not in stored["skill_md_html"]
    assert stored["bundle_path"] is not None
    bundle_skill_md = (Path(stored["bundle_path"]) / "skill.md").read_text(encoding="utf-8")
    assert bundle_skill_md == skill_md

    detail = client.get(f"/api/v1/hub/skills/{payload['skill_id']}")
    assert detail.status_code == 200
    detail_payload = detail.get_json()
    assert detail_payload["skill_id"] == payload["skill_id"]
    assert detail_payload["view_count"] == 1
    assert "<script" not in detail_payload["skill_md_html"]


def test_create_skill_rejects_missing_required_field(client):
    response = client.post(
        "/api/v1/hub/skills",
        json={
            "name": "",
            "category": "backend",
            "description": "desc",
            "skill_md": "# Demo",
        },
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "EMPTY_FIELD"
    assert payload["error"]["details"]["field"] == "name"


def test_create_skill_rejects_invalid_category(client):
    response = client.post(
        "/api/v1/hub/skills",
        json={
            "name": "Bad Category",
            "category": "mlops",
            "description": "desc",
            "skill_md": "# Demo",
        },
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "INVALID_CATEGORY"


def test_create_skill_rejects_empty_category_as_required_field(client):
    response = client.post(
        "/api/v1/hub/skills",
        json={
            "name": "Bad Category",
            "category": "",
            "description": "desc",
            "skill_md": "# Demo",
        },
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "EMPTY_FIELD"
    assert payload["error"]["details"]["field"] == "category"


def test_create_skill_rate_limit_returns_429_on_11th_request(client):
    payload = {
        "name": "Rate Limited Skill",
        "category": "backend",
        "description": "desc",
        "skill_md": "# Demo",
    }

    for _ in range(10):
        response = client.post("/api/v1/hub/skills", json=payload)
        assert response.status_code == 201

    limited = client.post("/api/v1/hub/skills", json=payload)
    assert limited.status_code == 429
    assert limited.get_json()["error"]["code"] == "RATE_LIMITED"
