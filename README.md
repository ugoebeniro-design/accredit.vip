# Accredit.vip

Premium event infrastructure platform for invitation distribution, guest management, QR accreditation, public event discovery, ticketing, and event operations.

**Live:** [https://accredit.vip](https://accredit.vip)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS v4, ShadCN UI |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Pydantic |
| Database | Supabase PostgreSQL (prod), SQLite (dev) |
| Queue | Redis + Celery |
| Storage | DigitalOcean Spaces |
| Payments | Paystack, Flutterwave |
| Email | SMTP, Resend, SendGrid |
| SMS | Termii, Africa's Talking, Twilio |
| WhatsApp | Twilio, WhatsApp Cloud API |
| AI | OpenAI (GPT-4, DALL-E) |
| Server | Nginx → Uvicorn (API) + Next.js (web) on Ubuntu |

---

## Directory Structure

```
backend/                  # FastAPI backend
├── app/
│   ├── api/              # Route handlers (auth, events, guests, messaging, payments, etc.)
│   ├── core/             # Config, database, security, rate limiting
│   ├── models/           # SQLAlchemy ORM models
│   ├── services/         # Email, SMS, WhatsApp, QR, AI services
│   └── main.py           # FastAPI app entry point
├── alembic/              # Database migrations
├── uploads/              # Uploaded files (QRs, fliers, images)
├── requirements.txt
└── .env.example

frontend/                 # Next.js frontend
├── src/
│   ├── app/              # App Router pages
│   │   ├── attend/       # Event discovery
│   │   ├── dashboard/    # Organizer dashboard
│   │   ├── events/       # Event detail pages
│   │   ├── e/            # Slug-based event pages
│   │   └── features/     # Marketing pages
│   ├── components/
│   │   ├── shared/       # Navbar, footer, venue-input, phone-input, etc.
│   │   └── ui/           # Primitive UI (shadcn)
│   ├── contexts/         # Auth context
│   └── lib/api/          # API client modules
├── .env.local
├── .env.production
├── next.config.ts
└── package.json
```

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env       # edit with your settings
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # runs on :3000
```

---

## Environment Variables

See `backend/.env.example` for all backend vars. Key ones:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL or SQLite connection string |
| `SECRET_KEY` | JWT signing secret |
| `PAYSTACK_SECRET_KEY` | Paystack API secret |
| `OPENAI_API_KEY` | OpenAI key (chat + image generation) |
| `SMTP_HOST/PORT/USERNAME/PASSWORD` | Email delivery |
| `WHATSAPP_CLOUD_TOKEN/PHONE_ID` | WhatsApp Cloud API |
| `FRONTEND_URL` | CORS origin (default `http://localhost:3000`) |

Frontend: `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

---

## Features

- **Event Management** — Create private or public events with flier upload, ticket tiers, lineup, after-party
- **AI Flier Parsing** — Upload a flyer image, AI extracts title, date, venue, lineup, tickets
- **AI Flyer Generation** — Generate event flyers from a text description
- **AI Support Chatbot** — Draggable AI assistant on the dashboard
- **Guest Management** — CSV import, search, batch operations
- **Invitation Delivery** — Email (SMTP/Resend), WhatsApp (Cloud API/Twilio), SMS (Termii)
- **Email Design** — Premium HTML invites with MIME-embedded flyer and animated QR GIF
- **QR Accreditation** — Per-guest animated QR GIFs, 30-day expiry, single-use validation
- **RSVP** — Token-based RSVP with accept/decline/maybe + stats
- **Public Event Discovery** — Browse by location, category, date, price; **Near Me** geolocation with proximity sorting (Haversine)
- **Ticket Sales** — Paystack checkout, PDF tickets, QR verification at entry
- **Event Detail Page** — Full event details + **Get Directions** button (Google Maps from user location)
- **Check-in** — Staff QR scanning with duplicate detection
- **Admin Dashboard** — Revenue analytics, event monitoring, fraud detection, delivery logs
- **Audit Logging** — All user actions logged for security

---

## Deployment

The app runs on a Namecheap VPS (Ubuntu 24.04) behind Nginx:

- **API:** `systemctl start accredit-api` (uvicorn on port 8001)
- **Web:** `systemctl start accredit-web` (Next.js on port 3000)
- **Nginx:** reverse proxies `/api/` → 8001, `/uploads/` → static, `/` → 3000
- **SSL:** Let's Encrypt auto-renewal

Deploy: rebuild on VPS, then restart the services.

---

## Project Status

Live and actively developed. See `README_AccreditVIP.md` for the full product specification.
