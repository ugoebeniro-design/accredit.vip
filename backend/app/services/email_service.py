import asyncio
import os
import smtplib
import ssl
from email.mime.image import MIMEImage
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


async def send_email_with_images(to: str, subject: str, html: str, images: list[tuple[str, str]], from_addr: str | None = None) -> bool:
    """Send HTML email with inline images embedded as MIME attachments (cid: references).
    images: list of (cid_name, filepath) tuples. HTML should reference them as <img src='cid:cid_name'>.
    """
    sender = from_addr or settings.EMAIL_FROM
    if settings.SMTP_HOST and settings.SMTP_USERNAME:
        return await _send_smtp_with_images(to, subject, html, images, sender)
    print(f"[Email Mock] From: {sender} -> To: {to}, Subject: {subject}")
    return True


def _build_multipart_with_images(html: str, images: list[tuple[str, str]]) -> str:
    msg = MIMEMultipart("related")
    msg.attach(MIMEText(html, "html"))
    for cid, filepath in images:
        try:
            with open(filepath, "rb") as f:
                img_data = f.read()
            img = MIMEImage(img_data)
            img.add_header("Content-ID", f"<{cid}>")
            img.add_header("Content-Disposition", "inline")
            msg.attach(img)
        except Exception as e:
            print(f"[Email] Failed to attach image {filepath}: {e}")
    return msg.as_string()


async def _send_smtp(to: str, subject: str, html: str, from_addr: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    def _sync_send():
        try:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=10) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to], msg.as_string())
            return True
        except Exception as e:
            print(f"[SMTP Error] {e}")
            return False

    try:
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _sync_send),
            timeout=15
        )
    except asyncio.TimeoutError:
        print("[SMTP Error] Timed out after 15s")
        return False


async def _send_smtp_with_images(to: str, subject: str, html: str, images: list[tuple[str, str]], from_addr: str) -> bool:
    def _sync_send():
        try:
            msg_str = _build_multipart_with_images(html, images)
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=10) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to], msg_str)
            return True
        except Exception as e:
            print(f"[SMTP Error] {e}")
            return False

    try:
        return await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _sync_send),
            timeout=15
        )
    except asyncio.TimeoutError:
        print("[SMTP Error] Timed out after 15s")
        return False


async def _send_sendgrid(to: str, subject: str, html: str, from_addr: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
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
    except Exception as e:
        print(f"[SendGrid Error] {e}")
        return False


async def _send_resend(to: str, subject: str, html: str, from_addr: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
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
    except Exception as e:
        print(f"[Resend Error] {e}")
        return False
