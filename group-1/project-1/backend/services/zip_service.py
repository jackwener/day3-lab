from __future__ import annotations

import os
import shutil
import stat
import zipfile
from dataclasses import dataclass
from pathlib import Path

import yaml

from utils.errors import ApiError, ValidationError


@dataclass(slots=True)
class BundleInspection:
    metadata: dict
    skill_md: str
    file_count: int
    total_uncompressed_size: int


class ZipService:
    def __init__(self, max_bundle_size: int = 50 * 1024 * 1024, max_files: int = 200):
        self.max_bundle_size = max_bundle_size
        self.max_files = max_files

    def inspect(self, zip_path: str | Path) -> BundleInspection:
        skill_md = None
        metadata = {}
        file_count = 0
        total_size = 0

        with zipfile.ZipFile(zip_path, "r") as archive:
            for member in archive.infolist():
                normalized_name = self._validate_member(member)
                if member.is_dir():
                    continue

                file_count += 1
                total_size += int(member.file_size)
                if total_size > self.max_bundle_size or file_count > self.max_files:
                    raise ValidationError(
                        "BUNDLE_LIMIT_EXCEEDED",
                        {"max_size": self.max_bundle_size, "max_files": self.max_files},
                    )

                if normalized_name.lower() == "skill.md":
                    skill_md = archive.read(member).decode("utf-8")
                    metadata = self._parse_frontmatter(skill_md)

        if skill_md is None:
            raise ValidationError("MISSING_SKILL_MD")

        return BundleInspection(
            metadata=metadata,
            skill_md=skill_md,
            file_count=file_count,
            total_uncompressed_size=total_size,
        )

    def extract(
        self,
        zip_path: str | Path,
        bundle_dir: str | Path,
        inspection: BundleInspection | None = None,
    ) -> None:
        if inspection is None:
            inspection = self.inspect(zip_path)

        target_dir = Path(bundle_dir)
        target_dir.mkdir(parents=True, exist_ok=True)

        try:
            with zipfile.ZipFile(zip_path, "r") as archive:
                for member in archive.infolist():
                    normalized_name = self._validate_member(member)
                    destination = target_dir / normalized_name
                    if not destination.resolve().is_relative_to(target_dir.resolve()):
                        raise ApiError(
                            code="UNSAFE_ZIP",
                            status_code=400,
                            details={"entry": member.filename},
                        )
                    if member.is_dir():
                        destination.mkdir(parents=True, exist_ok=True)
                        continue

                    destination.parent.mkdir(parents=True, exist_ok=True)
                    with archive.open(member, "r") as source, destination.open("wb") as target:
                        shutil.copyfileobj(source, target)
        except Exception:
            shutil.rmtree(target_dir, ignore_errors=True)
            raise

    def _validate_member(self, member: zipfile.ZipInfo) -> str:
        normalized_name = os.path.normpath(member.filename.replace("\\", "/"))
        if normalized_name.startswith("..") or os.path.isabs(normalized_name):
            raise ApiError(
                code="UNSAFE_ZIP",
                status_code=400,
                details={"entry": member.filename},
            )

        mode = member.external_attr >> 16
        if mode and stat.S_ISLNK(mode):
            raise ApiError(
                code="UNSAFE_ZIP",
                status_code=400,
                details={"entry": member.filename},
            )

        return normalized_name

    def _parse_frontmatter(self, skill_md: str) -> dict:
        normalized = skill_md.replace("\r\n", "\n")
        if not normalized.startswith("---\n"):
            return {"category": "other"}

        end_marker = normalized.find("\n---\n", 4)
        if end_marker == -1:
            return {"category": "other"}

        frontmatter_block = normalized[4:end_marker]
        parsed = yaml.safe_load(frontmatter_block) or {}
        if not isinstance(parsed, dict):
            return {"category": "other"}

        tags = parsed.get("tags", [])
        if not isinstance(tags, list):
            tags = []

        # Get category with fallback to "other"
        category = _optional_string(parsed.get("category"))
        if category is None:
            category = "other"

        return {
            "name": _optional_string(parsed.get("name")),
            "description": _optional_string(parsed.get("description")),
            "category": category,
            "tags": [str(tag).strip() for tag in tags if str(tag).strip()],
        }


def _optional_string(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
