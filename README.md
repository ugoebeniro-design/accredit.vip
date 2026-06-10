# Accredit.vip

Premium event infrastructure platform — invitation distribution, guest management, QR accreditation, ticketing, event discovery, and event operations.

**Live:** [https://accredit.vip](https://accredit.vip)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS v4, ShadCN UI |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic v2 |
| Database | Supabase PostgreSQL (production), SQLite (development) |
| Payments | Paystack (primary), Flutterwave (fallback) |
| Email | SMTP (primary), SendGrid, Resend |
| SMS/WhatsApp | Twilio, WhatsApp Cloud API, Termii, Africa's Talking |
| AI | OpenAI (GPT-4o, DALL-E 3) |
| Auth | Supabase Auth, Google OAuth, bcrypt |
| Server | nginx → uvicorn (API) + Next.js standalone (web) on Ubuntu 24.04 |

---

## Directory Structure

```
backend/                          # FastAPI backend (port 8000)
├── app/
│   ├── api/                      # Route handlers
│   │   ├── auth.py               # Login, register, OAuth, password management
│   │   ├── events.py             # Event CRUD, submit-approval, public listing
│   │   ├── admin.py              # Admin CRUD, event list, role management
│   │   ├── admin_events.py       # Approve/reject events, pending/flagged lists
│   │   ├── admin_audience.py     # Audience data marketplace (super_admin only)
│   │   ├── admin_dashboard.py    # Admin analytics dashboard
│   │   ├── guests.py             # Guest CRUD, CSV import
│   │   ├── invite_sending.py     # Invitation delivery (email/WhatsApp/SMS)
│   │   ├── guest_management.py   # Guest batch operations
│   │   ├── qr_codes.py           # QR generation
│   │   ├── rsvp.py               # RSVP handling
│   │   ├── messaging.py          # Twilio/WhatsApp messaging
│   │   ├── payments.py           # Paystack checkout, verification
│   │   ├── tickets.py            # PDF ticket generation
│   │   ├── checkin_scanner.py    # QR scan & validate at entry
│   │   ├── trials.py             # Trial enforcement
│   │   ├── webhooks.py           # Paystack/Supabase webhook handlers
│   │   ├── reviews.py            # Event review module
│   │   ├── ai.py                 # AI flier parsing & generation
│   │   ├── notifications.py      # In-app notification endpoints
│   │   ├── uploads.py            # File upload
│   │   ├── tracking.py           # Event tracking
│   │   ├── watchlist.py          # API for waitlist
│   │   ├── wallet_api.py         # Wallet operations
│   │   ├── withdrawals.py        # Withdrawal management
│   │   └── ...                   # Coupons, event templates, posts, etc.
│   ├── core/                     # Config, DB, security, rate limiting
│   ├── models/                   # SQLAlchemy ORM models
│   ├── services/                 # Business logic (email, QR, AI, audience sync)
│   └── main.py                   # FastAPI app entry point
├── alembic/                      # Database migrations
├── uploads/                      # QRs, fliers, event images
├── requirements.txt
└── .env.example

frontend/                         # Next.js frontend (port 3000)
├── src/
│   ├── app/
│   │   ├── admin/                # Admin panel (super_admin + admin)
│   │   │   ├── page.tsx          # Admin dashboard
│   │   │   ├── audience/         # Audience data marketplace (super_admin only)
│   │   │   ├── events/           # Event moderation (approve/reject)
│   │   │   ├── users/            # User management
│   │   │   ├── sessions/         # Active sessions
│   │   │   ├── payments/         # Payment transactions
│   │   │   ├── withdrawals/      # Withdrawal management
│   │   │   ├── fraud/            # Fraud detection
│   │   │   └── settings/         # Admin profile + admin management
│   │   ├── dashboard/            # Organizer dashboard
│   │   ├── attend/               # Event discovery
│   │   ├── events/[id]/          # Event detail
│   │   ├── e/[slug]/             # Slug-based event pages
│   │   ├── login/                # User login
│   │   ├── register/             # User registration
│   │   └── auth/google/          # Google OAuth callback
│   ├── components/
│   │   ├── shared/               # Navbar, footer, carousel, venue-input, etc.
│   │   ├── ui/                   # ShadCN primitives (button, card, dialog, etc.)
│   │   └── wallet/               # Wallet components
│   ├── contexts/                 # Auth context
│   └── lib/api/                  # API client modules
├── .env.local
├── next.config.ts
└── package.json
```

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Linux/macOS
# venv\Scripts\activate           # Windows
pip install -r requirements.txt
cp .env.example .env              # edit with your settings
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                       # runs on :3000
```

---

## Features

### Event Management
- **Create Event** — public or private; flier upload, ticket tiers, lineup, after-party toggle
- **Post Event** — one-click "Post Event" from dashboard; triggers admin review workflow
- **AI Flier Parsing** — upload a flier image, AI extracts title, date, venue, lineup, ticket info
- **AI Flyer Generation** — generate event fliers from a text description (DALL-E 3)
- **AI Chatbot** — draggable AI assistant on the organizer dashboard

### Guest & Invitation Management
- **Guest Import** — CSV upload with column mapping
- **Invitation Delivery** — email (SMTP/SendGrid/Resend), WhatsApp (Cloud API/Twilio), SMS (Termii)
- **Premium Email Design** — MIME-embedded flier and animated QR GIF
- **QR Accreditation** — per-guest animated QR GIFs, 30-day expiry, single-use validation
- **RSVP** — token-based accept/decline/maybe with live stats
- **Reminders** — automated reminder scheduling before event date

### Ticketing & Check-in
- **Ticket Sales** — Paystack checkout with PDF ticket generation
- **QR Check-in** — staff scanning with duplicate detection
- **Event Detail Page** — full event info + **Get Directions** (Google Maps)

### Public Discovery
- **Landing Page Carousel** — auto-displays 10 most recent approved public events
- **Discover Events** (`/attend`) — browse by location, category, date, price
- **Near Me** — geolocation-based proximity sorting (Haversine)

### Admin Panel
- **Two Roles:** `admin` (general) and `super_admin` (full access)
- **Dashboard** — revenue analytics, user growth, event stats
- **Event Moderation** — approve/reject pending and flagged events
- **User Management** — view/manage users
- **Payment Management** — transaction history
- **Withdrawal Management** — process organizer withdrawals
- **Fraud Detection** — suspicious activity monitoring
- **Audience Data Marketplace** (`super_admin` only) — synced audience profiles with filters, demographic breakdowns, watermarked CSV/JSON export, export audit trail
- **Admin Management** (`super_admin` only) — create/update/delete admin accounts; control admin credentials
- **Login Banner** — styled "Secure Access" on admin login page

### Security & Compliance
- **Audit Logging** — all admin actions logged
- **Audience Export Watermarking** — every export row tagged with exporter identity + timestamp
- **Rate Limiting** — per-endpoint request throttling
- **Trial Abuse Prevention** — device fingerprint + email dedup + rate limits

---

## Environment Variables

See `backend/.env.example` for all variables. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Async PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `SECRET_KEY` | JWT signing secret (32+ bytes, URL-safe) |
| `ENCRYPTION_KEY` | Fernet key for symmetric encryption |
| `PAYSTACK_SECRET_KEY` | Paystack live secret |
| `PAYSTACK_PUBLIC_KEY` | Paystack live public key |
| `OPENAI_API_KEY` | OpenAI key (GPT-4o, DALL-E 3) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Email delivery |
| `SENDGRID_API_KEY` | SendGrid API key (email fallback) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio for WhatsApp/SMS |
| `WHATSAPP_CLOUD_TOKEN` / `WHATSAPP_CLOUD_PHONE_ID` | WhatsApp Cloud API |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FRONTEND_URL` | CORS origin (`https://accredit.vip` in production) |
| `BACKEND_URL` | Backend URL for callback URLs |
| `PLATFORM_FEE_PERCENT` | Platform commission (default: 5.0) |
| `VAT_PERCENT` | VAT rate (default: 2.5) |

Frontend: `NEXT_PUBLIC_API_URL=https://accredit.vip/api/v1`

---

## Deployment

The application runs on a Namecheap VPS (Ubuntu 24.04) behind nginx with Let's Encrypt SSL.

**Infrastructure:**

| Service | Port | Process |
|---------|------|---------|
| API | 8000 | `uvicorn app.main:app` (4 workers) via systemd |
| Web | 3000 | `node .next/standalone/server.js` via nohup |
| nginx | 443/80 | reverse proxies `/api/v1/` → 8000, `/uploads/` → files, `/` → 3000 |

**Start/stop services:**
```bash
systemctl start accredit-api      # FastAPI backend
systemctl stop accredit-api
nginx -s reload                   # after config changes
```

**Deploy updates:**
```bash
cd /home/deploy/accredit.vip
git pull origin main
cd frontend && npm run build
systemctl restart accredit-api
# restart frontend process
```

---

## Roles

| Role | Privileges |
|------|-----------|
| **User** | Create events, manage guests, send invites, sell tickets |
| **Admin** | Moderate events, view users/transactions/withdrawals, fraud monitoring |
| **Super Admin** | All admin privileges + audience data marketplace, admin account management, credential changes |

---

## Project Status

Live in production at [accredit.vip](https://accredit.vip). Actively maintained.

See `README_AccreditVIP.md` for the full product specification.
