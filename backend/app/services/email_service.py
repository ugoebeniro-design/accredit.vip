import smtplib, ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import httpx
from app.core.config import settings


async def send_email(to: str, subject: str, html: str, from_addr: str | None = None) -> bool:
    sender = from_addr or settings.EMAIL_FROM
    if settings.SMTP_HOST and settings.SMTP_USERNAME:
        return await _send_smtp(to, subject, html, sender)
    if settings.SENDGRID_API_KEY:
        return await _send_sendgrid(to, subject, html, sender)
    if settings.RESEND_API_KEY:
        return await _send_resend(to, subject, html, sender)
    print(f"[Email Mock] From: {sender} -> To: {to}, Subject: {subject}")
    return True


async def _send_smtp(to: str, subject: str, html: str, from_addr: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx) as server:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(from_addr, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"[SMTP Error] {e}")
        return False


async def _send_sendgrid(to: str, subject: str, html: str, from_addr: str) -> bool:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to}]}],
                "from": {"email": from_addr},
                "subject": subject,
                "content": [{"type": "text/html", "value": html}],
            },
        )
        return res.is_success


async def _send_resend(to: str, subject: str, html: str, from_addr: str) -> bool:
    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
            json={
                "from": from_addr,
                "to": [to],
                "subject": subject,
                "html": html,
            },
        )
        return res.is_success
