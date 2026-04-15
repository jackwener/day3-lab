"""问答路由 — /api/chat"""
from flask import Blueprint, request, Response, stream_with_context
from utils.response import success_response, error_response
from services import chat_service

chat_bp = Blueprint("chat", __name__)


@chat_bp.post("/ask")
def ask():
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return error_response(400, "EMPTY_QUESTION", "问题不能为空")

    history = body.get("history", [])
    stream = body.get("stream", False)

    if stream:
        def generate():
            for chunk in chat_service.ask_stream(question, history):
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    else:
        data = chat_service.ask(question, history)
        return success_response(data)
