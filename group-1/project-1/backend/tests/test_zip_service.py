from pathlib import Path
import stat

import pytest

from services.zip_service import ZipService
from utils.errors import ApiError


def test_inspect_reads_frontmatter_and_counts_files(tmp_path, make_zip):
    zip_path = tmp_path / "bundle.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {
                    "name": "skill.md",
                    "data": "---\nname: API Hardening\n"
                    "description: Harden upload flows\n"
                    "category: security\n"
                    "tags: [flask, zip]\n"
                    "---\n# API Hardening\n",
                },
                {"name": "docs/notes.txt", "data": "hello"},
            ]
        )
    )

    inspection = ZipService().inspect(zip_path)

    assert inspection.file_count == 2
    assert inspection.skill_md.startswith("---")
    assert inspection.metadata == {
        "name": "API Hardening",
        "description": "Harden upload flows",
        "category": "security",
        "tags": ["flask", "zip"],
    }


def test_inspect_rejects_zip_slip_paths(tmp_path, make_zip):
    zip_path = tmp_path / "unsafe.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {"name": "skill.md", "data": "# ok"},
                {"name": "../escape.txt", "data": "boom"},
            ]
        )
    )

    with pytest.raises(ApiError) as error:
        ZipService().inspect(zip_path)

    assert error.value.code == "UNSAFE_ZIP"
    assert error.value.details["entry"] == "../escape.txt"


def test_inspect_rejects_absolute_paths(tmp_path, make_zip):
    zip_path = tmp_path / "absolute.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {"name": "skill.md", "data": "# ok"},
                {"name": "/tmp/escape.txt", "data": "boom"},
            ]
        )
    )

    with pytest.raises(ApiError) as error:
        ZipService().inspect(zip_path)

    assert error.value.code == "UNSAFE_ZIP"
    assert error.value.details["entry"] == "/tmp/escape.txt"


def test_inspect_rejects_symbolic_links(tmp_path, make_zip):
    zip_path = tmp_path / "symlink.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {"name": "skill.md", "data": "# ok"},
                {
                    "name": "assets/link.txt",
                    "data": "ignored",
                    "external_attr": (stat.S_IFLNK | 0o777) << 16,
                },
            ]
        )
    )

    with pytest.raises(ApiError) as error:
        ZipService().inspect(zip_path)

    assert error.value.code == "UNSAFE_ZIP"
    assert error.value.details["entry"] == "assets/link.txt"


def test_inspect_requires_root_skill_md(tmp_path, make_zip):
    zip_path = tmp_path / "missing-skill-md.zip"
    zip_path.write_bytes(make_zip([{"name": "nested/skill.md", "data": "# nope"}]))

    with pytest.raises(ApiError) as error:
        ZipService().inspect(zip_path)

    assert error.value.code == "MISSING_SKILL_MD"


def test_inspect_parses_real_yaml_frontmatter(tmp_path, make_zip):
    zip_path = tmp_path / "yaml-frontmatter.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {
                    "name": "skill.md",
                    "data": "---\nname: \"Uploaded: Skill\"\n"
                    "description: >\n"
                    "  Uploaded from zip\n"
                    "  with folded lines\n"
                    "category: backend\n"
                    "tags:\n"
                    "  - python\n"
                    "  - flask\n"
                    "---\n# Uploaded Skill\n",
                }
            ]
        )
    )

    inspection = ZipService().inspect(zip_path)

    assert inspection.metadata["name"] == "Uploaded: Skill"
    assert inspection.metadata["description"] == "Uploaded from zip with folded lines"
    assert inspection.metadata["tags"] == ["python", "flask"]


def test_extract_bundle_writes_files_under_target_directory(tmp_path, make_zip):
    zip_path = tmp_path / "extract.zip"
    zip_path.write_bytes(
        make_zip(
            [
                {"name": "skill.md", "data": "# Demo"},
                {"name": "assets/example.txt", "data": "asset"},
            ]
        )
    )

    service = ZipService()
    inspection = service.inspect(zip_path)
    bundle_dir = tmp_path / "bundle"

    service.extract(zip_path, bundle_dir, inspection)

    assert (bundle_dir / "skill.md").read_text(encoding="utf-8") == "# Demo"
    assert (bundle_dir / "assets" / "example.txt").read_text(encoding="utf-8") == "asset"
