# Backend Skeleton

This directory contains the backend skeleton generated from:

- `docs/spec/spec-B1/SPEC-B1-查询与数据层.md`
- `docs/spec/spec-B2/SPEC-B2-提交与安全.md`
- `docs/spec/spec-B3/SPEC-B3-互动与AI.md`

Current status:

- directory structure created
- module entry files created
- basic config files created
- no business implementation added yet

Suggested ownership:

- `routes/query_bp.py`, `storage/json_storage.py`, `services/skill_service.py`, `services/ranking_service.py`: B1
- `routes/submit_bp.py`, `services/zip_service.py`, `services/md_render.py`, `utils/validators.py`, `utils/rate_limiter.py`: B2
- `routes/interact_bp.py`, `routes/ai_bp.py`, `services/interaction_service.py`, `services/llm_service.py`, `storage/interaction_storage.py`, `utils/circuit_breaker.py`: B3
