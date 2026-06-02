from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, case
from datetime import datetime, timezone, timedelta, date
import csv
import io

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_action
from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.payment import Payment
from app.models.checkin import CheckIn
from app.models.support_ticket import SupportTicket
from app.models.staff import StaffAssignment
from app.models.invite import InviteBatch, InviteMessage
from app.models.audit_log import AuditLog
from app.models.accreditation import AccreditationRequest
from app.models.ticket_purchase import TicketPurchase
from app.models.data_management import DataGroup, DataProfile, DataRequest
from sqlalchemy.orm import joinedload

router = APIRouter()


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("super_admin", "admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def admin_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_count = await db.scalar(select(func.count(User.id)))
    event_count = await db.scalar(select(func.count(Event.id)))
    guest_count = await db.scalar(select(func.count(Guest.id)))
    payment_count = await db.scalar(select(func.count(Payment.id)))
    checkin_count = await db.scalar(select(func.count(CheckIn.id)))
    ticket_count = await db.scalar(select(func.count(SupportTicket.id)))
    acc_count = await db.scalar(select(func.count(AccreditationRequest.id)))
    pending_reviews = await db.scalar(
        select(func.count(Event.id)).where(
            Event.review_status.in_(["pending_review", "flagged"])
        )
    )
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "paid")
    )
    total_revenue = revenue_result.scalar()
    return {
        "users": user_count or 0,
        "events": event_count or 0,
        "guests": guest_count or 0,
        "payments": payment_count or 0,
        "checkins": checkin_count or 0,
        "tickets": ticket_count or 0,
        "accreditation_requests": acc_count or 0,
        "total_revenue": float(total_revenue or 0),
        "pending_reviews": pending_reviews or 0,
    }


@router.get("/users")
async def admin_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    q = select(User)
    if search:
        q = q.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    users = result.scalars().all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": str(u.created_at),
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}")
async def admin_user_detail(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(404, detail="User not found")
    event_count = await db.scalar(select(func.count(Event.id)).where(Event.organizer_id == user_id))
    payment_count = await db.scalar(select(func.count(Payment.id)).where(Payment.organizer_id == user_id))
    ticket_count = await db.scalar(select(func.count(SupportTicket.id)).where(SupportTicket.user_id == user_id))
    return {
        "id": u.id,
        "email": u.email,
        "full_name": u.full_name,
        "phone": u.phone,
        "role": u.role,
        "is_active": u.is_active,
        "is_verified": u.is_verified,
        "created_at": str(u.created_at),
        "event_count": event_count or 0,
        "payment_count": payment_count or 0,
        "ticket_count": ticket_count or 0,
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    old_role = user.role
    user.role = role
    await db.commit()
    await log_action(db, admin.id, "role_change", "user", user_id, f"Role changed from {old_role} to {role}")
    return {"message": "Role updated"}


@router.get("/events")
async def admin_events(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    status: str | None = Query(None),
    event_type: str | None = Query(None),
    is_public: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    q = select(
        Event.id,
        Event.title,
        Event.event_type,
        Event.status,
        Event.is_public,
        Event.created_at,
        User.full_name,
    ).join(User, Event.organizer_id == User.id)
    if search:
        q = q.where(Event.title.ilike(f"%{search}%"))
    if status:
        q = q.where(Event.status == status)
    if event_type:
        q = q.where(Event.event_type == event_type)
    if is_public is not None:
        q = q.where(Event.is_public == is_public)
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.order_by(Event.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "events": [
            {
                "id": r.id,
                "title": r.title,
                "event_type": r.event_type,
                "status": r.status,
                "is_public": r.is_public,
                "organizer": r.full_name,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
    }


@router.get("/events/{event_id}")
async def admin_event_detail(
    event_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event, User.full_name).join(User, Event.organizer_id == User.id).where(Event.id == event_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(404, detail="Event not found")
    event, organizer_name = row
    guest_count = await db.scalar(select(func.count(Guest.id)).where(Guest.event_id == event_id))
    checkin_count = await db.scalar(select(func.count(CheckIn.id)).where(CheckIn.event_id == event_id))
    payment = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.event_id == event_id, Payment.status == "paid")
    )
    revenue = payment.scalar()
    return {
        "id": event.id,
        "title": event.title,
        "event_type": event.event_type,
        "host_name": event.host_name,
        "event_date": str(event.event_date),
        "event_time": event.event_time,
        "timezone": event.timezone,
        "venue": event.venue,
        "description": event.description or "",
        "status": event.status,
        "is_public": event.is_public,
        "category": event.category or "",
        "organizer": organizer_name,
        "cover_image": event.cover_image or "",
        "guest_count": guest_count or 0,
        "checkin_count": checkin_count or 0,
        "revenue": float(revenue or 0),
        "created_at": str(event.created_at),
    }


@router.get("/revenue")
async def admin_revenue(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Payment.provider,
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.amount), 0),
        ).where(Payment.status == "paid").group_by(Payment.provider)
    )
    rows = result.all()
    return [
        {"provider": r[0], "count": r[1], "total": float(r[2])}
        for r in rows
    ]


@router.get("/revenue/timeline")
async def admin_revenue_timeline(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(Payment.paid_at, Date),
            func.coalesce(func.sum(Payment.amount), 0),
            func.count(Payment.id),
        ).where(Payment.status == "paid", Payment.paid_at >= since)
        .group_by(cast(Payment.paid_at, Date))
        .order_by(cast(Payment.paid_at, Date))
    )
    rows = result.all()
    return [
        {"date": str(r[0]), "revenue": float(r[1]), "transactions": r[2]}
        for r in rows
    ]


@router.get("/users/timeline")
async def admin_users_timeline(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(User.created_at, Date),
            func.count(User.id),
        ).where(User.created_at >= since)
        .group_by(cast(User.created_at, Date))
        .order_by(cast(User.created_at, Date))
    )
    rows = result.all()
    return [{"date": str(r[0]), "count": r[1]} for r in rows]


@router.get("/events/timeline")
async def admin_events_timeline(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            cast(Event.created_at, Date),
            func.count(Event.id),
        ).where(Event.created_at >= since)
        .group_by(cast(Event.created_at, Date))
        .order_by(cast(Event.created_at, Date))
    )
    rows = result.all()
    return [{"date": str(r[0]), "count": r[1]} for r in rows]


@router.get("/delivery-stats")
async def admin_delivery_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_batches = await db.scalar(select(func.count(InviteBatch.id)))
    total_messages = await db.scalar(select(func.count(InviteMessage.id)))
    delivered = await db.scalar(
        select(func.count(InviteMessage.id)).where(InviteMessage.status == "delivered")
    )
    failed = await db.scalar(
        select(func.count(InviteMessage.id)).where(InviteMessage.status == "failed")
    )
    pending = await db.scalar(
        select(func.count(InviteMessage.id)).where(InviteMessage.status == "queued")
    )
    channel_result = await db.execute(
        select(InviteMessage.channel, func.count(InviteMessage.id))
        .group_by(InviteMessage.channel)
    )
    by_channel = {r[0]: r[1] for r in channel_result.all()}
    return {
        "total_batches": total_batches or 0,
        "total_messages": total_messages or 0,
        "delivered": delivered or 0,
        "failed": failed or 0,
        "pending": pending or 0,
        "by_channel": by_channel,
    }


@router.get("/tickets")
async def admin_tickets(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
):
    q = select(
        SupportTicket.id,
        SupportTicket.subject,
        SupportTicket.message,
        SupportTicket.status,
        SupportTicket.created_at,
        SupportTicket.resolved_at,
        User.full_name,
        User.email,
    ).join(User, SupportTicket.user_id == User.id)
    if status_filter:
        q = q.where(SupportTicket.status == status_filter)
    q = q.order_by(SupportTicket.created_at.desc())
    result = await db.execute(q)
    rows = result.all()
    return [
        {
            "id": r.id,
            "subject": r.subject,
            "message": r.message,
            "status": r.status,
            "created_at": str(r.created_at),
            "resolved_at": str(r.resolved_at) if r.resolved_at else None,
            "user_name": r.full_name,
            "user_email": r.email,
        }
        for r in rows
    ]


@router.patch("/tickets/{ticket_id}")
async def update_ticket_status(
    ticket_id: int,
    status: str,
    assigned_to: int | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = status
    if assigned_to:
        ticket.assigned_to = assigned_to
    if status == "resolved":
        ticket.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Ticket updated"}


@router.get("/checkins")
async def admin_checkins(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    q = select(
        CheckIn.id,
        CheckIn.checked_in_at,
        Guest.name,
        Guest.email,
        Event.title,
        Event.id,
        User.full_name,
    ).join(Guest, CheckIn.guest_id == Guest.id).join(Event, CheckIn.event_id == Event.id).join(
        User, CheckIn.scanned_by == User.id, isouter=True
    ).order_by(CheckIn.checked_in_at.desc())
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "checkins": [
            {
                "id": r.id,
                "guest_name": r.name,
                "guest_email": r.email,
                "event_title": r.title,
                "event_id": r.id_1,
                "scanned_by": r.full_name or "Auto",
                "checked_in_at": str(r.checked_in_at),
            }
            for r in rows
        ],
    }


@router.post("/staff")
async def create_staff_assignment(
    user_id: int = Query(...),
    event_id: int = Query(...),
    role: str = Query("accreditation"),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    existing = await db.execute(
        select(StaffAssignment).where(
            StaffAssignment.user_id == user_id,
            StaffAssignment.event_id == event_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Staff already assigned to this event")

    assignment = StaffAssignment(user_id=user_id, event_id=event_id, role=role)
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    await log_action(db, admin.id, "staff_assign", "staff_assignment", assignment.id,
                     f"Assigned {user.full_name} as {role} to event '{event.title}'")
    return {"id": assignment.id, "message": "Staff assigned"}


@router.delete("/staff/{assignment_id}")
async def delete_staff_assignment(
    assignment_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(StaffAssignment).where(StaffAssignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assignment)
    await db.commit()
    await log_action(db, admin.id, "staff_unassign", "staff_assignment", assignment_id,
                     f"Removed staff assignment {assignment_id}")
    return {"message": "Staff unassigned"}


@router.get("/staff")
async def admin_staff(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            StaffAssignment.id,
            StaffAssignment.role,
            StaffAssignment.created_at,
            User.full_name,
            User.email,
            Event.title,
        ).join(User, StaffAssignment.user_id == User.id)
        .join(Event, StaffAssignment.event_id == Event.id)
        .order_by(StaffAssignment.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "staff_name": r.full_name,
            "staff_email": r.email,
            "event_title": r.title,
            "role": r.role,
            "assigned_at": str(r.created_at),
        }
        for r in rows
    ]


@router.get("/payments")
async def admin_payments(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    q = select(
        Payment.id,
        Payment.amount,
        Payment.currency,
        Payment.provider,
        Payment.reference,
        Payment.status,
        Payment.paid_at,
        Payment.created_at,
        Event.title,
        User.full_name,
    ).join(Event, Payment.event_id == Event.id).join(User, Payment.organizer_id == User.id).order_by(
        Payment.created_at.desc()
    )
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "payments": [
            {
                "id": r.id,
                "amount": float(r.amount),
                "currency": r.currency,
                "provider": r.provider,
                "reference": r.reference,
                "status": r.status,
                "paid_at": str(r.paid_at) if r.paid_at else None,
                "created_at": str(r.created_at),
                "event_title": r.title,
                "organizer_name": r.full_name,
            }
            for r in rows
        ],
    }


@router.get("/audit-logs")
async def admin_audit_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    q = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        q = q.where(AuditLog.action == action)
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.scalars().all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "logs": [
            {
                "id": r.id,
                "user_id": r.user_id,
                "action": r.action,
                "resource": r.resource,
                "resource_id": r.resource_id,
                "details": r.details,
                "ip_address": r.ip_address,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
    }


@router.get("/fraud-flags")
async def admin_fraud_flags(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    inactive_users = await db.scalar(select(func.count(User.id)).where(User.is_active == False))
    unverified_users = await db.scalar(select(func.count(User.id)).where(User.is_verified == False))
    failed_payments = await db.scalar(select(func.count(Payment.id)).where(Payment.status == "failed"))
    failed_deliveries = await db.scalar(
        select(func.count(InviteMessage.id)).where(InviteMessage.status == "failed")
    )
    flagged_events = await db.scalar(
        select(func.count(Event.id)).where(Event.review_status == "flagged")
    )
    return {
        "inactive_users": inactive_users or 0,
        "unverified_users": unverified_users or 0,
        "failed_payments": failed_payments or 0,
        "failed_deliveries": failed_deliveries or 0,
        "flagged_events": flagged_events or 0,
    }


@router.get("/accreditation-requests")
async def admin_accreditation_requests(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            AccreditationRequest.id,
            AccreditationRequest.staff_count,
            AccreditationRequest.scanner_rental,
            AccreditationRequest.status,
            AccreditationRequest.notes,
            AccreditationRequest.created_at,
            Event.title,
            User.full_name,
        ).join(Event, AccreditationRequest.event_id == Event.id)
        .join(User, AccreditationRequest.organizer_id == User.id)
        .order_by(AccreditationRequest.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": r.id,
            "staff_count": r.staff_count,
            "scanner_rental": r.scanner_rental,
            "status": r.status,
            "notes": r.notes or "",
            "event_title": r.title,
            "organizer_name": r.full_name,
            "created_at": str(r.created_at),
        }
        for r in rows
    ]


@router.get("/export/{resource}")
async def admin_export(
    resource: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    output = io.StringIO()
    writer = csv.writer(output)

    if resource == "users":
        result = await db.execute(select(User).order_by(User.created_at.desc()))
        rows = result.scalars().all()
        writer.writerow(["ID", "Name", "Email", "Role", "Active", "Verified", "Created"])
        for r in rows:
            writer.writerow([r.id, r.full_name, r.email, r.role, r.is_active, r.is_verified, str(r.created_at)])
    elif resource == "events":
        result = await db.execute(
            select(Event.id, Event.title, Event.event_type, Event.status, Event.is_public, Event.created_at, User.full_name)
            .join(User, Event.organizer_id == User.id).order_by(Event.created_at.desc())
        )
        rows = result.all()
        writer.writerow(["ID", "Title", "Type", "Status", "Public", "Organizer", "Created"])
        for r in rows:
            writer.writerow([r.id, r.title, r.event_type, r.status, r.is_public, r.full_name, str(r.created_at)])
    elif resource == "payments":
        result = await db.execute(
            select(Payment.id, Payment.amount, Payment.currency, Payment.provider, Payment.reference, Payment.status, Payment.created_at, Event.title, User.full_name)
            .join(Event, Payment.event_id == Event.id).join(User, Payment.organizer_id == User.id)
            .order_by(Payment.created_at.desc())
        )
        rows = result.all()
        writer.writerow(["ID", "Amount", "Currency", "Provider", "Reference", "Status", "Event", "Organizer", "Date"])
        for r in rows:
            writer.writerow([r.id, float(r.amount), r.currency, r.provider, r.reference, r.status, r.title, r.full_name, str(r.created_at)])
    else:
        raise HTTPException(404, detail="Unknown export resource")


@router.get("/ticket-purchases")
async def admin_ticket_purchases(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    status: str | None = Query(None),
):
    q = select(TicketPurchase, Event.title.label("event_title")).join(
        Event, TicketPurchase.event_id == Event.id
    )
    if status:
        q = q.where(TicketPurchase.status == status)
    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)
    q = q.order_by(TicketPurchase.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page)
    result = await db.execute(q)
    rows = result.all()
    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "ticket_purchases": [
            {
                "id": r.TicketPurchase.id,
                "reference": r.TicketPurchase.reference,
                "event_title": r.event_title,
                "buyer_name": r.TicketPurchase.buyer_name,
                "buyer_email": r.TicketPurchase.buyer_email,
                "quantity": r.TicketPurchase.quantity,
                "amount": r.TicketPurchase.amount,
                "platform_fee": r.TicketPurchase.platform_fee or 0,
                "status": r.TicketPurchase.status,
                "created_at": str(r.TicketPurchase.created_at),
            }
            for r in rows
        ],
    }

@router.get("/delivery/clients")
async def admin_delivery_clients(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """List all organizers who have sent invites, with aggregate delivery stats."""
    base = (
        select(
            Event.organizer_id,
            User.full_name,
            User.email,
            func.count(func.distinct(InviteBatch.event_id)).label("total_events"),
            func.count(InviteMessage.id).label("total_messages"),
            func.sum(case((InviteMessage.status == "delivered", 1), else_=0)).label("delivered"),
            func.sum(case((InviteMessage.status == "failed", 1), else_=0)).label("failed"),
            func.sum(case((InviteMessage.status == "queued", 1), else_=0)).label("queued"),
            func.sum(case((InviteMessage.status == "sending", 1), else_=0)).label("sending"),
        )
        .join(Event, InviteBatch.event_id == Event.id)
        .join(User, Event.organizer_id == User.id)
        .join(InviteMessage, InviteMessage.batch_id == InviteBatch.id)
        .group_by(Event.organizer_id, User.full_name, User.email)
    )
    if search:
        base = base.where(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
    total_q = select(func.count()).select_from(base.subquery())
    total = await db.scalar(total_q) or 0
    q = base.order_by(User.full_name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "clients": [
            {
                "organizer_id": r.organizer_id,
                "full_name": r.full_name,
                "email": r.email,
                "total_events": r.total_events or 0,
                "total_messages": r.total_messages or 0,
                "delivered": r.delivered or 0,
                "failed": r.failed or 0,
                "queued": r.queued or 0,
                "sending": r.sending or 0,
            }
            for r in rows
        ],
    }


@router.get("/delivery/clients/{organizer_id}")
async def admin_delivery_client_detail(
    organizer_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed delivery breakdown for a specific organizer, grouped by event."""
    org = await db.get(User, organizer_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organizer not found")
    events_q = (
        select(
            InviteBatch.event_id,
            Event.title,
            func.count(func.distinct(InviteMessage.guest_id)).label("total_guests"),
            func.sum(case((InviteMessage.status == "delivered", 1), else_=0)).label("delivered"),
            func.sum(case((InviteMessage.status == "failed", 1), else_=0)).label("failed"),
            func.sum(case((InviteMessage.status == "queued", 1), else_=0)).label("queued"),
            func.sum(case((InviteMessage.status == "sending", 1), else_=0)).label("sending"),
        )
        .join(Event, InviteBatch.event_id == Event.id)
        .join(InviteMessage, InviteMessage.batch_id == InviteBatch.id)
        .where(Event.organizer_id == organizer_id)
        .group_by(InviteBatch.event_id, Event.title)
        .order_by(Event.title)
    )
    result = await db.execute(events_q)
    events = result.all()
    return {
        "organizer": {
            "id": org.id,
            "full_name": org.full_name,
            "email": org.email,
        },
        "events": [
            {
                "event_id": r.event_id,
                "title": r.title,
                "total_guests": r.total_guests or 0,
                "delivered": r.delivered or 0,
                "failed": r.failed or 0,
                "queued": r.queued or 0,
                "sending": r.sending or 0,
            }
            for r in events
        ],
    }


@router.get("/delivery/events/{event_id}/guests")
async def admin_delivery_event_guests(
    event_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None),
    channel: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """List all guests with their delivery status for a specific event."""
    event = await db.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    base = (
        select(
            InviteMessage.id,
            InviteMessage.status,
            InviteMessage.channel,
            InviteMessage.error,
            InviteMessage.sent_at,
            InviteMessage.delivered_at,
            InviteMessage.created_at,
            Guest.id.label("guest_id"),
            Guest.name,
            Guest.email,
            Guest.phone,
            InviteBatch.id.label("batch_id"),
        )
        .join(InviteBatch, InviteMessage.batch_id == InviteBatch.id)
        .join(Guest, InviteMessage.guest_id == Guest.id)
        .where(InviteBatch.event_id == event_id)
    )
    if status:
        base = base.where(InviteMessage.status == status)
    if channel:
        base = base.where(InviteMessage.channel == channel)
    if search:
        base = base.where(
            Guest.name.ilike(f"%{search}%") | Guest.email.ilike(f"%{search}%")
        )
    total_q = select(func.count()).select_from(base.subquery())
    total = await db.scalar(total_q) or 0
    q = base.order_by(InviteMessage.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(q)
    rows = result.all()

    # Count status totals for this event
    status_counts_q = (
        select(
            InviteMessage.status,
            func.count(InviteMessage.id),
        )
        .join(InviteBatch, InviteMessage.batch_id == InviteBatch.id)
        .where(InviteBatch.event_id == event_id)
        .group_by(InviteMessage.status)
    )
    status_counts_result = await db.execute(status_counts_q)
    status_counts = dict(status_counts_result.all())

    return {
        "event": {
            "id": event.id,
            "title": event.title,
            "organizer_id": event.organizer_id,
        },
        "status_counts": {
            "delivered": status_counts.get("delivered", 0) or 0,
            "failed": status_counts.get("failed", 0) or 0,
            "queued": status_counts.get("queued", 0) or 0,
            "sending": status_counts.get("sending", 0) or 0,
            "total": total,
        },
        "total": total,
        "page": page,
        "per_page": per_page,
        "guests": [
            {
                "message_id": r.id,
                "guest_id": r.guest_id,
                "name": r.name,
                "email": r.email,
                "phone": r.phone,
                "channel": r.channel,
                "status": r.status,
                "error": r.error,
                "sent_at": str(r.sent_at) if r.sent_at else None,
                "delivered_at": str(r.delivered_at) if r.delivered_at else None,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
    }


@router.get("/deliveries")
async def admin_deliveries(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    organizer_id: int | None = Query(None),
    event_id: int | None = Query(None),
    status: str | None = Query(None),
    channel: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """Get delivery tracking data for all invites with filtering and error details"""
    q = (
        select(
            InviteMessage.id,
            InviteMessage.status,
            InviteMessage.channel,
            InviteMessage.error,
            InviteMessage.sent_at,
            InviteMessage.delivered_at,
            InviteMessage.created_at,
            InviteBatch.event_id,
            Guest.email,
            Guest.phone,
            Guest.name,
            Event.title.label("event_title"),
            User.full_name.label("organizer_name"),
            User.email.label("organizer_email"),
        )
        .join(InviteBatch, InviteMessage.batch_id == InviteBatch.id)
        .join(Guest, InviteMessage.guest_id == Guest.id)
        .join(Event, InviteBatch.event_id == Event.id)
        .join(User, Event.organizer_id == User.id)
    )

    if organizer_id:
        q = q.where(Event.organizer_id == organizer_id)
    if event_id:
        q = q.where(InviteBatch.event_id == event_id)
    if status:
        q = q.where(InviteMessage.status == status)
    if channel:
        q = q.where(InviteMessage.channel == channel)
    if search:
        q = q.where(
            (Guest.email.ilike(f"%{search}%"))
            | (Guest.name.ilike(f"%{search}%"))
            | (Event.title.ilike(f"%{search}%"))
            | (User.full_name.ilike(f"%{search}%"))
        )

    total_q = select(func.count()).select_from(q.subquery())
    total = await db.scalar(total_q)

    q = q.order_by(InviteMessage.created_at.desc()).offset(
        (page - 1) * per_page
    ).limit(per_page)

    result = await db.execute(q)
    rows = result.all()

    return {
        "total": total or 0,
        "page": page,
        "per_page": per_page,
        "deliveries": [
            {
                "id": r.id,
                "organizer_name": r.organizer_name,
                "organizer_email": r.organizer_email,
                "event_title": r.event_title,
                "event_id": r.event_id,
                "guest_name": r.name,
                "guest_email": r.email,
                "guest_phone": r.phone,
                "channel": r.channel,
                "status": r.status,
                "error": r.error,
                "sent_at": str(r.sent_at) if r.sent_at else None,
                "delivered_at": str(r.delivered_at) if r.delivered_at else None,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
    }
