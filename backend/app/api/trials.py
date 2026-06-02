import hashlib
import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.trial_usage import TrialUsage
from app.services.email_service import send_email, send_email_with_images
from app.services.ai_service import generate_flier_image
from app.services.whatsapp_service import send_whatsapp
from app.services.sms_service import send_sms
from app.services.qr_service import qr_gif_to_base64, qr_gif_to_url

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

    # Handle invite trial - generate and send flyer via all channels
    if req.trial_type == "invite":
        test_email = req.payload.get("test_email")
        test_phone = req.payload.get("test_phone")
        if not test_email:
            raise HTTPException(status_code=400, detail="Email address required for invite test")

        title = req.payload.get("title", "Our Special Event")
        host_name = req.payload.get("host_name", "The Host")
        event_date = req.payload.get("event_date", "TBD")
        event_time = req.payload.get("event_time", "TBD")
        description = req.payload.get("description", "Join us for an unforgettable experience!")
        delivery_channels = req.payload.get("delivery_channels", [])
        guest_count = req.payload.get("guest_count", "100+")
        invite_template = req.payload.get("invite_template")
        qr_delivery = req.payload.get("qr_delivery", "with_qr")
        qr_style = req.payload.get("qr_style", "pulsing")

        # Define template-specific prompts
        template_prompts = {
            "elegant": f'Elegant, sophisticated invitation flyer for "{title}" hosted by {host_name}. Date: {event_date} at {event_time}. Refined fonts, classic colors, luxury aesthetic. Professional and classy design.',
            "bold": f'Bold, eye-catching invitation for "{title}". Vibrant colors, modern typography, energetic design. Make it stand out!',
            "minimal": f'Minimalist invitation for "{title}". Clean, simple design with plenty of white space. Professional and modern.',
            "vibrant": f'Colorful and fun invitation for "{title}". Playful design, vibrant colors, joyful atmosphere.',
            "corporate": f'Professional corporate invitation for "{title}". Business-ready style, clean layout, formal appearance.',
        }

        # Use template prompt if selected, otherwise use default
        if invite_template and invite_template in template_prompts:
            prompt = template_prompts[invite_template]
        else:
            prompt = f'Premium invitation flyer for "{title}" hosted by {host_name}. Date: {event_date} at {event_time}. Beautiful design optimized for mobile phones.'

        prompt += f" Include all event details visible at a glance. Message: {description}"

        # Generate invitation flyer image based on template (non-blocking)
        flyer_url = await generate_flier_image(prompt)

        # Generate animated QR code if QR delivery is enabled
        animated_qr_url = None
        if qr_delivery in ["with_qr", "qr_later"]:
            qr_data = f"accredit://invite/test/{int(datetime.now().timestamp())}"
            base_url = qr_gif_to_url(qr_data, size=250, style=qr_style)
            if base_url:
                animated_qr_url = base_url
            else:
                animated_qr_url = qr_gif_to_base64(qr_data, size=250, style=qr_style)

        # Send test invite flyer via all selected channels
        sent_channels = []

        # Send via email - embed flyer + QR as inline images (works in all email clients)
        if "email" in delivery_channels:
            upload_base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
            email_images = []
            qr_cid = ""
            qr_section = ""
            if animated_qr_url:
                qr_cid = "qr_code"
                qr_path = os.path.join(upload_base, "qrs", os.path.basename(animated_qr_url.rstrip("/").split("/")[-1]))
                qr_section = f"""
                <div style="text-align: center; padding: 20px; background: #f0f0f0; border-top: 2px solid #E91E8C;">
                    <p style="color: #666; font-size: 14px; margin: 0 0 15px 0; font-weight: bold;">YOUR UNIQUE ENTRY CODE</p>
                    <img src="cid:{qr_cid}" alt="Entry QR Code" style="width: 250px; height: 250px;" />
                    <p style="color: #999; font-size: 12px; margin: 15px 0 0 0;">Show this code at the gate to enter</p>
                </div>
                """
                email_images.append((qr_cid, qr_path))

            if flyer_url:
                flyer_cid = "flyer"
                flyer_path = os.path.join(upload_base, "fliers", os.path.basename(flyer_url.rstrip("/").split("/")[-1]))
                email_images.insert(0, (flyer_cid, flyer_path))
                html = f"""
                <html>
                <head>
                    <style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
                        .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                        .flyer {{ width: 100%; max-width: 500px; display: block; }}
                        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #999; background: #f8f9fc; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="cid:{flyer_cid}" alt="{title}" class="flyer" />
                        {qr_section}
                        <div class="footer">
                            <p><strong>This is a TEST invitation preview</strong></p>
                            <p>This is exactly how your guests will see your invitation when you send it for real.</p>
                            <p>Create an account at Accredit.vip to send real invitations to your guest list.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
            else:
                html = f"""
                <html>
                <head>
                    <style>
                        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
                        .container {{ max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
                        .content {{ padding: 30px; }}
                        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #999; background: #f8f9fc; }}
                        h2 {{ color: #E91E8C; margin: 0 0 10px; }}
                        .details {{ color: #23466f; line-height: 1.8; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="content">
                            <h2>{title}</h2>
                            <p class="details">
                                <strong>Host:</strong> {host_name}<br />
                                <strong>Date:</strong> {event_date}<br />
                                <strong>Time:</strong> {event_time}<br />
                                <strong>Description:</strong> {description}
                            </p>
                            {qr_section}
                        </div>
                        <div class="footer">
                            <p><strong>This is a TEST invitation preview</strong></p>
                            <p>Create an account at Accredit.vip to send real invitations to your guest list.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
            if email_images:
                await send_email_with_images(test_email, f"Your Test Invitation: {title}", html, email_images)
            else:
                await send_email(test_email, f"Your Test Invitation: {title}", html)
            sent_channels.append("Email")

        # Send via WhatsApp - try with media image, fallback to text-only
        if "whatsapp" in delivery_channels:
            send_to = test_phone or test_email
            whatsapp_msg = f"🎉 {title}\n\nYou're invited by {host_name}!\n{event_date} at {event_time}\n\n— Test preview by Accredit.vip"
            if flyer_url:
                ok = await send_whatsapp(send_to, whatsapp_msg, media_url=flyer_url)
                if not ok:
                    await send_whatsapp(send_to, whatsapp_msg)
            else:
                await send_whatsapp(send_to, whatsapp_msg)
            if animated_qr_url:
                ok = await send_whatsapp(send_to, "Your entry QR code:", media_url=animated_qr_url)
                if not ok:
                    await send_whatsapp(send_to, "Your entry QR code is ready!")
            sent_channels.append("WhatsApp")

        # Send via SMS - include flyer link
        if "sms" in delivery_channels:
            send_to = test_phone or test_email
            flyer_text = f"View flyer: {flyer_url}" if flyer_url else description
            qr_text = f" QR: {animated_qr_url}" if animated_qr_url else ""
            sms_msg = f"{title} - You're invited by {host_name}! {event_date} at {event_time}. {flyer_text}{qr_text} -Accredit.vip"
            await send_sms(send_to, sms_msg)
            sent_channels.append("SMS")

        response["sent_to"] = test_email
        response["sent_via"] = ", ".join(sent_channels) if sent_channels else "All channels"
        response["flyer_url"] = flyer_url
        if animated_qr_url:
            response["has_qr"] = True

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
