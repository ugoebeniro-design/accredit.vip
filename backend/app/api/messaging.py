import os
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.flier import FlierAsset
from app.models.invite import InviteBatch, InviteMessage
from app.models.payment import Payment
from app.api.qr_codes import get_or_create_guest_qr
from app.services.email_service import send_email, send_email_with_images
from app.services.sms_service import send_sms
from app.services.whatsapp_service import send_whatsapp
from app.services.whatsapp_cloud_service import send_whatsapp_cloud
from app.services.qr_service import qr_gif_to_url

RESEND_PRICE_PER_GUEST = 500  # NGN per guest for re-sending

router = APIRouter()


class SendInvitesRequest(BaseModel):
    channel: str


class SendGuestInviteRequest(BaseModel):
    channel: str


def is_valid_phone(value: str | None) -> bool:
    if not value:
        return False
    compact = re.sub(r"[\s().-]", "", value)
    return bool(re.fullmatch(r"\+?[1-9]\d{7,14}", compact))


async def _send_whatsapp(to: str, message: str, media_url: str | None = None) -> bool:
    if settings.WHATSAPP_CLOUD_TOKEN and settings.WHATSAPP_CLOUD_PHONE_ID:
        return await send_whatsapp_cloud(to, message, media_url)
    return await send_whatsapp(to, message, media_url)


def _format_date(date_val) -> str:
    """Convert date to format like 'Monday 20th July, 2026'."""
    from datetime import date
    if isinstance(date_val, str):
        try:
            date_val = date.fromisoformat(date_val)
        except ValueError:
            return date_val
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    day = date_val.day
    suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{days[date_val.weekday()]} {day}{suffix} {months[date_val.month - 1]}, {date_val.year}"


def _format_time(time_val, tz: str = "WAT") -> str:
    """Convert time to 12-hour format like '8:00 PM (WAT)'."""
    from datetime import time
    if isinstance(time_val, str):
        try:
            parts = time_val.split(":")
            time_val = time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
        except (ValueError, IndexError):
            return time_val
    hour = time_val.hour
    minute = time_val.minute
    ampm = "AM" if hour < 12 else "PM"
    hour12 = hour if hour <= 12 else hour - 12
    if hour12 == 0:
        hour12 = 12
    minute_str = f":{minute:02d}" if minute else ""
    return f"{hour12}{minute_str} {ampm} ({tz})"


def _absolute_url(url: str | None) -> str | None:
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/"):
        return f"{settings.FRONTEND_URL}{url}"
    return url


def _upload_path_from_url(url: str) -> str:
    upload_base = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    if "/uploads/" in url:
        relative = url.rstrip("/").split("/uploads/")[-1]
    elif url.startswith("/uploads/"):
        relative = url[len("/uploads/"):]
    else:
        relative = url.lstrip("/")
    return os.path.join(upload_base, relative)


def _build_invite_message(
    guest: Guest, event: Event,
    qr_url: str | None = None,
    flyer_url: str | None = None,
    qr_image_url: str | None = None,
    message_id: int | None = None,
) -> tuple[str, str, str]:
    rsvp_link = f"{settings.FRONTEND_URL}/rsvp/{guest.rsvp_token}"
    subject = f"You're Invited: {event.title}"
    description = event.description or "You are cordially invited."
    body = (
        f"Dear {guest.name},\n\n"
        f"{description}\n\n"
        f"Event Details:\n"
        f"Date: {event.event_date}\n"
        f"Time: {event.event_time}\n"
        f"Venue: {event.venue}\n"
        f"Dress Code: {event.dress_code or 'Any'}\n\n"
        f"RSVP: {rsvp_link}\n"
        f"{f'Your unique QR code: {qr_url}\n' if qr_url else ''}"
        f"\n"
        f"Warm regards,\n{event.host_name or 'The Host'}"
    )
    from datetime import date as dt_date, time as dt_time
    formatted_date = _format_date(event.event_date)
    formatted_time = _format_time(event.event_time, event.timezone or "WAT")
    description_html = f"<p>{event.description}</p>" if event.description else ""
    qr_html = ""
    if qr_image_url:
        qr_html = f"""
        <div style="text-align:center;padding:16px;background:#f8f9fc;border-radius:12px;margin:16px 0">
            <p style="color:#23466f;font-size:13px;font-weight:bold;margin:0 0 12px">YOUR UNIQUE ENTRY CODE</p>
            <img src="cid:qr_code" alt="Entry QR Code" style="width:180px;height:180px;display:block;margin:0 auto" />
            <p style="color:#94a3b8;font-size:11px;margin:8px 0 0">Show this code at the venue entrance</p>
        </div>"""
    elif qr_url:
        qr_html = (
            f'<p style="padding:14px;border:1px dashed #94a3b8;border-radius:12px;text-align:center">Your unique QR access code is attached to this email</p>'
        )
    flyer_html = ""
    if flyer_url:
        flyer_html = f'<img src="cid:flyer" alt="{event.title}" style="width:100%;max-width:600px;display:block;border-radius:0" />'
    html = (
        '<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a2e">'
        f'{flyer_html}'
        '<div style="padding:32px 28px;background:#ffffff">'
        f'<p style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">You are cordially invited to</p>'
        f'<h1 style="font-size:28px;color:#07182f;margin:0 0 16px;line-height:1.2">{event.title}</h1>'
        f'<p style="font-size:15px;color:#555;line-height:1.6;margin:0 0 20px">{event.description or "Join us for this special occasion."}</p>'
        '<table style="width:100%;border-collapse:collapse;margin:0 0 24px">'
        f'<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;vertical-align:top">DATE</td><td style="padding:8px 0;font-size:14px;font-weight:bold">{formatted_date}</td></tr>'
        f'<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;vertical-align:top">TIME</td><td style="padding:8px 0;font-size:14px;font-weight:bold">{formatted_time}</td></tr>'
        f'<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;vertical-align:top">VENUE</td><td style="padding:8px 0;font-size:14px;font-weight:bold">{event.venue}</td></tr>'
        f'<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;width:100px;vertical-align:top">DRESS CODE</td><td style="padding:8px 0;font-size:14px;font-weight:bold">{event.dress_code or "Any"}</td></tr>'
        '</table>'
        f'<div style="text-align:center;margin:24px 0">'
        f'<a href="{rsvp_link}" style="display:inline-block;background:#E91E8C;color:#fff;padding:14px 40px;border-radius:50px;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,sans-serif">RSVP NOW</a>'
        '</div>'
        f'{qr_html}'
        '</div>'
        '<div style="background:#07182f;color:#d9e8f7;padding:24px;text-align:center;font-size:12px;font-family:Arial,sans-serif">'
        f'<p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#fff">Hosted by {event.host_name}</p>'
        '<p style="margin:0;letter-spacing:1px">Accredit.vip — Premium Event Infrastructure</p>'
        '</div>'
        + (f'<img src="{settings.FRONTEND_URL}/api/v1/track/open/{message_id}" alt="" width="1" height="1" style="display:none" />' if message_id else '')
        + '</div>'
    )
    return subject, body, html


MAX_INVITE_ATTEMPTS = 3


async def _send_to_guest(
    guest: Guest,
    event: Event,
    channel: str,
    batch_id: int,
    db: AsyncSession,
) -> tuple[bool, str]:
    if guest.invite_attempts >= MAX_INVITE_ATTEMPTS:
        return False, "max_attempts"

    guest.invite_attempts += 1
    qr = await get_or_create_guest_qr(db, event.id, guest.id)
    qr_token_url = f"{settings.FRONTEND_URL}/api/v1/qr/{qr.token}"

    flyer_result = await db.execute(select(FlierAsset).where(FlierAsset.event_id == event.id).order_by(FlierAsset.created_at.desc()))
    flyer = flyer_result.scalar_one_or_none()
    flyer_url = flyer.url if flyer else event.cover_image

    qr_data = qr_token_url
    qr_image_url_obj = qr_gif_to_url(qr_data, size=250, style="pulsing")
    qr_image_url = qr_image_url_obj if qr_image_url_obj else None

    msg = InviteMessage(batch_id=batch_id, guest_id=guest.id, channel=channel)
    db.add(msg)
    await db.flush()

    subject, body, html = _build_invite_message(guest, event, qr_url=qr_token_url, flyer_url=flyer_url, qr_image_url=qr_image_url, message_id=msg.id)

    try:
        if channel == "email" and guest.email:
            from_addr = f"{event.host_name} via Accredit.vip <noreply@wristbandsng.com>"
            email_images = []
            if flyer_url:
                email_images.append(("flyer", _upload_path_from_url(flyer_url)))
            if qr_image_url:
                email_images.append(("qr_code", _upload_path_from_url(qr_image_url)))
            if email_images:
                ok = await asyncio.wait_for(send_email_with_images(guest.email, subject, html, email_images, from_addr=from_addr), timeout=15)
            else:
                ok = await asyncio.wait_for(send_email(guest.email, subject, html, from_addr=from_addr), timeout=15)
        elif channel == "whatsapp" and guest.phone:
            media_to_send = _absolute_url(flyer_url) or _absolute_url(qr_image_url)
            ok = await _send_whatsapp(guest.phone, body, media_url=media_to_send)
            qr_abs = _absolute_url(qr_image_url)
            if not ok and qr_abs and qr_abs != media_to_send:
                await _send_whatsapp(guest.phone, "Your entry QR code is ready!", media_url=qr_abs)
        elif channel == "sms" and guest.phone:
            ok = await send_sms(guest.phone, body)
        else:
            msg.status = "skipped"
            await db.flush()
            return False, "skipped"

        msg.status = "delivered" if ok else "failed"
        if ok:
            msg.sent_at = func.now()
        await db.flush()
        return ok, msg.status
    except Exception as e:
        msg.status = "failed"
        msg.error = str(e)
        await db.flush()
        return False, "failed"


def _build_qr_message(guest: Guest, event: Event, qr_image_url: str | None = None) -> tuple[str, str, str]:
    subject = f"Your QR Access Code: {event.title}"
    body = (
        f"==============================\n"
        f"{event.title.upper()}\n"
        f"QR Access Code for {guest.name}\n"
        f"==============================\n\n"
        f"Your unique QR access code is ready.\n\n"
        f"Show this at the event entrance for quick access.\n\n"
        f"Warm regards,\n{event.host_name}"
    )
    qr_img_html = ""
    if qr_image_url:
        qr_img_html = f'<img src="cid:qr_code" alt="Entry QR Code" style="width:200px;height:200px;display:block;margin:0 auto" />'
    html = (
        '<div style="max-width:600px;margin:0 auto;font-family:Georgia,serif;color:#1a1a2e">'
        '<div style="background:#07182f;color:#fff;padding:32px 28px;text-align:center">'
        '<div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#ffb4d9;margin-bottom:8px">QR Access Code</div>'
        f'<h1 style="margin:0 0 4px;font-size:30px;line-height:1.1;color:#fff">{event.title}</h1>'
        f'<p style="margin:0;color:#d9e8f7;font-size:13px">Sent to {guest.name}</p>'
        '</div>'
        '<div style="padding:32px 28px;background:#ffffff;text-align:center">'
        f'<p style="margin:0 0 20px;font-size:14px;color:#555">Your unique QR access code is ready for entry.</p>'
        f'{qr_img_html}'
        f'<p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Show this code at the venue entrance for quick access.</p>'
        '</div>'
        '<div style="background:#07182f;color:#d9e8f7;padding:20px;text-align:center;font-size:11px;font-family:Arial,sans-serif">'
        '<p style="margin:0;letter-spacing:1px">Accredit.vip — Premium Event Infrastructure</p>'
        '</div>'
        '</div>'
    )
    return subject, body, html


async def _send_qr_to_guest(
    guest: Guest,
    event: Event,
    channel: str,
    batch_id: int,
    db: AsyncSession,
) -> tuple[bool, str]:
    qr = await get_or_create_guest_qr(db, event.id, guest.id)
    qr_token_url = f"{settings.FRONTEND_URL}/api/v1/qr/{qr.token}"

    qr_image_url_obj = qr_gif_to_url(qr_token_url, size=250, style="pulsing")
    qr_image_url = qr_image_url_obj if qr_image_url_obj else None

    subject, body, html = _build_qr_message(guest, event, qr_image_url)

    msg = InviteMessage(batch_id=batch_id, guest_id=guest.id, channel=channel)
    db.add(msg)

    try:
        if channel == "email" and guest.email:
            from_addr = f"{event.host_name} via Accredit.vip <noreply@wristbandsng.com>"
            if qr_image_url:
                ok = await asyncio.wait_for(send_email_with_images(guest.email, subject, html, [("qr_code", _upload_path_from_url(qr_image_url))], from_addr=from_addr), timeout=15)
            else:
                ok = await asyncio.wait_for(send_email(guest.email, subject, html, from_addr=from_addr), timeout=15)
        elif channel == "whatsapp" and guest.phone:
            ok = await _send_whatsapp(guest.phone, body, media_url=_absolute_url(qr_image_url))
        elif channel == "sms" and guest.phone:
            ok = await send_sms(guest.phone, body)
        else:
            msg.status = "skipped"
            await db.flush()
            return False, "skipped"

        msg.status = "delivered" if ok else "failed"
        if ok:
            msg.sent_at = func.now()
        await db.flush()
        return ok, msg.status
    except Exception as e:
        msg.status = "failed"
        msg.error = str(e)
        await db.flush()
        return False, "failed"


# ── Send invite to ALL unsent guests (or force resend) ──

@router.post("/{event_id}/send-invites")
async def send_invites(
    event_id: int,
    req: SendInvitesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    force: bool = Query(False, description="Resend to already-sent guests"),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = select(Guest).where(Guest.event_id == event_id)
    if not force:
        query = query.where(Guest.invite_sent == False)
    guests_result = await db.execute(query)
    guests = guests_result.scalars().all()
    if not guests:
        return {"batch_id": None, "channel": req.channel, "sent": 0, "total": 0, "already_sent": True, "message": "All guests have already been invited. Use ?force=true to resend."}

    if force:
        already_sent_guests = [g for g in guests if g.invite_sent]
        if already_sent_guests:
            # Check which already-sent guests have valid resend payments
            guest_ids = [g.id for g in already_sent_guests]
            payment_result = await db.execute(
                select(Payment).where(
                    Payment.event_id == event_id,
                    Payment.guest_id.in_(guest_ids),
                    Payment.payment_type == "resend",
                    Payment.status == "completed",
                )
            )
            paid_guest_ids = {p.guest_id for p in payment_result.scalars().all()}
            unpaid = [g for g in already_sent_guests if g.id not in paid_guest_ids]
            if unpaid:
                raise HTTPException(
                    status_code=402,
                    detail={
                        "message": f"Re-sending invites to {len(unpaid)} guest(s) requires payment.",
                        "amount_per_guest": RESEND_PRICE_PER_GUEST,
                        "total_cost": len(unpaid) * RESEND_PRICE_PER_GUEST,
                        "unpaid_guest_ids": [g.id for g in unpaid],
                        "payment_required": True,
                    },
                )

    if req.channel in {"whatsapp", "sms"}:
        invalid_phone_guests = [
            {"id": guest.id, "name": guest.name, "phone": guest.phone}
            for guest in guests
            if not is_valid_phone(guest.phone)
        ]
        if invalid_phone_guests:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Fix incorrect phone numbers before sending.",
                    "invalid_phone_guests": invalid_phone_guests,
                },
            )

    batch = InviteBatch(event_id=event_id, channel=req.channel)
    db.add(batch)
    await db.flush()

    sent = 0
    skipped_attempts = 0
    for guest in guests:
        ok, status = await _send_to_guest(guest, event, req.channel, batch.id, db)
        if status == "max_attempts":
            skipped_attempts += 1
            continue
        if status != "skipped":
            guest.invite_sent = True
        if ok:
            sent += 1
        await db.flush()

    batch.total_sent = sent
    batch.status = "completed"
    await db.commit()

    return {"batch_id": batch.id, "channel": req.channel, "sent": sent, "total": len(guests), "skipped_max_attempts": skipped_attempts}


# ── Send invite to ONE specific guest ──

@router.post("/{event_id}/guests/{guest_id}/send-invite")
async def send_guest_invite(
    event_id: int,
    guest_id: int,
    req: SendGuestInviteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    force: bool = Query(False, description="Resend even if already sent"),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guest_result = await db.execute(
        select(Guest).where(Guest.id == guest_id, Guest.event_id == event_id)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    if guest.invite_sent:
        if not force:
            raise HTTPException(
                status_code=400,
                detail=f"Invite already sent to {guest.name}. Use ?force=true to resend.",
            )
        # Check if a valid resend payment exists for this guest
        payment_result = await db.execute(
            select(Payment).where(
                Payment.event_id == event_id,
                Payment.guest_id == guest_id,
                Payment.payment_type == "resend",
                Payment.status == "completed",
            )
        )
        existing_payment = payment_result.scalar_one_or_none()
        if not existing_payment:
            raise HTTPException(
                status_code=402,
                detail={
                    "message": f"Re-sending invite to {guest.name} requires payment.",
                    "amount": RESEND_PRICE_PER_GUEST,
                    "guest_id": guest_id,
                    "payment_required": True,
                },
            )

    batch = InviteBatch(event_id=event_id, channel=req.channel)
    db.add(batch)
    await db.flush()

    ok, status = await _send_to_guest(guest, event, req.channel, batch.id, db)

    if status == "max_attempts":
        batch.total_sent = 0
        batch.status = "completed"
        await db.commit()
        return {"guest_id": guest_id, "channel": req.channel, "sent": False, "status": "max_attempts", "message": f"{guest.name} has reached the maximum of {MAX_INVITE_ATTEMPTS} invite attempts. Create a new event to invite them again."}

    if status != "skipped":
        guest.invite_sent = True
    batch.total_sent = 1 if ok else 0
    batch.status = "completed"
    await db.commit()

    return {"guest_id": guest_id, "channel": req.channel, "sent": ok, "status": status}


# ── Send QR code to ONE specific guest ──

@router.post("/{event_id}/guests/{guest_id}/send-qr")
async def send_guest_qr(
    event_id: int,
    guest_id: int,
    req: SendGuestInviteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guest_result = await db.execute(
        select(Guest).where(Guest.id == guest_id, Guest.event_id == event_id)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    batch = InviteBatch(event_id=event_id, channel=req.channel)
    db.add(batch)
    await db.flush()

    ok, status = await _send_qr_to_guest(guest, event, req.channel, batch.id, db)

    batch.total_sent = 1 if ok else 0
    batch.status = "completed"
    await db.commit()

    return {"guest_id": guest_id, "channel": req.channel, "sent": ok, "status": status}


# ── Send QR codes to ALL unsent guests ──

@router.post("/{event_id}/send-qrs")
async def send_all_qrs(
    event_id: int,
    req: SendInvitesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guests_result = await db.execute(
        select(Guest).where(Guest.event_id == event_id)
    )
    guests = guests_result.scalars().all()
    if not guests:
        raise HTTPException(status_code=400, detail="No guests to send QR codes to")

    if req.channel in {"whatsapp", "sms"}:
        invalid_phone_guests = [
            {"id": guest.id, "name": guest.name, "phone": guest.phone}
            for guest in guests
            if not is_valid_phone(guest.phone)
        ]
        if invalid_phone_guests:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Fix incorrect phone numbers before sending QR codes.",
                    "invalid_phone_guests": invalid_phone_guests,
                },
            )

    batch = InviteBatch(event_id=event_id, channel=req.channel)
    db.add(batch)
    await db.flush()

    sent = 0
    for guest in guests:
        ok, status = await _send_qr_to_guest(guest, event, req.channel, batch.id, db)
        if ok:
            sent += 1
        await db.flush()

    batch.total_sent = sent
    batch.status = "completed"
    await db.commit()

    return {"batch_id": batch.id, "channel": req.channel, "sent": sent, "total": len(guests)}


# ── Re-send payment check ──

@router.post("/{event_id}/resend-cost")
async def resend_cost(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    guest_ids: list[int] = Query(None),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if guest_ids:
        guests_result = await db.execute(
            select(Guest).where(Guest.id.in_(guest_ids), Guest.event_id == event_id, Guest.invite_sent == True)
        )
    else:
        guests_result = await db.execute(
            select(Guest).where(Guest.event_id == event_id, Guest.invite_sent == True)
        )
    already_sent = guests_result.scalars().all()

    total_cost = len(already_sent) * RESEND_PRICE_PER_GUEST
    return {
        "already_sent_count": len(already_sent),
        "cost_per_guest": RESEND_PRICE_PER_GUEST,
        "total_cost": total_cost,
    }


# ── Delivery logs ──

@router.get("/{event_id}/delivery-logs")
async def delivery_logs(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InviteBatch).where(InviteBatch.event_id == event_id)
        .order_by(InviteBatch.created_at.desc())
    )
    return result.scalars().all()


class SendInvitesBatchRequest(BaseModel):
    channel: str
    guest_ids: list[int]


@router.post("/{event_id}/send-invites-batch")
async def send_invites_batch(
    event_id: int,
    req: SendInvitesBatchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if len(req.guest_ids) > 5:
        raise HTTPException(status_code=400, detail="Can only send invites to up to 5 guests at a time")

    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guests_result = await db.execute(
        select(Guest).where(Guest.id.in_(req.guest_ids), Guest.event_id == event_id)
    )
    guests = guests_result.scalars().all()
    if not guests:
        raise HTTPException(status_code=400, detail="No valid guests found")

    if req.channel in {"whatsapp", "sms"}:
        invalid = [g for g in guests if not is_valid_phone(g.phone)]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail={"message": "Fix incorrect phone numbers before sending.", "invalid_phone_guests": [{"id": g.id, "name": g.name, "phone": g.phone} for g in invalid]},
            )

    batch = InviteBatch(event_id=event_id, channel=req.channel)
    db.add(batch)
    await db.flush()

    sent = 0
    results = []
    for guest in guests:
        ok, status = await _send_to_guest(guest, event, req.channel, batch.id, db)
        if status == "max_attempts":
            results.append({"guest_id": guest.id, "name": guest.name, "status": "max_attempts"})
            continue
        if status != "skipped":
            guest.invite_sent = True
        if ok:
            sent += 1
            results.append({"guest_id": guest.id, "name": guest.name, "status": "delivered"})
        else:
            results.append({"guest_id": guest.id, "name": guest.name, "status": status})
        await db.flush()

    batch.total_sent = sent
    batch.status = "completed"
    await db.commit()

    return {"batch_id": batch.id, "channel": req.channel, "sent": sent, "total": len(guests), "results": results}


@router.get("/{event_id}/export-guests")
async def export_guests(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status: str = Query("all", description="Filter: all, sent, not_sent, delivered, failed"),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    query = select(Guest).where(Guest.event_id == event_id)
    if status == "sent":
        query = query.where(Guest.invite_sent == True)
    elif status == "not_sent":
        query = query.where(Guest.invite_sent == False)
    elif status == "delivered":
        query = query.where(Guest.invite_sent == True)
    elif status == "failed":
        query = query.where(Guest.invite_sent == True)

    result = await db.execute(query)
    guests = result.scalars().all()

    import csv, io
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Phone", "Email", "RSVP Status", "Invite Sent", "Invite Attempts", "Invite Viewed At"])
    for g in guests:
        writer.writerow([g.name, g.phone or "", g.email or "", g.rsvp_status, "Yes" if g.invite_sent else "No", g.invite_attempts or 0, g.invite_viewed_at.isoformat() if g.invite_viewed_at else ""])

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=guests-event-{event_id}-{status}.csv"},
    )


class TestSendRequest(BaseModel):
    channel: str
    email: str | None = None
    phone: str | None = None


@router.post("/test-send")
async def test_send(
    req: TestSendRequest,
    user: User = Depends(get_current_user),
):
    sent = []
    if req.channel == "email" and req.email:
        ok = await asyncio.wait_for(send_email(req.email, "Accredit.vip Test Message", "<h2>Test Send</h2><p>This is a test message from Accredit.vip.</p>"), timeout=15)
        sent.append(f"email to {req.email}: {'OK' if ok else 'FAILED'}")
    elif req.channel == "whatsapp" and req.phone:
        ok = await _send_whatsapp(req.phone, "Hello! This is a test WhatsApp message from Accredit.vip.")
        sent.append(f"whatsapp to {req.phone}: {'OK' if ok else 'FAILED'}")
    elif req.channel == "sms" and req.phone:
        ok = await send_sms(req.phone, "Hello! This is a test SMS from Accredit.vip.")
        sent.append(f"sms to {req.phone}: {'OK' if ok else 'FAILED'}")
    else:
        return {"message": f"Missing recipient for channel {req.channel}. Provide email for email, phone for whatsapp/sms.", "sent": False}
    return {"message": "Test send completed.", "details": sent, "sent": True}
