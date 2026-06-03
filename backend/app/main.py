import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import init_db
from app.core.rate_limit import RateLimitMiddleware
from app.api import auth, events, guests, qr_codes, verification, payments, admin, rsvp, messaging, tickets, uploads, contact, trials, subscriptions, posts, ai, notifications, tracking, webhooks


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://accredit.vip",
        "http://accredit.vip",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
