from fastapi import APIRouter
from fastapi.responses import JSONResponse

from models import InitRitualRequest, RevealRequest, ChoiceRequest, ok, err
import services.ritual_service as svc

router = APIRouter()


@router.post("")
async def init_ritual(body: InitRitualRequest = None):
    if body is None:
        body = InitRitualRequest()
    result = svc.create_ritual(enable_dice=body.enableDice if body.enableDice is not None else True)
    return ok(result)


@router.post("/{ritual_id}/dice-roll")
async def dice_roll(ritual_id: str):
    result = svc.roll_dice(ritual_id)
    if result is None:
        return JSONResponse(status_code=404, content=err("RITUAL_NOT_FOUND", "会话不存在"))
    if "error" in result:
        code = result["error"]
        status = 409 if "STATE" in code or "FINALIZED" in code else 400
        return JSONResponse(status_code=status, content=err(code, result["message"]))
    return ok(result)


@router.get("/{ritual_id}/draw-pool")
async def draw_pool(ritual_id: str):
    result = svc.get_draw_pool(ritual_id)
    if result is None:
        return JSONResponse(status_code=404, content=err("RITUAL_NOT_FOUND", "会话不存在"))
    if "error" in result:
        code = result["error"]
        status = 409 if "STATE" in code else 400
        return JSONResponse(status_code=status, content=err(code, result["message"]))
    return ok(result)


@router.post("/{ritual_id}/reveal")
async def reveal(ritual_id: str, body: RevealRequest):
    result = svc.reveal_cards(ritual_id, body.selectedCardIds)
    if result is None:
        return JSONResponse(status_code=404, content=err("RITUAL_NOT_FOUND", "会话不存在"))
    if "error" in result:
        code = result["error"]
        status = 409 if "STATE" in code else 400
        return JSONResponse(status_code=status, content=err(code, result["message"]))
    return ok(result)


@router.post("/{ritual_id}/choice")
async def choice(ritual_id: str, body: ChoiceRequest):
    result = svc.submit_choice(ritual_id, body.fateChoice)
    if result is None:
        return JSONResponse(status_code=404, content=err("RITUAL_NOT_FOUND", "会话不存在"))
    if "error" in result:
        code = result["error"]
        status = 409 if "STATE" in code or "FINALIZED" in code else 400
        return JSONResponse(status_code=status, content=err(code, result["message"]))
    return ok(result)


@router.get("/{ritual_id}/report")
async def report(ritual_id: str):
    result = svc.get_report(ritual_id)
    if result is None:
        return JSONResponse(status_code=404, content=err("RITUAL_NOT_FOUND", "会话不存在"))
    if "error" in result:
        code = result["error"]
        status = 409 if "STATE" in code else 400
        return JSONResponse(status_code=status, content=err(code, result["message"]))
    return ok(result)
