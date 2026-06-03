import json
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.models.invite import InviteMessage

router = APIRouter()


@router.post("/webhooks/whatsapp/status")
async def whatsapp_status_webhook(req: Request, db: AsyncSession = Depends(get_db)):
    body = await req.json()
    payload = json.dumps(body)
    entry = body.get("entry", [])
    for e in entry:
        changes = e.get("changes", [])
        for c in changes:
            value = c.get("value", {})
            statuses = value.get("statuses", [])
            for s in statuses:
                message_id = s.get("id")
                status = s.get("status")
                recipient_id = s.get("recipient_id")
                if not message_id:
                    continue
                result = await db.execute(
                    select(InviteMessage).where(
                        InviteMessage.id == int(message_id)
                        if message_id.isdigit()
                        else InviteMessage.id == -1
                    )
                )
                msg = result.scalar_one_or_none()
                if msg:
                    if status in ("delivered", "sent"):
                        msg.delivered_at = datetime.now(timezone.utc)
                    elif status == "read":
                        msg.opened_at = datetime.now(timezone.utc)
                    elif status == "failed":
                        msg.status = "failed"
                        msg.error = s.get("errors", [{}])[0].get("title", "Delivery failed")
                    if status in ("delivered", "sent", "read"):
                        msg.status = status
                    msg.webhook_payload = payload[:500]
                    await db.commit()
    return {"status": "ok"}


@router.get("/webhooks/whatsapp/status")
async def whatsapp_webhook_verify(req: Request):
    mode = req.query_params.get("hub.mode")
    token = req.query_params.get("hub.verify_token")
    challenge = req.query_params.get("hub.challenge")
    if mode == "subscribe" and token == "accredit_webhook_2024":
        return int(challenge)
    return {"error": "Verification failed"}


@router.post("/webhooks/twilio/status")
async def twilio_status_webhook(req: Request, db: AsyncSession = Depends(get_db)):
    form = await req.form()
    payload = dict(form)
    message_sid = payload.get("MessageSid", "")
    status = payload.get("MessageStatus", "")
    if message_sid:
        result = await db.execute(
            select(InviteMessage).where(InviteMessage.error == message_sid)
        )
        msg = result.scalar_one_or_none()
        if msg:
            if status in ("delivered", "sent"):
                msg.delivered_at = datetime.now(timezone.utc)
            elif status == "failed":
                msg.error = payload.get("ErrorCode", "Delivery failed")
            if status in ("delivered", "sent", "read", "failed"):
                msg.status = status
            msg.webhook_payload = json.dumps(payload)[:500]
            await db.commit()
    return ""
