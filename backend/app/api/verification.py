from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.models.qr_code import QRCode
from app.models.checkin import CheckIn
from app.models.guest import Guest
from app.models.event import Event
from app.models.scan_attempt import ScanAttempt
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()


class ScanRequest(BaseModel):
    token: str


def _get_client_info(request: Request) -> tuple[str | None, str | None]:
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return ip, ua


@router.post("/verify")
async def verify_qr(req: ScanRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip, ua = _get_client_info(request)
    result = await db.execute(select(QRCode).where(QRCode.token == req.token))
    qr = result.scalar_one_or_none()

    if not qr:
        scan = ScanAttempt(
            guest_id=None, event_id=0, token=req.token,
            status="invalid_token", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=404, detail="Invalid QR code")

    if qr.is_used:
        scan = ScanAttempt(
            guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
            status="already_used", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=400, detail="QR code already used")

    if qr.expires_at and qr.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        scan = ScanAttempt(
            guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
            status="expired", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=400, detail="QR code has expired")

    guest_result = await db.execute(select(Guest).where(Guest.id == qr.guest_id))
    guest = guest_result.scalar_one_or_none()

    event_result = await db.execute(select(Event).where(Event.id == qr.event_id))
    event = event_result.scalar_one_or_none()

    scan = ScanAttempt(
        guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
        status="verified", device_info=ua, ip_address=ip,
    )
    db.add(scan)
    await db.commit()

    return {
        "valid": True,
        "guest": {
            "id": guest.id,
            "name": guest.name,
            "phone": guest.phone,
            "email": guest.email,
        } if guest else None,
        "event": {
            "id": event.id,
            "title": event.title,
            "event_date": str(event.event_date),
        } if event else None,
    }


@router.post("/scan")
async def scan_qr(req: ScanRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip, ua = _get_client_info(request)
    result = await db.execute(select(QRCode).where(QRCode.token == req.token))
    qr = result.scalar_one_or_none()

    if not qr:
        scan = ScanAttempt(
            guest_id=None, event_id=0, token=req.token,
            status="invalid_token", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=404, detail="Invalid QR code")

    if qr.is_used:
        scan = ScanAttempt(
            guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
            status="already_used", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=400, detail="QR code already used")

    if qr.expires_at and qr.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        scan = ScanAttempt(
            guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
            status="expired", device_info=ua, ip_address=ip,
        )
        db.add(scan)
        await db.commit()
        raise HTTPException(status_code=400, detail="QR code has expired")

    qr.is_used = True
    checkin = CheckIn(guest_id=qr.guest_id, event_id=qr.event_id)
    db.add(checkin)

    scan = ScanAttempt(
        guest_id=qr.guest_id, event_id=qr.event_id, token=req.token,
        status="checked_in", device_info=ua, ip_address=ip,
    )
    db.add(scan)
    await db.commit()

    return {"status": "approved", "message": "Check-in successful"}


@router.get("/events/{event_id}/checkin-stats")
async def checkin_stats(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    checked_in = await db.scalar(
        select(func.count(CheckIn.id)).where(CheckIn.event_id == event_id)
    )
    rsvp_accepted = await db.scalar(
        select(func.count(Guest.id)).where(
            Guest.event_id == event_id, Guest.rsvp_status == "accepted"
        )
    )
    total_guests = await db.scalar(
        select(func.count(Guest.id)).where(Guest.event_id == event_id)
    )

    result = await db.execute(
        select(CheckIn, Guest.name, Guest.phone, Guest.email)
        .join(Guest, CheckIn.guest_id == Guest.id, isouter=True)
        .where(CheckIn.event_id == event_id)
        .order_by(CheckIn.checked_in_at.desc())
        .limit(50)
    )
    checkins = [
        {
            "id": c[0].id,
            "guest_id": c[0].guest_id,
            "checked_in_at": str(c[0].checked_in_at),
            "guest_name": c[1],
            "guest_phone": c[2],
            "guest_email": c[3],
        }
        for c in result.all()
    ]

    return {
        "checked_in": checked_in or 0,
        "rsvp_accepted": rsvp_accepted or 0,
        "total_guests": total_guests or 0,
        "recent_checkins": checkins,
    }


@router.get("/events/{event_id}/accreditation-log")
async def accreditation_log(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(ScanAttempt, Guest.name)
        .join(Guest, ScanAttempt.guest_id == Guest.id, isouter=True)
        .where(ScanAttempt.event_id == event_id)
        .order_by(ScanAttempt.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    attempts = [
        {
            "id": a[0].id,
            "guest_id": a[0].guest_id,
            "guest_name": a[1],
            "token": a[0].token[:20] + "..." if len(a[0].token) > 20 else a[0].token,
            "status": a[0].status,
            "device_info": a[0].device_info,
            "ip_address": a[0].ip_address,
            "created_at": str(a[0].created_at),
        }
        for a in result.all()
    ]

    suspicious = [a for a in attempts if a["status"] in ("already_used", "invalid_token", "expired")]

    return {
        "attempts": attempts,
        "suspicious_count": len(suspicious),
        "total": len(attempts),
    }
