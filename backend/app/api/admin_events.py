"""Admin endpoints for event approval and management"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.models.event import Event
from app.services.notify import send_notification

router = APIRouter()


class EventApprovalRequest(BaseModel):
    event_id: int
    approved: bool
    reason: str | None = None


class EventReviewResponse(BaseModel):
    id: int
    title: str
    host_name: str
    event_type: str
    review_status: str
    flagged_keywords: list[str] | None
    organizer_email: str
    created_at: datetime

    class Config:
        from_attributes = True


async def check_admin(user: User = Depends(get_current_user)) -> User:
    """Verify user is admin"""
    if user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/admin/events/pending")
async def list_pending_events(
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """List all events pending admin review"""
    offset = (page - 1) * limit

    result = await db.execute(
        select(Event)
        .where(Event.review_status == "pending_review")
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    events = result.scalars().all()

    total_result = await db.execute(
        select(func.count(Event.id)).where(Event.review_status == "pending_review")
    )
    total = total_result.scalar() or 0
    total_pages = (total + limit - 1) // limit

    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "host_name": e.host_name,
                "event_type": e.event_type,
                "event_date": e.event_date,
                "event_time": e.event_time,
                "venue": e.venue,
                "ticket_price": e.ticket_price,
                "status": e.review_status,
                "created_at": e.created_at,
            }
            for e in events
        ],
        "total": total,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
    }


@router.get("/admin/events/flagged")
async def list_flagged_events(
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """List all flagged events for manual review"""
    offset = (page - 1) * limit

    result = await db.execute(
        select(Event)
        .where(Event.review_status == "flagged")
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    events = result.scalars().all()

    total_result = await db.execute(
        select(func.count(Event.id)).where(Event.review_status == "flagged")
    )
    total = total_result.scalar() or 0
    total_pages = (total + limit - 1) // limit

    return {
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "host_name": e.host_name,
                "event_date": e.event_date,
                "event_time": e.event_time,
                "venue": e.venue,
                "ticket_price": e.ticket_price,
                "status": e.review_status,
                "created_at": e.created_at,
            }
            for e in events
        ],
        "total": total,
        "total_pages": total_pages,
        "page": page,
        "limit": limit,
    }


@router.post("/admin/events/{event_id}/approve")
async def approve_event(
    event_id: int,
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve an event for public listing"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.review_status not in ["pending_review", "flagged"]:
        raise HTTPException(status_code=400, detail="Event is not pending review")

    # Update event status
    event.status = "published"
    event.is_public = True
    event.review_status = "approved"
    event.updated_at = datetime.now(timezone.utc)

    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Notify organizer
    organizer_result = await db.execute(
        select(User).where(User.id == event.organizer_id)
    )
    organizer = organizer_result.scalar_one_or_none()

    if organizer:
        await send_notification(
            db=db,
            user_id=organizer.id,
            type="event_approved",
            title="Your Event Was Approved! 🎉",
            message=f"Your event '{event.title}' has been approved and is now live on Discover Events.",
            data={"event_id": event.id},
        )

    await log_action(
        db=db, user_id=admin.id, action="event_approved",
        resource_type="event", resource_id=event.id,
        description=f"Event '{event.title}' approved and published",
    )

    return {
        "status": "approved",
        "event_id": event.id,
        "message": f"Event '{event.title}' approved and published",
    }


@router.post("/admin/events/{event_id}/reject")
async def reject_event(
    event_id: int,
    reason: str = "No reason provided",
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reject an event from public listing"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.review_status not in ["pending_review", "flagged"]:
        raise HTTPException(status_code=400, detail="Event is not pending review")

    # Update event status
    event.status = "rejected"
    event.is_public = False
    event.review_status = "rejected"
    event.review_note = reason
    event.updated_at = datetime.now(timezone.utc)

    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Notify organizer
    organizer_result = await db.execute(
        select(User).where(User.id == event.organizer_id)
    )
    organizer = organizer_result.scalar_one_or_none()

    if organizer:
        await send_notification(
            db=db,
            user_id=organizer.id,
            type="event_rejected",
            title="Event Submission Requires Revision",
            message=f"Your event '{event.title}' was not approved. Reason: {reason}",
            data={"event_id": event.id, "reason": reason},
        )

    await log_action(
        db=db, user_id=admin.id, action="event_rejected",
        resource_type="event", resource_id=event.id,
        description=f"Event '{event.title}' rejected. Reason: {reason}",
    )

    return {
        "status": "rejected",
        "event_id": event.id,
        "reason": reason,
        "message": f"Event '{event.title}' rejected",
    }


@router.delete("/admin/events/{event_id}")
async def delete_event(
    event_id: int,
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
):
    """Delete an event (admin only)"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Delete the event
    db.delete(event)
    await db.commit()

    await log_action(
        db=db, user_id=admin.id, action="event_deleted",
        resource_type="event", resource_id=event_id,
        description=f"Event '{event.title}' deleted by admin",
    )

    return {
        "status": "deleted",
        "event_id": event_id,
        "message": "Event deleted successfully",
    }


@router.get("/admin/events/{event_id}/review-details")
async def get_event_review_details(
    event_id: int,
    admin: User = Depends(check_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed review information for an event"""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    organizer_result = await db.execute(
        select(User).where(User.id == event.organizer_id)
    )
    organizer = organizer_result.scalar_one_or_none()

    return {
        "id": event.id,
        "title": event.title,
        "host_name": event.host_name,
        "event_type": event.event_type,
        "description": event.description,
        "event_date": event.event_date,
        "event_time": event.event_time,
        "venue": event.venue,
        "guest_count_range": event.guest_count_range,
        "organizer": {
            "id": organizer.id,
            "name": organizer.full_name,
            "email": organizer.email,
        } if organizer else None,
        "review_status": event.review_status,
        "flagged_keywords": event.flagged_keywords or [],
        "review_note": event.review_note,
        "created_at": event.created_at,
    }
