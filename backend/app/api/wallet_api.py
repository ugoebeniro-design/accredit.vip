import secrets
import hmac
import hashlib
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import httpx

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.wallet import Wallet, WalletTransaction, SUPPORTED_CURRENCIES, DEFAULT_BALANCES

router = APIRouter()


class FundRequest(BaseModel):
    amount: float
    currency: str = "NGN"


class WalletPayRequest(BaseModel):
    amount: float
    currency: str = "NGN"
    description: str


async def get_or_create_wallet(user: User, db: AsyncSession) -> Wallet:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user.id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=user.id, balance=0.0, balances=dict(DEFAULT_BALANCES))
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)
    elif not wallet.balances or wallet.balances == {}:
        wallet.balances = dict(DEFAULT_BALANCES)
        await db.commit()
        await db.refresh(wallet)
    return wallet


@router.get("/wallet/currencies")
async def list_currencies():
    return SUPPORTED_CURRENCIES


@router.get("/wallet")
async def get_wallet(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wallet = await get_or_create_wallet(user, db)
    txns = await db.execute(
        select(WalletTransaction).where(
            WalletTransaction.wallet_id == wallet.id
        ).order_by(WalletTransaction.created_at.desc()).limit(50)
    )
    return {
        "id": wallet.id,
        "balance": wallet.balance,
        "currency": wallet.currency,
        "balances": wallet.balances or DEFAULT_BALANCES,
        "transactions": txns.scalars().all(),
    }


@router.post("/wallet/fund")
async def fund_wallet(
    req: FundRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    currency = req.currency.upper()
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {currency}")

    min_fund = SUPPORTED_CURRENCIES[currency]["min_fund"]
    if req.amount < min_fund:
        raise HTTPException(status_code=400, detail=f"Minimum funding amount for {currency} is {SUPPORTED_CURRENCIES[currency]['symbol']}{min_fund}")

    wallet = await get_or_create_wallet(user, db)
    reference = f"WAL-{secrets.token_hex(8).upper()}"

    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount=req.amount,
        currency=currency,
        type="credit",
        reference=reference,
        description=f"Wallet top-up ({currency})",
        status="pending",
    )
    db.add(tx)
    await db.commit()

    paystack_url = None
    flutterwave_url = None

    if currency == "NGN" and settings.PAYSTACK_SECRET_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.paystack.co/transaction/initialize",
                    json={
                        "email": user.email,
                        "amount": int(req.amount * 100),
                        "reference": reference,
                        "callback_url": f"{settings.FRONTEND_URL}/dashboard/wallet?reference={reference}",
                        "currency": currency,
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

    if settings.FLUTTERWAVE_SECRET_KEY:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.flutterwave.com/v3/payments",
                    json={
                        "tx_ref": reference,
                        "amount": req.amount,
                        "currency": currency,
                        "redirect_url": f"{settings.FRONTEND_URL}/dashboard/wallet?reference={reference}",
                        "customer": {
                            "email": user.email,
                            "name": user.full_name or user.email,
                        },
                        "customizations": {
                            "title": "Wallet Top-Up",
                            "description": f"Funding {currency} wallet",
                        },
                    },
                    headers={
                        "Authorization": f"Bearer {settings.FLUTTERWAVE_SECRET_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                data = resp.json()
                if data.get("status") == "success":
                    flutterwave_url = data["data"]["link"]
        except Exception:
            pass

    return {
        "reference": reference,
        "amount": req.amount,
        "currency": currency,
        "authorization_url": paystack_url or flutterwave_url,
    }


@router.post("/wallet/pay")
async def pay_with_wallet(
    req: WalletPayRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    currency = req.currency.upper()
    if currency not in SUPPORTED_CURRENCIES:
        raise HTTPException(status_code=400, detail=f"Unsupported currency: {currency}")

    wallet = await get_or_create_wallet(user, db)
    balances = wallet.balances or dict(DEFAULT_BALANCES)
    current_balance = balances.get(currency, 0.0)

    if current_balance < req.amount:
        raise HTTPException(status_code=400, detail=f"Insufficient {currency} balance")

    reference = f"WPD-{secrets.token_hex(8).upper()}"
    balances[currency] -= req.amount
    wallet.balances = balances

    tx = WalletTransaction(
        wallet_id=wallet.id,
        amount=-req.amount,
        currency=currency,
        type="debit",
        reference=reference,
        description=req.description,
        status="completed",
    )
    db.add(tx)
    await db.commit()

    return {
        "reference": reference,
        "amount": req.amount,
        "currency": currency,
        "balances": wallet.balances,
    }


@router.post("/wallet/webhook/{provider}")
async def wallet_webhook(
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
        if not reference or not reference.startswith("WAL-"):
            return {"status": "ignored"}

        result = await db.execute(
            select(WalletTransaction).where(WalletTransaction.reference == reference)
        )
        tx = result.scalar_one_or_none()
        if tx and tx.status == "pending":
            tx.status = "completed"

            wallet_result = await db.execute(
                select(Wallet).where(Wallet.id == tx.wallet_id)
            )
            wallet = wallet_result.scalar_one_or_none()
            if wallet:
                cur = tx.currency or "NGN"
                balances = wallet.balances or dict(DEFAULT_BALANCES)
                balances[cur] = balances.get(cur, 0.0) + tx.amount
                wallet.balances = balances

            await db.commit()

    elif provider == "flutterwave":
        secret_hash = settings.FLUTTERWAVE_SECRET_KEY
        if secret_hash:
            signature = request.headers.get("verif-hash", "")
            if not signature:
                raise HTTPException(status_code=400, detail="Missing signature")

        if payload.get("event") == "charge.completed" and payload.get("data", {}).get("status") == "successful":
            data = payload["data"]
            reference = data.get("tx_ref") or data.get("reference", "")
            if not reference.startswith("WAL-"):
                return {"status": "ignored"}

            result = await db.execute(
                select(WalletTransaction).where(WalletTransaction.reference == reference)
            )
            tx = result.scalar_one_or_none()
            if tx and tx.status == "pending":
                tx.status = "completed"

                wallet_result = await db.execute(
                    select(Wallet).where(Wallet.id == tx.wallet_id)
                )
                wallet = wallet_result.scalar_one_or_none()
                if wallet:
                    cur = tx.currency or "NGN"
                    balances = wallet.balances or dict(DEFAULT_BALANCES)
                    balances[cur] = balances.get(cur, 0.0) + tx.amount
                    wallet.balances = balances

                await db.commit()

    return {"status": "ok"}
