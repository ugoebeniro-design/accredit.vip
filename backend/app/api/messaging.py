from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.invite import InviteBatch, InviteMessage
from app.api.qr_codes import get_or_create_guest_qr
from app.services.email_service import send_email
from app.services.sms_service import send_sms
from app.services.whatsapp_service import send_whatsapp
import re

router = APIRouter()


class SendInvitesRequest(BaseModel):
    channel: str


def is_valid_phone(value: str | None) -> bool:
    if not value:
        return False
    compact = re.sub(r"[\s().-]", "", value)
    return bool(re.fullmatch(r"\+?[1-9]\d{7,14}", compact))


def build_invite_message(guest: Guest, event: Event, qr_url: str | None = None) -> tuple[str, str, str]:
    rsvp_link = f"{settings.FRONTEND_URL}/rsvp/{guest.rsvp_token}"
    full_qr_url = f"{settings.FRONTEND_URL}{qr_url}" if qr_url else None
    subject = f"You're Invited: {event.title}"
    body = (
        f"==============================\n"
        f"{event.title.upper()}\n"
        f"Personal invite for {guest.name}\n"
        f"==============================\n\n"
        f"Hosted by {event.host_name}\n"
        f"Date: {event.event_date}\n"
        f"Time: {event.event_time}\n"
        f"Venue: {event.venue}\n"
        f"Dress Code: {event.dress_code or 'Any'}\n\n"
        f"RSVP: {rsvp_link}\n"
        f"{f'Your unique QR code: {full_qr_url}\n' if full_qr_url else ''}"
        f"\n"
        f"Warm regards,\n{event.host_name}"
    )
    html = (
        '<div style="max-width:640px;border:1px solid #e6edf5;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;color:#102033">'
        '<div style="background:#07182f;color:#fff;padding:28px">'
        '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffb4d9">Personal invite</div>'
        f'<h1 style="margin:10px 0 6px;font-size:34px;line-height:1.05">{event.title}</h1>'
        f'<p style="margin:0;color:#d9e8f7">Hosted by {event.host_name}</p>'
        '</div>'
        '<div style="padding:24px;background:#ffffff">'
        f'<p style="font-size:18px;margin-top:0">Dear <strong>{guest.name}</strong>,</p>'
        f'<p>You are warmly invited. Date: <strong>{event.event_date}</strong>. Time: <strong>{event.event_time}</strong>. Venue: <strong>{event.venue}</strong>.</p>'
        f'<p><a style="display:inline-block;background:#E91E8C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold" href="{rsvp_link}">RSVP now</a></p>'
        + (f'<p style="padding:14px;border:1px dashed #94a3b8;border-radius:12px">Unique animated QR access: <a href="{full_qr_url}">{full_qr_url}</a></p>' if full_qr_url else "")
        + '</div></div>'
    )
    return subject, body, html


@router.post("/{event_id}/send-invites")
async def send_invites(
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
        raise HTTPException(status_code=400, detail="No guests to invite")

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
    for guest in guests:
        qr = await get_or_create_guest_qr(db, event_id, guest.id)
        qr_url = f"/api/v1/qr/{qr.token}"
        subject, body, html = build_invite_message(guest, event, qr_url)

        msg = InviteMessage(batch_id=batch.id, guest_id=guest.id, channel=req.channel)
        db.add(msg)

        try:
            if req.channel == "email" and guest.email:
                from_addr = f"{event.host_name} via Accredit.vip <noreply@wristbandsng.com>"
                ok = await send_email(guest.email, subject, html, from_addr=from_addr)
            elif req.channel == "whatsapp" and guest.phone:
                ok = await send_whatsapp(guest.phone, body)
            elif req.channel == "sms" and guest.phone:
                ok = await send_sms(guest.phone, body)
            else:
                msg.status = "skipped"
                await db.flush()
                continue

            msg.status = "delivered" if ok else "failed"
            sent += 1 if ok else 0
        except Exception as e:
            msg.status = "failed"
            msg.error = str(e)

        await db.flush()

    batch.total_sent = sent
    batch.status = "completed"
    await db.commit()

    return {"batch_id": batch.id, "channel": req.channel, "sent": sent, "total": len(guests)}


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


@router.post("/test-send")
async def test_send(
    req: SendInvitesRequest,
    user: User = Depends(get_current_user),
):
    return {"message": f"Test {req.channel} sent successfully (simulated)"}
