from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, or_, func, and_
from pydantic import BaseModel
import csv
import io
import re

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.guest import Guest
from app.models.event import Event

from app.models.guest import Guest
from app.models.invite import InviteMessage

router = APIRouter()


def guest_limit_from_range(value: str) -> int | None:
    numbers = [int(item) for item in re.findall(r"\d+", value or "")]
    return max(numbers) if numbers else None


async def ensure_guest_capacity(db: AsyncSession, event: Event, additional_count: int):
    limit = guest_limit_from_range(event.guest_count_range)
    if limit is None:
        return

    result = await db.execute(
        select(func.count()).select_from(Guest).where(Guest.event_id == event.id)
    )
    current_count = result.scalar_one()
    if current_count + additional_count > limit:
        raise HTTPException(
            status_code=400,
            detail=f"Guest limit exceeded. This event allows up to {limit} guests.",
        )


class GuestCreate(BaseModel):
    name: str
    phone: str | None = None
    email: str | None = None
    custom_data: dict | None = None


@router.post("/{event_id}/guests")
async def add_guest(
    event_id: int,
    req: GuestCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await ensure_guest_capacity(db, event, 1)

    guest = Guest(event_id=event_id, **req.model_dump())
    db.add(guest)
    await db.commit()
    await db.refresh(guest)
    return guest


@router.get("/{event_id}/guests")
async def list_guests(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search: str = Query(None, description="Search by name, email, or phone"),
    rsvp_status: str = Query(None, description="Filter by RSVP status (accepted/declined/pending/maybe)"),
    invite_status: str = Query(None, description="Filter by invite delivery status (sent/not_sent/delivered/failed)"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(10, ge=1, le=100, description="Page size"),
):
    base = select(Guest).where(Guest.event_id == event_id, Guest.deleted_at == None)
    count_base = select(func.count()).select_from(Guest).where(Guest.event_id == event_id, Guest.deleted_at == None)

    filters = []
    if search:
        filters.append(
            or_(
                Guest.name.ilike(f"%{search}%"),
                Guest.email.ilike(f"%{search}%"),
                Guest.phone.ilike(f"%{search}%"),
            )
        )
    if rsvp_status:
        filters.append(Guest.rsvp_status == rsvp_status)
    if invite_status == "sent":
        filters.append(Guest.invite_sent == True)
    elif invite_status == "not_sent":
        filters.append(Guest.invite_sent == False)
    elif invite_status == "delivered":
        filters.append(Guest.invite_sent == True)
    elif invite_status == "failed":
        filters.append(Guest.invite_sent == True)

    if filters:
        base = base.where(and_(*filters))
        count_base = count_base.where(and_(*filters))

    total_result = await db.execute(count_base)
    total = total_result.scalar_one()

    query = base.order_by(Guest.id.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    guests = result.scalars().all()

    # Build communication_status: per-channel latest message status per guest
    guest_ids = [g.id for g in guests]
    comm_status_map: dict[int, dict] = {g.id: {} for g in guests}
    if guest_ids:
        msg_result = await db.execute(
            select(InviteMessage).where(InviteMessage.guest_id.in_(guest_ids))
        )
        for msg in msg_result.scalars().all():
            gid = msg.guest_id
            if gid not in comm_status_map:
                comm_status_map[gid] = {}
            existing = comm_status_map[gid].get(msg.channel)
            if not existing or (msg.created_at and existing.get("created_at") and msg.created_at > existing["created_at"]):
                comm_status_map[gid][msg.channel] = {
                    "status": msg.status,
                    "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
                    "delivered_at": msg.delivered_at.isoformat() if msg.delivered_at else None,
                    "opened_at": msg.opened_at.isoformat() if msg.opened_at else None,
                    "error": msg.error,
                }

    guest_list = []
    for g in guests:
        d = g.to_dict()
        d["communication_status"] = comm_status_map.get(g.id, {})
        guest_list.append(d)

    return {
        "guests": guest_list,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.post("/{event_id}/guests/upload")
async def upload_guests_csv(
    event_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    guests = []
    for row in reader:
        name = row.get("name", "").strip()
        if not name:
            continue
        guest = Guest(
            event_id=event_id,
            name=name,
            phone=row.get("phone", "").strip() or None,
            email=row.get("email", "").strip() or None,
        )
        guests.append(guest)

    if not guests:
        raise HTTPException(status_code=400, detail="No valid guests found in CSV")

    await ensure_guest_capacity(db, event, len(guests))

    db.add_all(guests)
    await db.commit()

    return {"imported": len(guests)}


class GuestUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    email: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    custom_data: dict | None = None


@router.put("/{event_id}/guests/{guest_id}")
async def update_guest(
    event_id: int,
    guest_id: int,
    req: GuestUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    g_result = await db.execute(
        select(Guest).where(Guest.id == guest_id, Guest.event_id == event_id)
    )
    guest = g_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    for key, value in updates.items():
        setattr(guest, key, value)
    await db.commit()
    await db.refresh(guest)
    return guest


@router.delete("/{event_id}/guests/{guest_id}")
async def delete_guest(
    event_id: int,
    guest_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    permanent: bool = Query(False, description="Hard-delete instead of soft-delete"),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    g_result = await db.execute(
        select(Guest).where(Guest.id == guest_id, Guest.event_id == event_id)
    )
    guest = g_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    if permanent:
        for table in ("invite_messages", "qr_codes", "checkins", "scan_attempts", "payments"):
            await db.execute(text(f"DELETE FROM {table} WHERE guest_id = :gid"), {"gid": guest_id})
        await db.delete(guest)
    else:
        guest.deleted_at = func.now()

    await db.commit()
    return {"message": "Guest deleted"}


@router.post("/{event_id}/guests/{guest_id}/restore")
async def restore_guest(
    event_id: int,
    guest_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    g_result = await db.execute(
        select(Guest).where(Guest.id == guest_id, Guest.event_id == event_id)
    )
    guest = g_result.scalar_one_or_none()
    if not guest or not guest.deleted_at:
        raise HTTPException(status_code=404, detail="Guest not found or not deleted")

    guest.deleted_at = None
    await db.commit()
    return {"message": "Guest restored"}


@router.get("/{event_id}/rsvp-stats")
async def get_rsvp_stats(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    guests = await db.execute(select(Guest).where(Guest.event_id == event_id))
    all_guests = guests.scalars().all()

    return {
        "total": len(all_guests),
        "accepted": len([g for g in all_guests if g.rsvp_status == "accepted"]),
        "declined": len([g for g in all_guests if g.rsvp_status == "declined"]),
        "pending": len([g for g in all_guests if g.rsvp_status == "pending"]),
    }
