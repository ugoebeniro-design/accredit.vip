import httpx, asyncio
from app.core.config import settings


async def send_whatsapp(to: str, message: str, media_url: str | None = None) -> tuple[bool, str | None]:
    """
    Send WhatsApp via Twilio.
    Returns (success, provider_message_id_or_error).
    On success, the second value is the Twilio SID.
    On failure, the second value is the error message.
    """
    if not settings.TWILIO_ACCOUNT_SID:
        print(f"[WhatsApp Mock] To: {to}, Message: {message[:50]}...")
        return True, None

    from_ = settings.TWILIO_WHATSAPP_FROM.removeprefix("whatsapp:")
    data: dict = {
        "From": f"whatsapp:{from_}",
        "To": f"whatsapp:{to}",
        "Body": message,
        "StatusCallback": f"{settings.FRONTEND_URL}/api/v1/webhooks/twilio/status",
    }
    if media_url:
        data["MediaUrl"] = media_url

    # Retry once on failure
    for attempt in range(2):
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                    data=data,
                )
                if res.is_success:
                    body = res.json()
                    sid = body.get("sid")
                    return True, sid
                error_detail = res.text[:200]
                print(f"[Twilio Error] attempt {attempt + 1}: {res.status_code} - {error_detail}")
                if attempt == 0:
                    await asyncio.sleep(2)
        except Exception as e:
            print(f"[Twilio Exception] attempt {attempt + 1}: {e}")
            if attempt == 0:
                await asyncio.sleep(2)

    return False, "Twilio send failed after retry"
