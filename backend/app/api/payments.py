import secrets, hmac, hashlib, json
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.event import Event
from app.models.guest import Guest
from app.models.payment import Payment
from app.models.wallet import Wallet, WalletTransaction, DEFAULT_BALANCES
from app.services.notify import notify_subscribers

RESEND_PRICE_PER_GUEST = 500  # NGN

router = APIRouter()


class InitiatePaymentRequest(BaseModel):
    event_id: int
    channel: str = "email"
    provider: str = "paystack"
    payment_method: str = "paystack"


class ResendPaymentRequest(BaseModel):
    event_id: int
    guest_id: int
    provider: str = "paystack"
    payment_method: str = "paystack"


@router.post("/initiate")
async def initiate_payment(
    req: InitiatePaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == req.event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    reference = f"ACC-{secrets.token_hex(8).upper()}"
    amount = calculate_price(event.guest_count_range, req.channel)

    # Wallet payment
    if req.payment_method == "wallet":
        wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
        wallet = wallet_result.scalar_one_or_none()
        if not wallet:
            raise HTTPException(status_code=400, detail="Wallet not found")
        balances = wallet.balances or dict(DEFAULT_BALANCES)
        if (balances.get("NGN", 0)) < amount:
            raise HTTPException(status_code=400, detail="Insufficient wallet balance")
        balances["NGN"] = balances.get("NGN", 0) - amount
        wallet.balances = balances
        tx = WalletTransaction(
            wallet_id=wallet.id,
            amount=-amount,
            currency="NGN",
            type="debit",
            reference=reference,
            description=f"Event publication: {event.title}",
            status="completed",
        )
        db.add(tx)

        payment = Payment(
            event_id=event.id,
            organizer_id=user.id,
            amount=amount,
            provider=req.provider,
            reference=reference,
            status="completed",
            paid_at=datetime.now(timezone.utc),
        )
        db.add(payment)
        event.status = "published"
        event.is_public = True
        await db.commit()
        await notify_subscribers(db, event.id)

        return {
            "payment_id": payment.id,
            "reference": reference,
            "amount": amount,
            "provider": req.provider,
            "authorization_url": None,
            "method": "wallet",
        }

    payment = Payment(
        event_id=event.id,
        organizer_id=user.id,
        amount=amount,
        provider=req.provider,
        reference=reference,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    paystack_url = None
    if req.provider == "paystack" and settings.PAYSTACK_SECRET_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    json={
                        "email": user.email,
                        "amount": int(amount * 100),
                        "reference": reference,
                        "callback_url": f"{settings.FRONTEND_URL}/dashboard/events/{event.id}",
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
        "payment_id": payment.id,
        "reference": reference,
        "amount": amount,
        "provider": req.provider,
        "authorization_url": paystack_url,
        "method": "paystack",
    }


@router.post("/resend")
async def initiate_resend_payment(
    req: ResendPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Event).where(Event.id == req.event_id, Event.organizer_id == user.id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guest_result = await db.execute(
        select(Guest).where(Guest.id == req.guest_id, Guest.event_id == req.event_id)
    )
    guest = guest_result.scalar_one_or_none()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    amount = RESEND_PRICE_PER_GUEST
    reference = f"REACC-{secrets.token_hex(8).upper()}"

    payment = Payment(
        event_id=event.id,
        organizer_id=user.id,
        amount=amount,
        provider=req.provider,
        reference=reference,
        payment_type="resend",
        guest_id=req.guest_id,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    paystack_url = None
    if req.provider == "paystack" and settings.PAYSTACK_SECRET_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    json={
                        "email": user.email,
                        "amount": int(amount * 100),
                        "reference": reference,
                        "callback_url": f"{settings.FRONTEND_URL}/dashboard/events/{event.id}",
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
        "payment_id": payment.id,
        "reference": reference,
        "amount": amount,
        "provider": req.provider,
        "authorization_url": paystack_url,
    }


@router.get("/check-resend")
async def check_resend_payment(
    event_id: int = Query(...),
    guest_id: int = Query(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(
            Payment.event_id == event_id,
            Payment.guest_id == guest_id,
            Payment.payment_type == "resend",
            Payment.status == "completed",
            Payment.organizer_id == user.id,
        )
    )
    existing = result.scalar_one_or_none()
    return {"has_valid_payment": existing is not None, "amount": RESEND_PRICE_PER_GUEST}


@router.post("/webhook/{provider}")
async def payment_webhook(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    payload = json.loads(body)

    if provider == "paystack":
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
        result = await db.execute(select(Payment).where(Payment.reference == reference))
        payment = result.scalar_one_or_none()
        if payment and payment.status == "pending":
            payment.status = "completed"
            payment.paid_at = datetime.now(timezone.utc)

            if payment.payment_type == "resend":
                # Resend payments don't publish the event
                pass
            else:
                event_result = await db.execute(select(Event).where(Event.id == payment.event_id))
                event = event_result.scalar_one_or_none()
                if event:
                    event.status = "published"
                    event.is_public = True
                    await notify_subscribers(db, event.id)

            await db.commit()

    elif provider == "flutterwave":
        secret_hash = settings.FLUTTERWAVE_SECRET_KEY
        if secret_hash:
            signature = request.headers.get("verif-hash", "")
            if signature != secret_hash:
                raise HTTPException(status_code=400, detail="Invalid signature")

        if payload.get("event") == "charge.completed" and payload.get("data", {}).get("status") == "successful":
            reference = payload["data"].get("tx_ref")
            result = await db.execute(select(Payment).where(Payment.reference == reference))
            payment = result.scalar_one_or_none()
            if payment and payment.status == "pending":
                payment.status = "completed"
                payment.paid_at = datetime.now(timezone.utc)

                if payment.payment_type == "resend":
                    pass
                else:
                    event_result = await db.execute(select(Event).where(Event.id == payment.event_id))
                    event = event_result.scalar_one_or_none()
                    if event:
                        event.status = "published"
                        event.is_public = True
                        await notify_subscribers(db, event.id)

                await db.commit()

    return {"status": "ok"}


@router.get("/history")
async def payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Payment).where(Payment.organizer_id == user.id)
    )
    return result.scalars().all()


def calculate_price(guest_range: str, channel: str) -> float:
    prices = {
        "1-100": {"email": 100000, "whatsapp": 200000, "sms": 300000},
        "101-200": {"email": 200000, "whatsapp": 350000, "sms": 500000},
        "201-400": {"email": 350000, "whatsapp": 500000, "sms": 750000},
        "400+": {"email": 500000, "whatsapp": 750000, "sms": 1000000},
    }
    channels = [c.strip() for c in channel.split(",") if c.strip()]
    guest_prices = prices.get(guest_range, prices["1-100"])
    total = sum(guest_prices.get(c, 100000) for c in channels)
    return total or 100000
