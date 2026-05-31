from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_service import chat, generate_flier_image

router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict]


class FlierRequest(BaseModel):
    prompt: str


@router.post("/chat")
async def ai_chat(req: ChatRequest):
    reply = await chat(req.messages)
    return {"reply": reply}


@router.post("/generate-flier")
async def ai_generate_flier(req: FlierRequest):
    url = await generate_flier_image(req.prompt)
    if not url:
        raise HTTPException(status_code=503, detail="AI not configured. Set OPENAI_API_KEY.")
    return {"url": url}
