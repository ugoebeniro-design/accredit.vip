import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.core.rate_limit import RateLimitMiddleware

logger = logging.getLogger(__name__)
from app.api import auth, events, guests, qr_codes, verification, payments, admin, rsvp, messaging, tickets, uploads, contact, trials, subscriptions, posts, ai, notifications, tracking, webhooks, guest_management, invite_sending, admin_dashboard, checkin_scanner, waitlist_api, coupons_api, rsvp_questions_api, event_templates_api, wallet_api, trial_migration, withdrawals, admin_events


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


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

# CRITICAL: Add GZIP compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add Rate Limiting Middleware
app.add_middleware(RateLimitMiddleware)

# CRITICAL: Restrict CORS to specific origins
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
        "http://127.0.0.1:3001",
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

# CRITICAL: Add Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"

    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # HSTS - Force HTTPS for 1 year (only in production)
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

    # Remove server header
    if "server" in response.headers:
        del response.headers["server"]

    return response

upload_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(events.router, prefix="/api/v1/events", tags=["Events"])
app.include_router(guests.router, prefix="/api/v1/events", tags=["Guests"])
app.include_router(qr_codes.router, prefix="/api/v1/events", tags=["QR Codes"])
app.include_router(verification.router, prefix="/api/v1/qr", tags=["Verification"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(rsvp.router, prefix="/api/v1", tags=["RSVP"])
app.include_router(messaging.router, prefix="/api/v1/events", tags=["Messaging"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["Tickets"])
app.include_router(uploads.router, prefix="/api/v1/events", tags=["Uploads"])
app.include_router(contact.router, prefix="/api/v1", tags=["Contact"])
app.include_router(trials.router, prefix="/api/v1/trials", tags=["Trials"])
app.include_router(subscriptions.router, prefix="/api/v1", tags=["Subscriptions"])
app.include_router(posts.router, prefix="/api/v1", tags=["Community Posts"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(notifications.router, prefix="/api/v1", tags=["Notifications"])
app.include_router(tracking.router, prefix="/api/v1", tags=["Tracking"])
app.include_router(webhooks.router, prefix="/api/v1", tags=["Webhooks"])
app.include_router(guest_management.router, prefix="/api/v1", tags=["Guest Management"])
app.include_router(invite_sending.router, prefix="/api/v1", tags=["Invite Sending"])
app.include_router(admin_dashboard.router, prefix="/api/v1/admin", tags=["Admin Dashboard"])
app.include_router(checkin_scanner.router, prefix="/api/v1", tags=["Scanner"])
app.include_router(waitlist_api.router, prefix="/api/v1", tags=["Waitlist"])
app.include_router(coupons_api.router, prefix="/api/v1", tags=["Coupons"])
app.include_router(rsvp_questions_api.router, prefix="/api/v1", tags=["RSVP Questions"])
app.include_router(event_templates_api.router, prefix="/api/v1", tags=["Event Templates"])
app.include_router(wallet_api.router, prefix="/api/v1", tags=["Wallet"])
app.include_router(withdrawals.router, prefix="/api/v1", tags=["Withdrawals"])
app.include_router(trial_migration.router, prefix="/api/v1", tags=["Trial Migration"])
app.include_router(admin_events.router, prefix="/api/v1", tags=["Admin Events"])


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
