import httpx
from app.core.config import settings


async def send_email(to: str, subject: str, html: str) -> bool:
    if settings.SENDGRID_API_KEY:
        return await _send_sendgrid(to, subject, html)
    if settings.RESEND_API_KEY:
        return await _send_resend(to, subject, html)
    print(f"[Email Mock] To: {to}, Subject: {subject}")
    return True


async def _send_sendgrid(to: str, subject: str, html: str) -> bool:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": settings.SENDGRID_FROM_EMAIL},
                "subject": subject,
                "content": [{"type": "text/html", "value": html}],
            },
        )
        return res.is_success


async def _send_resend(to: str, subject: str, html: str) -> bool:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": "Accredit.vip <invites@accredit.vip>",
                "to": [to],
                "subject": subject,
                "html": html,
            },
        )
        return res.is_success
