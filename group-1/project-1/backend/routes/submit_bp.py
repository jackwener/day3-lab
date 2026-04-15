from __future__ import annotations

import io
import shutil
import uuid
import zipfile
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_file

from storage.json_storage import generate_skill_id, utc_now_iso
from utils.errors import ApiError
from utils.rate_limiter import rate_limit
from utils.trace import get_trace_id
from utils.validators import validate_create_skill, validate_upload_file


submit_bp = Blueprint("submit", __name__, url_prefix="/api/v1/hub")


@submit_bp.post("/skills")
@rate_limit(max_calls=10, period=60)
def create_skill():
    """
    创建技能
    ---
    tags:
      - Submit
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            description:
              type: string
            category:
              type: string
            tags:
              type: array
              items:
                type: string
            skill_md:
              type: string
    responses:
      201:
        description: 创建成功
      400:
        description: 参数错误
    """
    data = request.get_json(silent=True) or {}
    storage = current_app.extensions["storage"]
    validate_create_skill(data, storage.get_allowed_categories())

    skill_id = generate_skill_id()
    created_at = utc_now_iso()
    bundle_dir = _write_inline_bundle(skill_id, data["skill_md"])
    payload = _build_skill_payload(
        skill_id=skill_id,
        created_at=created_at,
        name=data["name"].strip(),
        description=data["description"].strip(),
        category=data["category"],
        tags=[tag.strip() for tag in (data.get("tags") or [])],
        skill_md=data["skill_md"],
        skill_md_html=current_app.extensions["md_render"].render(data["skill_md"]),
        has_bundle=False,
        bundle_path=str(bundle_dir),
        bundle_size=None,
        file_count=1,
    )

    try:
        storage.create_skill(payload)
    except Exception:
        shutil.rmtree(bundle_dir, ignore_errors=True)
        raise

    return _created_response({"skill_id": skill_id, "created_at": created_at})


@submit_bp.post("/skills/upload")
@rate_limit(max_calls=5, period=60)
def upload_skill_bundle():
    """
    上传技能包
    ---
    tags:
      - Submit
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: ZIP文件
      - name: override_name
        in: formData
        type: string
        description: 覆盖名称
    responses:
      201:
        description: 上传成功
      400:
        description: 文件错误
    """
    uploaded_file = request.files.get("file")
    upload_size = validate_upload_file(
        uploaded_file,
        int(current_app.config["MAX_UPLOAD_SIZE"]),
    )
    temp_zip_path = Path(current_app.config["TMP_DIR"]) / f"{uuid.uuid4().hex}.zip"
    bundle_dir = None

    try:
        uploaded_file.save(temp_zip_path)
        skill_id, inspection, payload = _prepare_uploaded_skill(temp_zip_path, upload_size)
        bundle_dir = Path(payload["bundle_path"])
        current_app.extensions["zip_service"].extract(temp_zip_path, bundle_dir, inspection)
        current_app.extensions["storage"].create_skill(payload)
        return _created_response(
            {
                "skill_id": skill_id,
                "name": payload["name"],
                "file_count": inspection.file_count,
                "bundle_size": payload["bundle_size"],
            }
        )
    except Exception:
        if bundle_dir is not None:
            shutil.rmtree(bundle_dir, ignore_errors=True)
        raise
    finally:
        temp_zip_path.unlink(missing_ok=True)


@submit_bp.get("/skills/<skill_id>/download")
def download_skill_bundle(skill_id: str):
    """
    下载技能包
    ---
    tags:
      - Submit
    parameters:
      - name: skill_id
        in: path
        type: string
        required: true
        description: 技能ID
    produces:
      - application/zip
    responses:
      200:
        description: ZIP文件
      404:
        description: 技能不存在
    """
    storage = current_app.extensions["storage"]
    skill = storage.get_skill(skill_id)
    if (
        skill is None
        or not skill.get("has_bundle")
        or not skill.get("bundle_path")
        or not Path(skill["bundle_path"]).exists()
    ):
        raise ApiError(code="SKILL_NOT_FOUND", status_code=404)

    archive_buffer = io.BytesIO()
    bundle_path = Path(skill["bundle_path"])
    with zipfile.ZipFile(archive_buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for file_path in sorted(bundle_path.rglob("*")):
            if file_path.is_file():
                archive.write(file_path, file_path.relative_to(bundle_path).as_posix())

    archive_buffer.seek(0)
    storage.increment_download(skill_id)
    return send_file(
        archive_buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{skill['name']}.zip",
    )


def _prepare_uploaded_skill(temp_zip_path: Path, upload_size: int):
    inspection = current_app.extensions["zip_service"].inspect(temp_zip_path)
    metadata = _resolve_upload_metadata(inspection.metadata)
    storage = current_app.extensions["storage"]
    validate_create_skill(
        {
            "name": metadata.get("name"),
            "category": metadata.get("category"),
            "description": metadata.get("description"),
            "skill_md": inspection.skill_md,
            "tags": metadata.get("tags") or [],
        },
        storage.get_allowed_categories(),
    )

    skill_id = generate_skill_id()
    created_at = utc_now_iso()
    payload = _build_skill_payload(
        skill_id=skill_id,
        created_at=created_at,
        name=metadata["name"].strip(),
        description=metadata["description"].strip(),
        category=metadata["category"],
        tags=[tag.strip() for tag in (metadata.get("tags") or [])],
        skill_md=inspection.skill_md,
        skill_md_html=current_app.extensions["md_render"].render(inspection.skill_md),
        has_bundle=True,
        bundle_path=str(Path(current_app.config["BUNDLES_DIR"]) / skill_id),
        bundle_size=upload_size,
        file_count=inspection.file_count,
    )
    return skill_id, inspection, payload


def _resolve_upload_metadata(metadata: dict) -> dict:
    resolved = metadata.copy()
    override_name = request.form.get("override_name", "").strip()
    if override_name:
        resolved["name"] = override_name
    return resolved


def _build_skill_payload(
    *,
    skill_id: str,
    created_at: str,
    name: str,
    description: str,
    category: str,
    tags: list[str],
    skill_md: str,
    skill_md_html: str,
    has_bundle: bool,
    bundle_path: str,
    bundle_size: int | None,
    file_count: int,
    author: str = "Anonymous",
    install_command: str = "",
):
    return {
        "skill_id": skill_id,
        "name": name,
        "author": author,
        "description": description,
        "category": category,
        "tags": tags,
        "skill_md": skill_md,
        "skill_md_html": skill_md_html,
        "status": "pending",
        "has_bundle": has_bundle,
        "bundle_path": bundle_path,
        "bundle_size": bundle_size,
        "file_count": file_count,
        "rating_avg": 0.0,
        "rating_count": 0,
        "view_count": 0,
        "download_count": 0,
        "like_count": 0,
        "favorite_count": 0,
        "hot_score": 0.0,
        "created_at": created_at,
        "updated_at": created_at,
        "install_command": install_command,
    }


def _write_inline_bundle(skill_id: str, skill_md: str) -> Path:
    bundle_dir = Path(current_app.config["BUNDLES_DIR"]) / skill_id
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "skill.md").write_text(skill_md, encoding="utf-8")
    return bundle_dir


def _created_response(payload: dict):
    response = jsonify({"traceId": get_trace_id(), **payload})
    response.status_code = 201
    return response
