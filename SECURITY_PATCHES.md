# Critical Security Patches - Ready to Deploy

## 1. PATCH: Fix Config & Environment Setup

**File: `backend/app/core/config.py`**

```python
import os
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    APP_NAME: str = "Accredit.vip API"
    
    # CRITICAL: Never enable DEBUG in production
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # CRITICAL: Generate a strong SECRET_KEY
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    # MUST be set via environment variable in production
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    
    # Validate SECRET_KEY
    def __init__(self, **data):
        super().__init__(**data)
        if not self.SECRET_KEY:
            if self.DEBUG:
                self.SECRET_KEY = "dev-key-change-in-production"
            else:
                raise ValueError(
                    "CRITICAL: SECRET_KEY must be set via environment variable. "
                    "Generate with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
                )
    
    ALGORITHM: str = "HS256"
    
    # CRITICAL: Reduce token expiration from 24 hours to 15 minutes
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Changed from 1440 (24h)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # ... rest of settings ...
    
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

settings = Settings()

# Warn if debug is enabled in production
if settings.DEBUG:
    import logging
    logging.warning("⚠️ DEBUG MODE IS ENABLED - DO NOT USE IN PRODUCTION")
```

**File: `backend/.env.example`**

```bash
# CRITICAL: Set these in production
DEBUG=false
SECRET_KEY=your-generated-secret-key-here

# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost/accredit

# Security
ALLOWED_HOSTS=accredit.vip,www.accredit.vip,api.accredit.vip
FRONTEND_URL=https://accredit.vip
BACKEND_URL=https://api.accredit.vip

# Encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=your-encryption-key-here

# Payment Processing
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx

# API Keys
OPENAI_API_KEY=sk-xxxxx
TWILIO_AUTH_TOKEN=xxxxx
SENDGRID_API_KEY=SG.xxxxx

# All other keys...
```

---

## 2. PATCH: Fix CORS Configuration

**File: `backend/app/main.py`**

```python
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZIPMiddleware

from app.core.config import settings
from app.core.database import init_db

# ... imports ...

app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

# CRITICAL: Add Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "accredit.vip",
        "www.accredit.vip",
        "api.accredit.vip",
        "app.accredit.vip",
        "localhost",
        "127.0.0.1",
    ] if not settings.DEBUG else ["*"]
)

# CRITICAL: Fix CORS - be specific about allowed origins
allowed_origins = [
    "https://accredit.vip",
    "https://www.accredit.vip",
    "https://app.accredit.vip",
]

if settings.DEBUG:
    allowed_origins.extend([
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Add GZIP compression
app.add_middleware(GZIPMiddleware, minimum_size=1000)

# CRITICAL: Add Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    
    # Prevent content type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Disable framing (prevent clickjacking)
    response.headers["X-Frame-Options"] = "DENY"
    
    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # HSTS - Force HTTPS for 1 year
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "img-src 'self' data: https:; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://api.accredit.vip; "
        "frame-ancestors 'none';"
    )
    
    # Disable MIME type sniffing
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"
    
    return response

# ... rest of app ...
```

---

## 3. PATCH: Add Rate Limiting to Auth Endpoints

**File: `backend/app/api/auth.py`** (add at top):

```python
from datetime import datetime, timedelta
import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import HTTPException

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)

# CRITICAL: Add to login/register endpoints
@router.post("/login", tags=["Auth"])
@limiter.limit("5/minute")  # Max 5 attempts per minute
async def login(
    request: Request,
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db),
):
    """Login endpoint with rate limiting"""
    try:
        # Check if account is locked
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if user:
            if user.locked_until and user.locked_until > datetime.utcnow():
                logger.warning(f"Login attempt on locked account: {email}")
                raise HTTPException(
                    status_code=429,
                    detail="Account locked due to too many failed attempts. Try again later."
                )
        
        # Existing login logic
        # ...
        
        # On success: reset failed attempts
        if user:
            user.failed_login_attempts = 0
            user.locked_until = None
            await db.commit()
            
    except Exception as e:
        # Log failed attempt and increment counter
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                logger.warning(f"Account locked after 5 failed attempts: {email}")
            await db.commit()
        raise

@router.post("/register", tags=["Auth"])
@limiter.limit("3/hour")  # Max 3 registrations per hour per IP
async def register(request: Request, ...):
    """Register endpoint with rate limiting"""
    # implementation
```

---

## 4. PATCH: Add Password Validation

**File: `backend/app/schemas/auth.py`** (create if not exists):

```python
import re
from pydantic import BaseModel, EmailStr, field_validator

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """CRITICAL: Enforce strong password policy"""
        # Minimum length
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        
        # Require uppercase
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        # Require lowercase
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        # Require number
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        
        # Require special character
        if not re.search(r'[!@#$%^&*()_\-+=\[\]{};:\'",.<>?/\\|`~]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    class Config:
        extra = "forbid"  # Reject unknown fields
```

---

## 5. PATCH: Verify Webhook Signatures

**File: `backend/app/api/webhooks.py`**:

```python
import hmac
import hashlib
from fastapi import HTTPException, Request, status
import logging

logger = logging.getLogger(__name__)

async def verify_paystack_signature(request: Request, body: bytes) -> dict:
    """CRITICAL: Verify Paystack webhook signature"""
    signature = request.headers.get("x-paystack-signature")
    
    if not signature:
        logger.warning("Webhook received without signature")
        raise HTTPException(status_code=401, detail="Missing signature")
    
    # Compute expected signature
    expected_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode(),
        body,
        hashlib.sha512
    ).hexdigest()
    
    # Use constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(signature, expected_signature):
        logger.warning(f"Invalid webhook signature: {signature[:10]}...")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return await request.json()

@router.post("/webhooks/paystack")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """CRITICAL: Webhook handler with signature verification"""
    body = await request.body()
    
    # Verify signature
    data = await verify_paystack_signature(request, body)
    
    # Process verified webhook...
    logger.info(f"Verified webhook received for reference: {data.get('reference')}")
```

---

## 6. PATCH: Input Validation Template

**File: `backend/app/schemas/events.py`**:

```python
from pydantic import BaseModel, constr, field_validator
from typing import Optional

class EventCreate(BaseModel):
    # CRITICAL: Add length constraints to prevent attacks
    title: constr(min_length=1, max_length=255)
    description: constr(max_length=5000)
    event_type: constr(max_length=50)
    host_name: constr(min_length=1, max_length=255)
    venue: constr(min_length=1, max_length=255)
    guest_count_range: constr(max_length=50)
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v):
        if v and len(v.strip()) < 10:
            raise ValueError('Description must be at least 10 characters')
        return v.strip()
    
    class Config:
        # CRITICAL: Reject unknown fields
        extra = "forbid"
```

---

## 7. PATCH: Secure Cookie Settings

**File: `backend/app/api/auth.py`**:

```python
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

@router.post("/login")
async def login(...):
    """Login with secure cookie settings"""
    
    # Generate token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Create response
    response = JSONResponse(
        content={
            "access_token": access_token,
            "token_type": "bearer",
            "user": user.dict()
        }
    )
    
    # CRITICAL: Set secure cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=15 * 60,  # 15 minutes
        expires=datetime.utcnow() + timedelta(minutes=15),
        path="/",
        domain="accredit.vip" if not settings.DEBUG else "localhost",
        secure=not settings.DEBUG,  # HTTPS only in production
        httponly=True,  # Prevent JavaScript access
        samesite="strict",  # CSRF protection
    )
    
    return response
```

---

## 8. PATCH: File Upload Security

**File: `backend/app/api/uploads.py`**:

```python
from fastapi import UploadFile, HTTPException
import mimetypes
import os

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'}
ALLOWED_MIMETYPES = {
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

async def validate_upload(file: UploadFile) -> None:
    """CRITICAL: Validate file uploads"""
    
    # Check file size
    if file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Check MIME type
    mime_type = mimetypes.guess_type(file.filename)[0]
    if mime_type not in ALLOWED_MIMETYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type"
        )
    
    # Check actual file content (magic bytes)
    contents = await file.read()
    await file.seek(0)
    
    # Verify file signature
    if file_ext in ['.jpg', '.jpeg']:
        if not contents.startswith(b'\xff\xd8\xff'):
            raise HTTPException(status_code=400, detail="Invalid image file")
    elif file_ext == '.png':
        if not contents.startswith(b'\x89PNG'):
            raise HTTPException(status_code=400, detail="Invalid PNG file")
```

---

## 🚀 Deployment Checklist

Before deploying to production:

```bash
# 1. Generate strong secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 2. Generate encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 3. Set environment variables
export DEBUG=false
export SECRET_KEY=<generated-key>
export ENCRYPTION_KEY=<generated-key>
export DATABASE_URL=<production-db-url>
export PAYSTACK_SECRET_KEY=<your-live-key>
# ... set all required keys ...

# 4. Run security checks
pip install bandit safety
bandit -r backend/
safety check

# 5. Test locally with DEBUG=false
python -m uvicorn app.main:app --reload

# 6. Run migrations
alembic upgrade head

# 7. Deploy to production
# Use environment variables, not .env files
```

---

## ⚠️ CRITICAL REMINDERS

1. **NEVER commit `.env` files to git**
2. **NEVER use default keys in production**
3. **ALWAYS use HTTPS in production**
4. **ALWAYS validate user input**
5. **ALWAYS verify webhook signatures**
6. **ALWAYS use parameterized queries**
7. **ALWAYS encrypt sensitive data**
8. **ALWAYS log security events**
9. **ALWAYS update dependencies**
10. **ALWAYS review security changes with team**

