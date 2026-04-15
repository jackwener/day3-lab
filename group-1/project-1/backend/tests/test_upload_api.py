import io
from pathlib import Path

from werkzeug.datastructures import FileStorage


def test_upload_skill_bundle_returns_201_and_persists_bundle(client, storage, make_zip):
    archive_bytes = make_zip(
        [
            {
                "name": "skill.md",
                "data": "---\nname: Uploaded Skill\n"
                "description: Uploaded from zip\n"
                "category: backend\n"
                "tags: [python, flask]\n"
                "---\n# Uploaded Skill\n",
            },
            {"name": "assets/readme.txt", "data": "bundle asset"},
        ]
    )

    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(archive_bytes), "skill-bundle.zip")},
    )

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["name"] == "Uploaded Skill"
    assert payload["file_count"] == 2
    assert payload["bundle_size"] == len(archive_bytes)

    stored = storage.get_skill(payload["skill_id"])
    assert stored["has_bundle"] is True
    assert stored["category"] == "backend"
    assert stored["tags"] == ["python", "flask"]
    assert Path(stored["bundle_path"]).joinpath("skill.md").exists()

    detail = client.get(f"/api/v1/hub/skills/{payload['skill_id']}")
    detail_payload = detail.get_json()
    assert detail_payload["name"] == "Uploaded Skill"
    assert detail_payload["description"] == "Uploaded from zip"
    assert detail_payload["category"] == "backend"
    assert detail_payload["tags"] == ["python", "flask"]


def test_upload_rejects_missing_root_skill_md(client, app, make_zip):
    archive_bytes = make_zip([{"name": "nested/skill.md", "data": "# Missing"}])

    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(archive_bytes), "missing.zip")},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "MISSING_SKILL_MD"
    assert list(Path(app.config["TMP_DIR"]).iterdir()) == []


def test_upload_rejects_bundle_limit_exceeded(client, make_zip):
    entries = [{"name": "skill.md", "data": "# Demo"}]
    entries.extend(
        {"name": f"files/{index}.txt", "data": "x"} for index in range(201)
    )
    archive_bytes = make_zip(entries)

    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(archive_bytes), "too-many-files.zip")},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"]["code"] == "BUNDLE_LIMIT_EXCEEDED"


def test_upload_rejects_unsafe_zip_without_creating_bundle_dir(client, app, make_zip):
    archive_bytes = make_zip(
        [
            {
                "name": "skill.md",
                "data": "---\nname: Unsafe\n"
                "description: desc\n"
                "category: backend\n"
                "---\n# Unsafe\n",
            },
            {"name": "../escape.txt", "data": "boom"},
        ]
    )

    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(archive_bytes), "unsafe.zip")},
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "UNSAFE_ZIP"
    new_bundles = [p for p in Path(app.config["BUNDLES_DIR"]).iterdir() if p.name != "sk_test_001"]
    assert new_bundles == []


def test_upload_rejects_zip_larger_than_10mb(client):
    oversized = b"a" * (10 * 1024 * 1024 + 1)

    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(oversized), "too-large.zip")},
    )

    assert response.status_code == 413
    payload = response.get_json()
    assert payload["error"]["code"] == "FILE_TOO_LARGE"


def test_upload_rejects_oversized_file_before_saving(client, monkeypatch):
    save_called = False
    original_save = FileStorage.save

    def fake_save(self, dst, buffer_size=16384):
        nonlocal save_called
        save_called = True
        return original_save(self, dst, buffer_size=buffer_size)

    monkeypatch.setattr(FileStorage, "save", fake_save)

    oversized = b"a" * (10 * 1024 * 1024 + 1)
    response = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(oversized), "too-large.zip")},
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "FILE_TOO_LARGE"
    assert save_called is False


def test_upload_rate_limit_returns_429_on_6th_request(client, make_zip):
    archive_bytes = make_zip(
        [
            {
                "name": "skill.md",
                "data": "---\nname: Upload Limited\n"
                "description: desc\n"
                "category: backend\n"
                "---\n# Upload Limited\n",
            }
        ]
    )

    for _ in range(5):
        response = client.post(
            "/api/v1/hub/skills/upload",
            data={"file": (io.BytesIO(archive_bytes), "limited.zip")},
        )
        assert response.status_code == 201

    limited = client.post(
        "/api/v1/hub/skills/upload",
        data={"file": (io.BytesIO(archive_bytes), "limited.zip")},
    )
    assert limited.status_code == 429
    assert limited.get_json()["error"]["code"] == "RATE_LIMITED"
