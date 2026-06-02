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
from app.models.invite import InviteBatch, InviteMessage
from app.models.payment import Payment
from app.api.qr_codes import get_or_create_guest_qr
from app.services.email_service import send_email
from app.services.sms_service import send_sms
from app.services.whatsapp_service import send_whatsapp
import re

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


def _build_invite_message(guest: Guest, event: Event, qr_url: str | None = None) -> tuple[str, str, str]:
    rsvp_link = f"{settings.FRONTEND_URL}/rsvp/{guest.rsvp_token}"
    full_qr_url = f"{settings.FRONTEND_URL}{qr_url}" if qr_url else None
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
        f"{f'Your unique QR code: {full_qr_url}\n' if full_qr_url else ''}"
        f"\n"
        f"Warm regards,\n{event.host_name or 'The Host'}"
    )
    description_html = f"<p>{event.description}</p>" if event.description else ""
    qr_html = (
        f'<p style="padding:14px;border:1px dashed #94a3b8;border-radius:12px">Unique animated QR access: <a href="{full_qr_url}">{full_qr_url}</a></p>'
        if full_qr_url else ""
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
        f'{description_html}'
        f'<p>Date: <strong>{event.event_date}</strong>. Time: <strong>{event.event_time}</strong>. Venue: <strong>{event.venue}</strong>.</p>'
        f'<p><a style="display:inline-block;background:#E91E8C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold" href="{rsvp_link}">RSVP now</a></p>'
        f'{qr_html}'
        '</div></div>'
    )
    return subject, body, html


async def _send_to_guest(
    guest: Guest,
    event: Event,
    channel: str,
    batch_id: int,
    db: AsyncSession,
) -> tuple[bool, str]:
    qr = await get_or_create_guest_qr(db, event.id, guest.id)
    qr_url = f"/api/v1/qr/{qr.token}"
    subject, body, html = _build_invite_message(guest, event, qr_url)

    msg = InviteMessage(batch_id=batch_id, guest_id=guest.id, channel=channel)
    db.add(msg)

    try:
        if channel == "email" and guest.email:
            from_addr = f"{event.host_name} via Accredit.vip <noreply@wristbandsng.com>"
            ok = await send_email(guest.email, subject, html, from_addr=from_addr)
        elif channel == "whatsapp" and guest.phone:
            ok = await send_whatsapp(guest.phone, body)
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


def _build_qr_message(guest: Guest, event: Event, qr_url: str) -> tuple[str, str, str]:
    full_qr_url = f"{settings.FRONTEND_URL}{qr_url}"
    subject = f"Your QR Access Code: {event.title}"
    body = (
        f"==============================\n"
        f"{event.title.upper()}\n"
        f"QR Access Code for {guest.name}\n"
        f"==============================\n\n"
        f"Your unique QR access code is ready.\n\n"
        f"QR Code URL: {full_qr_url}\n\n"
        f"Show this at the event entrance for quick access.\n\n"
        f"Warm regards,\n{event.host_name}"
    )
    html = (
        '<div style="max-width:640px;border:1px solid #e6edf5;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;color:#102033">'
        '<div style="background:#07182f;color:#fff;padding:28px">'
        '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#ffb4d9">QR Access Code</div>'
        f'<h1 style="margin:10px 0 6px;font-size:34px;line-height:1.05">{event.title}</h1>'
        f'<p style="margin:0;color:#d9e8f7">Sent to {guest.name}</p>'
        '</div>'
        '<div style="padding:24px;background:#ffffff">'
        f'<p>Your unique QR access code is ready.</p>'
        f'<p style="padding:14px;border:1px dashed #94a3b8;border-radius:12px;text-align:center">'
        f'<a href="{full_qr_url}" style="display:inline-block;background:#E91E8C;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">View Your QR Code</a></p>'
        f'<p style="font-size:12px;color:#64748b">Show this QR code at the event entrance for quick access.</p>'
        '</div></div>'
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
    qr_url = f"/api/v1/qr/{qr.token}"
    subject, body, html = _build_qr_message(guest, event, qr_url)

    msg = InviteMessage(batch_id=batch_id, guest_id=guest.id, channel=channel)
    db.add(msg)

    try:
        if channel == "email" and guest.email:
            from_addr = f"{event.host_name} via Accredit.vip <noreply@wristbandsng.com>"
            ok = await send_email(guest.email, subject, html, from_addr=from_addr)
        elif channel == "whatsapp" and guest.phone:
            ok = await send_whatsapp(guest.phone, body)
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
    for guest in guests:
        ok, status = await _send_to_guest(guest, event, req.channel, batch.id, db)
        if status != "skipped":
            guest.invite_sent = True
        if ok:
            sent += 1
        await db.flush()

    batch.total_sent = sent
    batch.status = "completed"
    await db.commit()

    return {"batch_id": batch.id, "channel": req.channel, "sent": sent, "total": len(guests)}


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
        ok = await send_email(req.email, "Accredit.vip Test Message", "<h2>Test Send</h2><p>This is a test message from Accredit.vip.</p>")
        sent.append(f"email to {req.email}: {'OK' if ok else 'FAILED'}")
    elif req.channel == "whatsapp" and req.phone:
        ok = await send_whatsapp(req.phone, "Hello! This is a test WhatsApp message from Accredit.vip.")
        sent.append(f"whatsapp to {req.phone}: {'OK' if ok else 'FAILED'}")
    elif req.channel == "sms" and req.phone:
        ok = await send_sms(req.phone, "Hello! This is a test SMS from Accredit.vip.")
        sent.append(f"sms to {req.phone}: {'OK' if ok else 'FAILED'}")
    else:
        return {"message": f"Missing recipient for channel {req.channel}. Provide email for email, phone for whatsapp/sms.", "sent": False}
    return {"message": "Test send completed.", "details": sent, "sent": True}
