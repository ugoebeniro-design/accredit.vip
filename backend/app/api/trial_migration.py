"""Trial event migration - moves localStorage trial data to dashboard after signup."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.event import Event

router = APIRouter()


class TrialFormData(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: Optional[str] = None
    event_time: Optional[str] = None
    timezone: str = "UTC"
    venue: Optional[str] = None
    delivery_channels: List[str] = []
    template: Optional[str] = None
    extra_data: Optional[dict] = None


class TrialEventMigration(BaseModel):
    mode: str  # 'invite' or 'event'
    form: TrialFormData
    pass_packages: Optional[List[dict]] = None
    social_handles: Optional[List[dict]] = None
    lineup: Optional[List[dict]] = None
    uploaded_image_data: Optional[str] = None


@router.post("/trial/migrate")
async def migrate_trial_events(
    migrations: List[TrialEventMigration],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Migrate trial localStorage events to database as drafts after user signup."""
    created_events = []

    for trial in migrations:
        try:
            # Create draft event in database
            event = Event(
                organizer_id=user.id,
                title=trial.form.title,
                description=trial.form.description,
                event_date=trial.form.event_date,
                event_time=trial.form.event_time,
                timezone=trial.form.timezone,
                venue=trial.form.venue,
                event_type="invite" if trial.mode == "invite" else "event",
                delivery_channels=",".join(trial.form.delivery_channels),
                template=trial.form.template or "minimal",
                guest_count_range="50-500",
                status="draft",
                is_trial_migration=True,
                extra_data=trial.form.extra_data or {},
            )

            db.add(event)
            await db.flush()  # Get the ID without committing yet

            # Store pass packages if provided
            if trial.pass_packages:
                event.pass_packages = trial.pass_packages

            # Store social handles if provided
            if trial.social_handles:
                event.social_handles = trial.social_handles

            # Store lineup if provided
            if trial.lineup:
                event.lineup = trial.lineup

            # Store image if provided
            if trial.uploaded_image_data:
                event.image_data = trial.uploaded_image_data

            db.add(event)
            created_events.append({
                "id": event.id,
                "title": event.title,
                "type": trial.mode,
                "status": "draft",
            })

        except Exception as e:
            # Continue with other migrations if one fails
            print(f"Failed to migrate trial event: {e}")
            continue

    await db.commit()

    return {
        "migrated": len(created_events),
        "events": created_events,
        "message": f"Successfully migrated {len(created_events)} trial event(s) to your dashboard",
    }


@router.get("/trial/status")
async def check_trial_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if user has draft events from trial migration."""
    from sqlalchemy import select

    result = await db.execute(
        select(Event).where(
            Event.organizer_id == user.id,
            Event.status == "draft",
            Event.is_trial_migration == True,
        )
    )
    events = result.scalars().all()

    return {
        "has_trial_events": len(events) > 0,
        "count": len(events),
        "events": [
            {
                "id": e.id,
                "title": e.title,
                "type": e.event_type,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ],
    }
