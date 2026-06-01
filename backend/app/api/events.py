import re, unicodedata
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from pydantic import BaseModel
from datetime import date, time
from typing import Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.event import Event

router = APIRouter()


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    text = re.sub(r"[-\s]+", "-", text)
    return text[:80]


async def generate_unique_slug(title: str, db: AsyncSession) -> str:
    base = slugify(title) or "event"
    slug = base
    counter = 1
    while True:
        result = await db.execute(select(Event).where(Event.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base}-{counter}"
        counter += 1


class EventCreateRequest(BaseModel):
    title: str
    event_type: str
    host_name: str
    event_date: date
    event_time: time
    venue: str
    map_link: str | None = None
    dress_code: str | None = None
    description: str | None = None
    cover_image: str | None = None
    timezone: str = "WAT"
    guest_count_range: str
    is_public: bool = False
    category: str | None = None
    ticket_price: int | None = None
    tickets_available: int | None = None
    pass_packages: list[dict[str, Any]] | None = None
    lineup: list[dict[str, Any]] | None = None
    after_party_enabled: bool = False
    after_party_location: str | None = None
    after_party_time: str | None = None


@router.post("")
async def create_event(
    req: EventCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event = Event(
        organizer_id=user.id,
        slug=await generate_unique_slug(req.title, db),
        **req.model_dump(),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("")
async def list_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search: str = Query(None, description="Search by title or venue"),
    category: str = Query(None, description="Filter by category"),
    date_from: str = Query(None, description="Filter events on or after this date (YYYY-MM-DD)"),
    date_to: str = Query(None, description="Filter events on or before this date (YYYY-MM-DD)"),
):
    query = select(Event).where(Event.organizer_id == user.id)
    if search:
        query = query.where(
            or_(Event.title.ilike(f"%{search}%"), Event.venue.ilike(f"%{search}%"))
        )
    if category:
        query = query.where(Event.category == category)
    if date_from:
        query = query.where(Event.event_date >= date.fromisoformat(date_from))
    if date_to:
        query = query.where(Event.event_date <= date.fromisoformat(date_to))
    query = query.order_by(Event.event_date.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/public")
async def list_public_events(
    db: AsyncSession = Depends(get_db),
    search: str = Query(None, description="Search by title or venue"),
    category: str = Query(None, description="Filter by category"),
    location: str = Query(None, description="Filter by venue/location"),
    month: int = Query(None, description="Filter by month (1-12)"),
    price_type: str = Query(None, description="Filter by price: free, paid, or all"),
    date_from: str = Query(None, description="Filter events on or after this date (YYYY-MM-DD)"),
    date_to: str = Query(None, description="Filter events on or before this date (YYYY-MM-DD)"),
):
    query = select(Event).where(Event.is_public == True)
    if search:
        query = query.where(
            or_(Event.title.ilike(f"%{search}%"), Event.venue.ilike(f"%{search}%"))
        )
    if category:
        query = query.where(Event.category == category)
    if location:
        query = query.where(Event.venue.ilike(f"%{location}%"))
    if month:
        query = query.where(func.extract("month", Event.event_date) == month)
    if price_type == "free":
        query = query.where(
            or_(Event.ticket_price == None, Event.ticket_price == 0)
        )
    elif price_type == "paid":
        query = query.where(Event.ticket_price > 0)
    if date_from:
        query = query.where(Event.event_date >= date.fromisoformat(date_from))
    else:
        query = query.where(Event.event_date >= date.today())
    if date_to:
        query = query.where(Event.event_date <= date.fromisoformat(date_to))
    query = query.order_by(Event.event_date.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/by-slug/{slug}")
async def get_event_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.slug == slug))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/{event_id}")
async def get_event(
    event_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/{event_id}")
async def update_event(
    event_id: int,
    req: EventCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in req.model_dump().items():
        setattr(event, key, value)
    if req.title:
        event.slug = await generate_unique_slug(req.title, db)
    await db.commit()
    await db.refresh(event)
    return event


@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    await db.delete(event)
    await db.commit()
    return {"message": "Event deleted"}
