import httpx
from app.core.config import settings


async def send_whatsapp(to: str, message: str, media_url: str | None = None) -> bool:
    if not settings.TWILIO_ACCOUNT_SID:
        print(f"[WhatsApp Mock] To: {to}, Message: {message[:50]}...")
        return True

    from_ = settings.TWILIO_WHATSAPP_FROM.removeprefix("whatsapp:")
    data: dict = {
        "From": f"whatsapp:{from_}",
        "To": f"whatsapp:{to}",
        "Body": message,
    }
    if media_url:
        data["MediaUrl"] = media_url

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            data=data,
        )
        return res.is_success
