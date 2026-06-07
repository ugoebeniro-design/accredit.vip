from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
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


class ScanTokenRequest(BaseModel):
    token: str


@router.post("/scanner/verify")
async def scanner_verify_token(req: ScanTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QRCode).where(QRCode.token == req.token))
    qr = result.scalar_one_or_none()
    if not qr:
        return {"valid": False, "reason": "invalid", "message": "Invalid QR code"}
    if qr.is_used:
        return {"valid": False, "reason": "used", "message": "Already checked in"}
    guest = await db.get(Guest, qr.guest_id)
    event = await db.get(Event, qr.event_id)
    return {
        "valid": True,
        "guest": {"id": guest.id, "name": guest.name, "phone": guest.phone, "email": guest.email} if guest else None,
        "event": {"id": event.id, "title": event.title} if event else None,
    }


@router.post("/scanner/checkin")
async def scanner_checkin(req: ScanTokenRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    result = await db.execute(select(QRCode).where(QRCode.token == req.token))
    qr = result.scalar_one_or_none()
    if not qr:
        return {"status": "error", "message": "Invalid QR code"}
    if qr.is_used:
        return {"status": "error", "message": "Already checked in"}
    qr.is_used = True
    checkin = CheckIn(guest_id=qr.guest_id, event_id=qr.event_id)
    db.add(checkin)
    scan = ScanAttempt(guest_id=qr.guest_id, event_id=qr.event_id, token=req.token, status="checked_in", device_info=ua, ip_address=ip)
    db.add(scan)
    await db.commit()
    return {"status": "approved", "message": "Check-in successful"}


@router.get("/scanner/events")
async def scanner_events(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Event).where(Event.organizer_id == user.id).order_by(Event.event_date.desc())
    )
    events = result.scalars().all()
    return [{"id": e.id, "title": e.title, "event_date": str(e.event_date), "status": e.status} for e in events]


@router.get("/scanner/events/{event_id}/stats")
async def scanner_event_stats(event_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    event = await db.get(Event, event_id)
    if not event or event.organizer_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")
    checked_in = await db.scalar(select(func.count(CheckIn.id)).where(CheckIn.event_id == event_id))
    total = await db.scalar(select(func.count(Guest.id)).where(Guest.event_id == event_id))
    return {"checked_in": checked_in or 0, "total_guests": total or 0}
