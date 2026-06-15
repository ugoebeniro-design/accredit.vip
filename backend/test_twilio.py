import asyncio, httpx
from app.core.config import settings

async def check():
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json?PageSize=5",
            auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
        )
        msgs = res.json().get("messages", [])
        for m in msgs:
            print(f'To: {m.get("to")}, Status: {m.get("status")}, Error: {m.get("error_code")}, ErrMsg: {m.get("error_message")}')

asyncio.run(check())
