import json, logging
from fastapi import APIRouter, Depends, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.models.invite import InviteMessage
from app.services.webhook_security import WebhookSecurityService
from app.services.audit import AuditService

router = APIRouter()
logger = logging.getLogger(__name__)


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


@router.post("/webhooks/paystack")
async def paystack_webhook(req: Request, db: AsyncSession = Depends(get_db)):
    """
    SECURITY: Paystack webhook handler with signature verification
    Verifies webhook is from Paystack before processing payment events
    """
    body = await req.body()

    try:
        # SECURITY: Verify Paystack signature to prevent spoofed webhooks
        data = await WebhookSecurityService.verify_paystack_signature(
            request=req,
            body=body,
            paystack_secret_key=settings.PAYSTACK_SECRET_KEY,
        )

        event = data.get("event")
        payment_data = data.get("data", {})
        reference = payment_data.get("reference")

        logger.info(f"Valid Paystack webhook: {event} for reference {reference}")

        # Log webhook received
        await AuditService.log_event(
            db=db,
            user_id=None,
            action=f"webhook_{event}",
            resource_type="payment",
            resource_id=None,
            request=req,
            description=f"Paystack {event}: {reference}",
        )

        # Handle specific payment events
        if event == "charge.success":
            # Payment successful - update order/transaction status
            logger.info(f"Payment successful: {reference}")
            # TODO: Update transaction status in database
            pass

        elif event == "charge.failed":
            # Payment failed
            logger.warning(f"Payment failed: {reference}")
            # TODO: Update transaction status to failed
            pass

        elif event == "invoice.payment_requested":
            # Invoice payment requested
            logger.info(f"Invoice payment requested: {reference}")
            # TODO: Update invoice status
            pass

        return {"status": "ok"}

    except HTTPException as e:
        logger.error(f"Paystack webhook verification failed: {e.detail}")
        raise
