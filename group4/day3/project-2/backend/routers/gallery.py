from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from models import ok, err
import services.gallery_service as svc

router = APIRouter()


@router.get("")
async def history_list(
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
):
    result = svc.get_history_list(page=page, page_size=pageSize)
    return ok(result)


@router.get("/{history_id}")
async def history_detail(history_id: str):
    result = svc.get_history_detail(history_id)
    if result is None:
        return JSONResponse(status_code=404, content=err("HISTORY_NOT_FOUND", "历史记录不存在"))
    if isinstance(result, dict) and "error" in result:
        return JSONResponse(status_code=409, content=err(result["error"], result["message"]))
    return ok(result)


@router.delete("/{history_id}")
async def delete_one(history_id: str):
    success = svc.delete_history(history_id)
    if not success:
        return JSONResponse(status_code=404, content=err("HISTORY_NOT_FOUND", "历史记录不存在"))
    return ok({"deleted": history_id})


@router.delete("")
async def delete_all():
    count = svc.delete_all_history()
    return ok({"deletedCount": count})
