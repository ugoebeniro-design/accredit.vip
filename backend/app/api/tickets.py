import secrets, hmac, hashlib, json, io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import httpx
import qrcode

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, extract_token
from app.models.user import User
from app.models.event import Event
from app.models.ticket_purchase import TicketPurchase
from app.models.wallet import Wallet, WalletTransaction, DEFAULT_BALANCES

router = APIRouter()


class PurchaseRequest(BaseModel):
    event_id: int
    buyer_name: str
    buyer_email: str
    buyer_phone: str | None = None
    quantity: int = 1
    payment_method: str = "paystack"


async def get_optional_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    try:
        token = extract_token(request)
        if not token:
            return None
        from jose import jwt, JWTError
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        result = await db.execute(select(User).where(User.id == int(user_id)))
        return result.scalar_one_or_none()
    except Exception:
        return None


@router.post("/purchase")
async def purchase_ticket(
    req: PurchaseRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == req.event_id, Event.is_public == True)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    is_free = not event.ticket_price or event.ticket_price == 0
    if not is_free and event.tickets_available is not None and event.tickets_available < req.quantity:
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    base_amount = (event.ticket_price or 0) * req.quantity
    platform_fee = round(base_amount * settings.PLATFORM_FEE_PERCENT / 100) if not is_free else 0
    vat = round(base_amount * settings.VAT_PERCENT / 100) if not is_free else 0
    total = base_amount + vat

    reference = f"TKT-{secrets.token_hex(8).upper()}"

    # Wallet payment for logged-in users
    if req.payment_method == "wallet":
        user = await get_optional_user(request, db)
        if not user:
            raise HTTPException(status_code=401, detail="Login required to pay with wallet")
        wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=400, detail="Wallet not found")
        balances = wallet.balances or dict(DEFAULT_BALANCES)
        if (balances.get("NGN", 0)) < total:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        balances["NGN"] = balances.get("NGN", 0) - total
        wallet.balances = balances
        tx = WalletTransaction(
            wallet_id=wallet.id,
            amount=-total,
            currency="NGN",
            type="debit",
            reference=reference,
            description=f"Ticket purchase: {event.title} x{req.quantity}",
            status="completed",
        )
        db.add(tx)

        purchase = TicketPurchase(
            event_id=event.id,
            buyer_name=req.buyer_name,
            buyer_email=req.buyer_email,
            buyer_phone=req.buyer_phone,
            quantity=req.quantity,
            amount=total,
            platform_fee=platform_fee,
            vat=vat,
            reference=reference,
            status="completed",
            paid_at=datetime.now(timezone.utc),
        )
        db.add(purchase)
        await db.commit()
        await db.refresh(purchase)

        if event.tickets_available is not None:
            event.tickets_available -= req.quantity
            await db.commit()

        return {
            "purchase_id": purchase.id,
            "reference": reference,
            "amount": total,
            "base_amount": base_amount,
            "platform_fee": platform_fee,
            "vat": vat,
            "quantity": req.quantity,
            "authorization_url": None,
            "method": "wallet",
        }

    purchase = TicketPurchase(
        event_id=event.id,
        buyer_name=req.buyer_name,
        buyer_email=req.buyer_email,
        buyer_phone=req.buyer_phone,
        quantity=req.quantity,
        amount=total,
        platform_fee=platform_fee,
        vat=vat,
        reference=reference,
        status="completed" if is_free else "pending",
        paid_at=datetime.now(timezone.utc) if is_free else None,
    )
    db.add(purchase)
    await db.commit()
    await db.refresh(purchase)

    if is_free:
        return {
            "purchase_id": purchase.id,
            "reference": reference,
            "amount": 0,
            "base_amount": 0,
            "platform_fee": 0,
            "vat": 0,
            "quantity": req.quantity,
            "authorization_url": None,
        }

    paystack_url = None
    if settings.PAYSTACK_SECRET_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    json={
                        "email": req.buyer_email,
                        "amount": int(total * 100),
                        "reference": reference,
                        "callback_url": f"{settings.FRONTEND_URL}/events/{event.id}?purchase={reference}",
                    },
                    headers={
                        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                data = resp.json()
                if data.get("status"):
                    paystack_url = data["data"]["authorization_url"]
        except Exception:
            pass

    return {
        "purchase_id": purchase.id,
        "reference": reference,
        "amount": total,
        "base_amount": base_amount,
        "platform_fee": platform_fee,
        "vat": vat,
        "quantity": req.quantity,
        "authorization_url": paystack_url,
        "method": "paystack",
    }


@router.post("/purchase-webhook")
async def purchase_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    payload = json.loads(body)

    signature = request.headers.get("x-paystack-signature", "")
    expected = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        body,
        hashlib.sha512,
    ).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=400, detail="Invalid signature")

    if payload.get("event") != "charge.success":
        return {"status": "ignored"}

    data = payload.get("data", {})
    if data.get("status") != "success":
        return {"status": "ignored"}

    reference = data.get("reference")
    result = await db.execute(
        select(TicketPurchase).where(TicketPurchase.reference == reference)
    )
    purchase = result.scalar_one_or_none()
    if purchase and purchase.status == "pending":
        purchase.status = "completed"
        purchase.paid_at = datetime.now(timezone.utc)

        event_result = await db.execute(select(Event).where(Event.id == purchase.event_id))
        event = event_result.scalar_one_or_none()
        if event and event.tickets_available is not None:
            event.tickets_available -= purchase.quantity

        await db.commit()

    return {"status": "ok"}


@router.get("/purchases/{reference}")
async def get_purchase_status(
    reference: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TicketPurchase).where(TicketPurchase.reference == reference)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return purchase


@router.get("/purchases/{reference}/ticket")
async def get_ticket(
    reference: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TicketPurchase).where(TicketPurchase.reference == reference)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")

    event_result = await db.execute(select(Event).where(Event.id == purchase.event_id))
    event = event_result.scalar_one_or_none()

    return {
        "reference": purchase.reference,
        "status": purchase.status,
        "buyer_name": purchase.buyer_name,
        "buyer_email": purchase.buyer_email,
        "buyer_phone": purchase.buyer_phone,
        "quantity": purchase.quantity,
        "amount": purchase.amount,
        "paid_at": purchase.paid_at,
        "event": {
            "id": event.id,
            "title": event.title,
            "event_date": str(event.event_date),
            "event_time": str(event.event_time),
            "venue": event.venue,
            "host_name": event.host_name,
        },
    }


@router.post("/verify")
async def verify_ticket_qr(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.json()
    ref = body.get("reference")
    if not ref:
        raise HTTPException(status_code=400, detail="Missing reference")

    result = await db.execute(
        select(TicketPurchase).where(TicketPurchase.reference == ref)
    )
    purchase = result.scalar_one_or_none()
    if not purchase:
        raise HTTPException(status_code=404, detail="Invalid ticket")
    if purchase.status != "completed":
        raise HTTPException(status_code=400, detail="Ticket not paid")

    return {
        "valid": True,
        "buyer_name": purchase.buyer_name,
        "quantity": purchase.quantity,
        "event_id": purchase.event_id,
    }


@router.get("/purchases/{reference}/qr-image")
async def ticket_qr_image(
    reference: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TicketPurchase).where(TicketPurchase.reference == reference)
    )
    purchase = result.scalar_one_or_none()
    if not purchase or purchase.status != "completed":
        raise HTTPException(status_code=404, detail="Ticket not found or not paid")

    data = f"ACC:{purchase.event_id}:{purchase.reference}:{purchase.buyer_email}"
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/events/{event_id}/purchases")
async def list_event_purchases(
    event_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    event_result = await db.execute(
        select(Event).where(Event.id == event_id, Event.organizer_id == user.id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(TicketPurchase).where(
            TicketPurchase.event_id == event_id,
            TicketPurchase.status == "completed",
        ).order_by(TicketPurchase.created_at.desc())
    )
    return result.scalars().all()
