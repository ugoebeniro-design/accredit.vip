"""RSVP handling endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.models.guest import Guest
from app.models.event import Event

router = APIRouter()


class RSVPResponse(BaseModel):
    response: str


@router.get("/rsvp/{token}")
async def get_rsvp_data(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Get event and guest data for RSVP link."""
    guest_result = await db.execute(
        select(Guest).where(Guest.rsvp_token == token)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Invalid RSVP link")

    event_result = await db.execute(
        select(Event).where(Event.id == guest.event_id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return {
        "event_title": event.title,
        "event_date": str(event.event_date),
        "event_time": str(event.event_time),
        "venue": event.venue,
        "host_name": event.host_name,
        "guest_name": guest.name,
    }


@router.post("/rsvp/{token}")
async def submit_rsvp(
    token: str,
    rsvp: RSVPResponse,
    db: AsyncSession = Depends(get_db),
):
    """Submit RSVP response."""
    guest_result = await db.execute(
        select(Guest).where(Guest.rsvp_token == token)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Invalid RSVP link")

    if rsvp.response.lower() == "yes":
        guest.rsvp_status = "yes"
    elif rsvp.response.lower() == "no":
        guest.rsvp_status = "no"
    else:
        raise HTTPException(status_code=400, detail="Invalid response. Use 'yes' or 'no'")

    from datetime import datetime
    guest.rsvped_at = datetime.utcnow()

    await db.commit()

    return {
        "status": "success",
        "message": f"RSVP recorded: {rsvp.response}",
    }
