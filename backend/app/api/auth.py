import secrets, random
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.password_reset import PasswordResetToken
from app.services.email_service import send_email
from app.services.sms_service import send_sms
from app.services.whatsapp_service import send_whatsapp

VERIFICATION_EXPIRY_MINUTES = 20

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    verification_channel: str = "email"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class SocialLoginRequest(BaseModel):
    provider: str
    id_token: str
    email: str | None = None
    full_name: str | None = None


def generate_numeric_code(length: int = 6) -> str:
    return "".join(str(random.randint(0, 9)) for _ in range(length))


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    if req.phone:
        result = await db.execute(select(User).where(User.phone == req.phone))
        if result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Phone number already registered")

    channel = req.verification_channel or "email"
    is_numeric = channel in ("sms", "whatsapp")
    verification_token = generate_numeric_code() if is_numeric else secrets.token_urlsafe(32)

    user = User(
        email=req.email,
        full_name=f"{req.first_name} {req.last_name}",
        phone=req.phone,
        password_hash=hash_password(req.password),
        verification_token=verification_token,
        verification_token_expires_at=datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES),
        verification_channel=channel,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if channel == "whatsapp" and user.phone:
        msg = f"Your Accredit.vip verification code: {verification_token}. Expires in {VERIFICATION_EXPIRY_MINUTES} minutes."
        await send_whatsapp(user.phone, msg)
    elif channel == "sms" and user.phone:
        msg = f"Your Accredit.vip verification code: {verification_token}. Expires in {VERIFICATION_EXPIRY_MINUTES} minutes."
        await send_sms(user.phone, msg)
    else:
        verify_link = f"{settings.FRONTEND_URL}/verify?token={verification_token}"
        html = f"<p>Welcome to Accredit.vip!</p><p>Click <a href='{verify_link}'>here</a> to verify your account. This link expires in {VERIFICATION_EXPIRY_MINUTES} minutes.</p>"
        await send_email(user.email, f"Verify your Accredit.vip account (expires in {VERIFICATION_EXPIRY_MINUTES} min)", html)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "is_verified": user.is_verified, "verification_channel": user.verification_channel},
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "is_verified": user.is_verified, "verification_channel": user.verification_channel},
    )


@router.post("/social", response_model=TokenResponse)
async def social_login(req: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    if req.provider not in ("google", "facebook", "apple"):
        raise HTTPException(status_code=400, detail="Unsupported provider")

    # Find existing user by oauth link or email
    result = await db.execute(
        select(User).where(
            or_(
                User.oauth_provider == req.provider,
                User.email == req.email,
            )
        )
    )
    user = result.scalar_one_or_none()

    if user:
        if user.oauth_provider and user.oauth_provider != req.provider:
            raise HTTPException(status_code=409, detail=f"Account linked to {user.oauth_provider}")
        user.oauth_provider = req.provider
        user.oauth_id = req.id_token[:100]
        if req.full_name and not user.full_name:
            user.full_name = req.full_name
        if req.email and not user.email:
            user.email = req.email
        user.is_verified = True
    else:
        email = req.email or f"{req.provider}_{req.id_token[:16]}@social.accredit.vip"
        user = User(
            email=email,
            full_name=req.full_name or f"{req.provider.title()} User",
            password_hash=hash_password(secrets.token_urlsafe(16)),
            oauth_provider=req.provider,
            oauth_id=req.id_token[:100],
            is_verified=True,
        )
        db.add(user)

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role, "is_verified": user.is_verified, "verification_channel": user.verification_channel},
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "is_verified": user.is_verified,
        "verification_channel": user.verification_channel,
    }


class VerifyRequest(BaseModel):
    token: str


@router.post("/verify")
async def verify_account(req: VerifyRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(
            User.verification_token == req.token,
            User.is_verified == False,
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or already verified token")
    if user.verification_token_expires_at and user.verification_token_expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification token has expired. Request a new one.")

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires_at = None
    await db.commit()
    return {"message": "Account verified successfully"}


@router.post("/resend-verification")
async def resend_verification(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.is_verified:
        raise HTTPException(status_code=400, detail="Account already verified")

    channel = user.verification_channel
    is_numeric = channel in ("sms", "whatsapp")
    verification_token = generate_numeric_code() if is_numeric else secrets.token_urlsafe(32)
    user.verification_token = verification_token
    user.verification_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_EXPIRY_MINUTES)
    await db.commit()

    if channel == "whatsapp" and user.phone:
        msg = f"Your Accredit.vip verification code: {verification_token}. Expires in {VERIFICATION_EXPIRY_MINUTES} minutes."
        await send_whatsapp(user.phone, msg)
    elif channel == "sms" and user.phone:
        msg = f"Your Accredit.vip verification code: {verification_token}. Expires in {VERIFICATION_EXPIRY_MINUTES} minutes."
        await send_sms(user.phone, msg)
    else:
        verify_link = f"{settings.FRONTEND_URL}/verify?token={verification_token}"
        html = f"<p>Click <a href='{verify_link}'>here</a> to verify your account. Expires in {VERIFICATION_EXPIRY_MINUTES} minutes.</p>"
        await send_email(user.email, f"Verify your Accredit.vip account (expires in {VERIFICATION_EXPIRY_MINUTES} min)", html)

    return {"message": f"Verification sent via {channel}", "is_numeric": is_numeric}


class ForgotPasswordRequest(BaseModel):
    email: str


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        return {"message": "If that email exists, a reset link has been sent"}

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(reset)
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"<p>Click <a href='{reset_link}'>here</a> to reset your password. This link expires in 1 hour.</p>"
    await send_email(user.email, "Reset your Accredit.vip password", html)

    return {"message": "If that email exists, a reset link has been sent"}


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == req.token,
            PasswordResetToken.used == 0,
        )
    )
    reset = result.scalar_one_or_none()
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if reset.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user_result = await db.execute(select(User).where(User.id == reset.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    reset.used = 1
    await db.commit()

    return {"message": "Password reset successful"}


class UpdateEmailRequest(BaseModel):
    new_email: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.put("/email")
async def update_email(
    req: UpdateEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password is incorrect")

    if req.new_email == user.email:
        raise HTTPException(status_code=400, detail="New email is the same as current email")

    result = await db.execute(select(User).where(User.email == req.new_email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    user.email = req.new_email
    user.is_verified = False
    await db.commit()
    await db.refresh(user)
    return {"message": "Email updated successfully", "email": user.email}
