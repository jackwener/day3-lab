from __future__ import annotations

import os

from utils.errors import ValidationError


def _require_text(data: dict, field: str, max_length: int) -> None:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValidationError("EMPTY_FIELD", {"field": field})
    if len(value.strip()) > max_length:
        raise ValidationError("EMPTY_FIELD", {"field": field})


def validate_create_skill(data: dict, allowed_categories: set[str]) -> None:
    _require_text(data, "name", 80)
    _require_text(data, "description", 200)
    _require_text(data, "skill_md", 10000)

    category = data.get("category")
    if not isinstance(category, str) or not category.strip():
        raise ValidationError("EMPTY_FIELD", {"field": "category"})
    if category not in allowed_categories:
        raise ValidationError(
            "INVALID_CATEGORY",
            {"field": "category", "allowed": sorted(allowed_categories)},
        )

    tags = data.get("tags", [])
    if tags is None:
        tags = []
    if not isinstance(tags, list) or len(tags) > 6:
        raise ValidationError("INVALID_TAG", {"field": "tags"})

    normalized_tags = []
    for tag in tags:
        if not isinstance(tag, str) or not tag.strip() or len(tag.strip()) > 20:
            raise ValidationError("INVALID_TAG", {"field": "tags"})
        normalized_tags.append(tag.strip())

    if len(set(normalized_tags)) != len(normalized_tags):
        raise ValidationError("INVALID_TAG", {"field": "tags"})


def validate_upload_file(file, max_size_bytes: int) -> int:
    if file is None or not getattr(file, "filename", ""):
        raise ValidationError("EMPTY_FIELD", {"field": "file"})

    if not file.filename.lower().endswith(".zip"):
        raise ValidationError("INVALID_QUERY", {"field": "file"})

    file_size = _detect_file_size(file)
    if file_size is not None and file_size > max_size_bytes:
        raise ValidationError("FILE_TOO_LARGE", {"max_mb": 10}, status_code=413)
    return file_size or 0


def _detect_file_size(file) -> int | None:
    content_length = getattr(file, "content_length", None)
    if isinstance(content_length, int) and content_length > 0:
        return content_length

    stream = getattr(file, "stream", None)
    if stream is None or not hasattr(stream, "seek") or not hasattr(stream, "tell"):
        return None

    current_position = stream.tell()
    stream.seek(0, os.SEEK_END)
    file_size = stream.tell()
    stream.seek(current_position)
    return int(file_size)
