from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, time
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


@router.get("/scanner/check-access")
async def scanner_check_access(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event_count = await db.scalar(select(func.count(Event.id)).where(Event.organizer_id == user.id))
    return {
        "access_granted": True,
        "event_count": event_count or 0,
        "message": "Accreditation access is available on your current plan." if event_count > 0 else "Create an event first to use accreditation.",
    }


class ScanTokenRequest(BaseModel):
    token: str


def _event_has_passed(event) -> bool:
    if not event.event_date:
        return False
    event_dt = datetime.combine(event.event_date, event.event_time or time.min, tzinfo=timezone.utc)
    return event_dt < datetime.now(timezone.utc)


async def _resolve_guest_and_event(token: str, db: AsyncSession):
    """Resolve guest + event from QR code record or fallback to guest rsvp_token lookup."""
    result = await db.execute(select(QRCode).where(QRCode.token == token))
    qr = result.scalar_one_or_none()

    guest = None
    event = None

    if qr:
        guest = await db.get(Guest, qr.guest_id)
        event = await db.get(Event, qr.event_id)
    else:
        g_result = await db.execute(select(Guest).where(Guest.rsvp_token == token))
        guest = g_result.scalar_one_or_none()
        if guest:
            event = await db.get(Event, guest.event_id)

    return qr, guest, event


@router.post("/scanner/verify")
async def scanner_verify_token(req: ScanTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    raw_token = req.token.split("/").pop() if "/" in req.token else req.token
    qr, guest, event = await _resolve_guest_and_event(raw_token, db)

    if not guest or not event:
        return {"valid": False, "reason": "invalid", "message": "Invalid QR code"}

    already_checked_in = False
    if event and guest:
        c = await db.execute(
            select(CheckIn.id).where(CheckIn.guest_id == guest.id, CheckIn.event_id == event.id).limit(1)
        )
        already_checked_in = c.first() is not None

    if already_checked_in:
        return {
            "valid": False,
            "reason": "used",
            "message": f"{guest.name} is already checked in.",
            "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email, "rsvp_token": guest.rsvp_token, "checked_in": True},
            "event": {"id": event.id, "title": event.title},
        }

    if qr and qr.is_used:
        return {
            "valid": False,
            "reason": "used",
            "message": "Already checked in",
            "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email, "rsvp_token": guest.rsvp_token, "checked_in": True},
            "event": {"id": event.id, "title": event.title},
        }

    if guest.rsvp_status == "declined":
        return {
            "valid": False,
            "reason": "declined",
            "message": f"{guest.name} declined the invitation and cannot be checked in.",
            "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email, "rsvp_token": guest.rsvp_token, "checked_in": False},
            "event": {"id": event.id, "title": event.title},
        }

    if _event_has_passed(event):
        return {
            "valid": False,
            "reason": "event_ended",
            "message": f"The event '{event.title}' has already ended.",
            "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email, "rsvp_token": guest.rsvp_token, "checked_in": False},
            "event": {"id": event.id, "title": event.title},
        }

    return {
        "valid": True,
        "reason": "verified",
        "message": f"{guest.name} can be checked in.",
        "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email, "rsvp_status": guest.rsvp_status, "rsvp_token": guest.rsvp_token, "checked_in": False},
        "event": {"id": event.id, "title": event.title},
    }


@router.post("/scanner/checkin")
async def scanner_checkin(req: ScanTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    raw_token = req.token.split("/").pop() if "/" in req.token else req.token
    qr, guest, event = await _resolve_guest_and_event(raw_token, db)

    if not guest or not event:
        return {"status": "error", "message": "Invalid QR code"}

    existing = await db.execute(
        select(CheckIn.id).where(CheckIn.guest_id == guest.id, CheckIn.event_id == event.id).limit(1)
    )
    if existing.first() is not None:
        return {"status": "error", "message": f"{guest.name} is already checked in."}

    if guest.rsvp_status == "declined":
        scan = ScanAttempt(guest_id=guest.id, event_id=event.id, token=raw_token, status="declined", device_info=ua, ip_address=ip)
        db.add(scan)
        await db.commit()
        return {"status": "declined", "message": f"{guest.name} declined the invitation and cannot be checked in."}

    if _event_has_passed(event):
        scan = ScanAttempt(guest_id=guest.id, event_id=event.id, token=raw_token, status="event_ended", device_info=ua, ip_address=ip)
        db.add(scan)
        await db.commit()
        return {"status": "event_ended", "message": f"The event '{event.title}' has already ended."}

    if qr and qr.is_used:
        return {"status": "error", "message": "Already checked in"}

    if qr:
        qr.is_used = True
    checkin = CheckIn(guest_id=guest.id, event_id=event.id)
    db.add(checkin)
    scan = ScanAttempt(guest_id=guest.id, event_id=event.id, token=raw_token, status="checked_in", device_info=ua, ip_address=ip)
    db.add(scan)
    await db.commit()
    return {"status": "approved", "message": "Check-in successful"}


@router.get("/scanner/events")
async def scanner_events(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).order_by(Event.event_date.desc())
    )
    events = result.scalars().all()
    return [{"id": e.id, "title": e.title, "event_date": str(e.event_date), "status": e.status} for e in events]


@router.get("/scanner/events/{event_id}/stats")
async def scanner_event_stats(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    checked_in = await db.scalar(select(func.count(CheckIn.id)).where(CheckIn.event_id == event_id))
    total = await db.scalar(select(func.count(Guest.id)).where(Guest.event_id == event_id))
    return {"checked_in": checked_in or 0, "total_guests": total or 0}


@router.get("/scanner/events/{event_id}/guests")
async def scanner_search_guests(
    event_id: int,
    q: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if not q.strip():
        return {"guests": []}
    stmt = select(Guest).where(
        Guest.event_id == event_id,
        Guest.deleted_at == None,
        (Guest.name.ilike(f"%{q}%")) | (Guest.rsvp_token.ilike(f"%{q}%")) | (Guest.email.ilike(f"%{q}%")) | (Guest.phone.ilike(f"%{q}%")),
    ).limit(20)
    result = await db.execute(stmt)
    guests = result.scalars().all()
    checked_in_ids = set()
    if guests:
        checkin_result = await db.execute(
            select(CheckIn.guest_id).where(CheckIn.event_id == event_id, CheckIn.guest_id.in_([g.id for g in guests]))
        )
        checked_in_ids = {row[0] for row in checkin_result.all()}
    return {
        "guests": [
            {
                "id": g.id,
                "name": g.name,
                "phone": g.phone,
                "email": g.email,
                "rsvp_status": g.rsvp_status,
                "rsvp_token": g.rsvp_token,
                "checked_in": g.id in checked_in_ids,
            }
            for g in guests
        ]
    }


@router.get("/scanner/events/{event_id}/activity")
async def scanner_recent_activity(
    event_id: int,
    page: int = 1,
    per_page: int = 20,
    q: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    base_query = (
        select(CheckIn, Guest.name, Guest.phone, Guest.email)
        .join(Guest, CheckIn.guest_id == Guest.id)
        .where(CheckIn.event_id == event_id)
    )

    if q:
        like = f"%{q}%"
        base_query = base_query.where(
            Guest.name.ilike(like) | Guest.email.ilike(like) | Guest.phone.ilike(like)
        )

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        base_query
        .order_by(CheckIn.checked_in_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    rows = result.all()
    return {
        "activity": [
            {
                "id": r.CheckIn.id,
                "guest_id": r.CheckIn.guest_id,
                "guest_name": r.name,
                "guest_phone": r.phone,
                "guest_email": r.email,
                "checked_in_at": r.CheckIn.checked_in_at.isoformat() if r.CheckIn.checked_in_at else None,
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
