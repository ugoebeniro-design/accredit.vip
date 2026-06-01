import hashlib
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.trial_usage import TrialUsage
from app.services.email_service import send_email
from app.services.ai_service import generate_flier_image
from app.services.whatsapp_service import send_whatsapp
from app.services.sms_service import send_sms

router = APIRouter()

ALLOWED_TRIAL_TYPES = {"invite", "event"}


class TrialCheckRequest(BaseModel):
    trial_type: str = Field(pattern="^(invite|event)$")
    fingerprint: str = Field(min_length=16, max_length=256)


class TrialUseRequest(TrialCheckRequest):
    payload: dict = Field(default_factory=dict)


def _hash(value: str) -> str:
    return hashlib.sha256(f"{settings.SECRET_KEY}:{value}".encode("utf-8")).hexdigest()


def _client_hash(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    ua = request.headers.get("user-agent", "unknown")
    return _hash(f"{ip}:{ua}")


def _payload_summary(payload: dict) -> str:
    safe = {
        "title": payload.get("title"),
        "host_name": payload.get("host_name"),
        "delivery_channel": payload.get("delivery_channel"),
        "delivery_channels": payload.get("delivery_channels"),
        "guest_count": payload.get("guest_count"),
        "guest_range": payload.get("guest_range"),
        "guest_count_range": payload.get("guest_count_range"),
        "estimated_price": payload.get("estimated_price"),
        "pricing_units": payload.get("pricing_units"),
        "qr_included": payload.get("qr_included"),
    }
    return json.dumps(safe, sort_keys=True)


@router.post("/check")
async def check_trial(
    req: TrialCheckRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    fingerprint_hash = _hash(req.fingerprint)
    client_hash = _client_hash(request)
    result = await db.execute(
        select(TrialUsage).where(
            TrialUsage.trial_type == req.trial_type,
            (TrialUsage.fingerprint_hash == fingerprint_hash) | (TrialUsage.client_hash == client_hash),
        )
    )
    used = result.scalar_one_or_none() is not None
    return {"allowed": not used, "used": used}


@router.post("/use")
async def use_trial(
    req: TrialUseRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if req.trial_type not in ALLOWED_TRIAL_TYPES:
        raise HTTPException(status_code=400, detail="Invalid trial type")

    fingerprint_hash = _hash(req.fingerprint)
    client_hash = _client_hash(request)
    result = await db.execute(
        select(TrialUsage).where(
            TrialUsage.trial_type == req.trial_type,
            (TrialUsage.fingerprint_hash == fingerprint_hash) | (TrialUsage.client_hash == client_hash),
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="You have already tested this feature. Create an account to continue.",
        )

    response = {
        "allowed": False,
        "message": "Trial used. Create an account to continue.",
    }

    # Handle invite trial - send preview email
    if req.trial_type == "invite":
        test_email = req.payload.get("test_email")
        if not test_email:
            raise HTTPException(status_code=400, detail="Email address required for invite test")

        title = req.payload.get("title", "Our Special Event")
        host_name = req.payload.get("host_name", "The Host")
        event_date = req.payload.get("event_date", "TBD")
        event_time = req.payload.get("event_time", "TBD")
        description = req.payload.get("description", "Join us for an unforgettable experience!")
        delivery_channels = req.payload.get("delivery_channels", [])
        guest_count = req.payload.get("guest_count", "100+")

        # Generate HTML for test invite email
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; color: #333; background: #f5f5f5; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #E91E8C 0%, #d0147a 100%); color: white; padding: 40px 20px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; font-weight: bold; }}
                .content {{ padding: 40px 20px; }}
                .section {{ margin-bottom: 30px; }}
                .label {{ color: #999; font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }}
                .value {{ margin-top: 8px; font-size: 16px; font-weight: 500; color: #0D1B2A; }}
                .channels {{ margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }}
                .channel-badge {{ background: #f0f0f0; padding: 6px 12px; border-radius: 20px; font-size: 13px; color: #666; }}
                .footer {{ background: #f8f9fc; padding: 20px; text-align: center; color: #999; font-size: 12px; }}
                .warning {{ background: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                .warning-text {{ font-size: 13px; color: #856404; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{title}</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">This is a test preview</p>
                </div>
                <div class="content">
                    <div class="section">
                        <div class="label">Host</div>
                        <div class="value">{host_name}</div>
                    </div>
                    <div class="section">
                        <div class="label">Date & Time</div>
                        <div class="value">{event_date} at {event_time}</div>
                    </div>
                    <div class="section">
                        <div class="label">Expected Guests</div>
                        <div class="value">{guest_count}</div>
                    </div>
                    <div class="section">
                        <div class="label">Will be delivered via</div>
                        <div class="channels">
                            {" ".join([f'<div class="channel-badge">{ch.upper()}</div>' for ch in delivery_channels])}
                        </div>
                    </div>
                    <div class="section">
                        <div class="label">Message</div>
                        <div class="value">{description}</div>
                    </div>
                    <div class="warning">
                        <div class="warning-text">
                            <strong>This is a TEST preview.</strong> Your real invites won't be sent until you create an account and configure your guest list.
                        </div>
                    </div>
                </div>
                <div class="footer">
                    <p>This is a preview of your test invitation sent by Accredit.vip</p>
                    <p>Create an account to save your setup and send real invitations to your guest list.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send test invite via all selected channels
        sent_channels = []

        # Send via email
        if "email" in delivery_channels:
            await send_email(test_email, f"TEST PREVIEW: {title} - Invitation Preview", html)
            sent_channels.append("Email")

        # Send via WhatsApp
        if "whatsapp" in delivery_channels:
            whatsapp_text = f"TEST PREVIEW: {title}\n\nHost: {host_name}\nDate & Time: {event_date} at {event_time}\n\n{description}\n\n[This is a test preview sent by Accredit.vip]"
            await send_whatsapp(test_email, whatsapp_text)
            sent_channels.append("WhatsApp")

        # Send via SMS
        if "sms" in delivery_channels:
            sms_text = f"[Accredit.vip TEST] {title} by {host_name}. {event_date} at {event_time}. {description[:60]}... Reply or create account to continue."
            await send_sms(test_email, sms_text)
            sent_channels.append("SMS")

        response["sent_to"] = test_email
        response["sent_via"] = ", ".join(sent_channels) if sent_channels else "All channels"

    # Handle event trial - generate flier preview
    elif req.trial_type == "event":
        title = req.payload.get("title", "Upcoming Event")
        venue = req.payload.get("venue", "TBD")
        category = req.payload.get("category", "Event")
        event_date = req.payload.get("event_date", "TBD")

        # Generate flier prompt
        flier_prompt = f'Event poster for "{title}". Category: {category}. Location: {venue}. Date: {event_date}. Professional event marketing design.'

        # Generate flier image
        flier_url = await generate_flier_image(flier_prompt)
        if flier_url:
            response["flier_url"] = flier_url
        else:
            # Fallback if image generation fails
            response["message"] = "Event preview generated. Image generation is currently unavailable, but you can see the event details above."

    # Record trial usage
    usage = TrialUsage(
        trial_type=req.trial_type,
        fingerprint_hash=fingerprint_hash,
        client_hash=client_hash,
        summary=_payload_summary(req.payload),
    )
    db.add(usage)
    await db.commit()

    return response
