import io
import zipfile


def test_download_bundle_returns_zip_and_increments_count(client, storage, make_zip):
    upload_response = client.post(
        "/api/v1/hub/skills/upload",
        data={
            "file": (
                io.BytesIO(
                    make_zip(
                        [
                            {
                                "name": "skill.md",
                                "data": "---\nname: Downloadable\n"
                                "description: for download\n"
                                "category: backend\n"
                                "---\n# Downloadable\n",
                            },
                            {"name": "docs/readme.txt", "data": "hello"},
                        ]
                    )
                ),
                "downloadable.zip",
            )
        },
    )
    skill_id = upload_response.get_json()["skill_id"]

    response = client.get(f"/api/v1/hub/skills/{skill_id}/download")

    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/zip"
    assert "attachment;" in response.headers["Content-Disposition"]

    archive = zipfile.ZipFile(io.BytesIO(response.data))
    assert sorted(archive.namelist()) == ["docs/readme.txt", "skill.md"]
    assert storage.get_skill(skill_id)["download_count"] == 1


def test_download_returns_404_for_missing_or_unbundled_skill(client):
    missing = client.get("/api/v1/hub/skills/sk_missing/download")
    assert missing.status_code == 404
    assert missing.get_json()["error"]["code"] == "SKILL_NOT_FOUND"

    create_response = client.post(
        "/api/v1/hub/skills",
        json={
            "name": "Draft Only",
            "category": "backend",
            "description": "No bundle yet",
            "skill_md": "# Draft",
        },
    )
    skill_id = create_response.get_json()["skill_id"]

    unbundled = client.get(f"/api/v1/hub/skills/{skill_id}/download")
    assert unbundled.status_code == 404
    assert unbundled.get_json()["error"]["code"] == "SKILL_NOT_FOUND"
