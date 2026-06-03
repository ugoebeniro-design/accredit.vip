from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from pydantic import BaseModel

from app.core.database import get_db
from app.models.guest import Guest
from app.models.event import Event
from app.models.notification import Notification
from app.models.invite import InviteMessage

router = APIRouter()


class RSVPRequest(BaseModel):
    token: str
    status: str


async def _create_rsvp_notification(guest: Guest, event: Event, db: AsyncSession):
    if not guest or not event:
        return
    status_label = {"accepted": "accepted", "declined": "declined", "maybe": "said maybe"}
    label = status_label.get(guest.rsvp_status, "responded to")
    notif = Notification(
        user_id=event.organizer_id,
        event_id=event.id,
        title=f"{guest.name} {label} your invite",
        message=f"{guest.name} has {label} the invite for {event.title}.",
        notification_type="rsvp",
    )
    db.add(notif)
    await db.flush()


@router.post("/rsvp")
async def submit_rsvp(req: RSVPRequest, db: AsyncSession = Depends(get_db)):
    if req.status not in ("accepted", "declined", "maybe"):
        raise HTTPException(status_code=400, detail="Invalid RSVP status")

    result = await db.execute(select(Guest).where(Guest.rsvp_token == req.token))
    guest = result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    if guest.rsvp_status != "pending":
        raise HTTPException(status_code=400, detail="RSVP already submitted")

    guest.rsvp_status = req.status
    guest.rsvped_at = datetime.now(timezone.utc)

    event_result = await db.execute(select(Event).where(Event.id == guest.event_id))
    event = event_result.scalar_one_or_none()

    await _create_rsvp_notification(guest, event, db)
    await db.commit()

    return {"message": "RSVP updated", "status": req.status}


@router.get("/rsvp/{token}")
async def get_rsvp_info(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Guest).where(Guest.rsvp_token == token))
    guest = result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Invalid RSVP link")

    if guest.invite_viewed_at is None:
        guest.invite_viewed_at = datetime.now(timezone.utc)

    event_result = await db.execute(select(Event).where(Event.id == guest.event_id))
    event = event_result.scalar_one_or_none()

    msg_result = await db.execute(
        select(InviteMessage).where(
            InviteMessage.guest_id == guest.id,
            InviteMessage.opened_at.is_(None),
        ).order_by(InviteMessage.created_at.desc()).limit(1)
    )
    msg = msg_result.scalar_one_or_none()
    if msg:
        msg.opened_at = datetime.now(timezone.utc)

    await db.commit()

    return {
        "guest": {
            "id": guest.id,
            "name": guest.name,
            "rsvp_status": guest.rsvp_status,
        },
        "event": {
            "id": event.id,
            "title": event.title,
            "host_name": event.host_name,
            "event_date": str(event.event_date),
            "event_time": str(event.event_time),
            "venue": event.venue,
            "dress_code": event.dress_code,
            "description": event.description,
            "cover_image": event.cover_image,
        },
    }


@router.get("/events/{event_id}/rsvp-stats")
async def rsvp_stats(event_id: int, db: AsyncSession = Depends(get_db)):
    total = await db.scalar(
        select(func.count(Guest.id)).where(Guest.event_id == event_id)
    )
    accepted = await db.scalar(
        select(func.count(Guest.id)).where(
            Guest.event_id == event_id, Guest.rsvp_status == "accepted"
        )
    )
    declined = await db.scalar(
        select(func.count(Guest.id)).where(
            Guest.event_id == event_id, Guest.rsvp_status == "declined"
        )
    )
    pending = await db.scalar(
        select(func.count(Guest.id)).where(
            Guest.event_id == event_id, Guest.rsvp_status == "pending"
        )
    )

    return {
        "total": total or 0,
        "accepted": accepted or 0,
        "declined": declined or 0,
        "pending": pending or 0,
    }
