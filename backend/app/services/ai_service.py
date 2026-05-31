from openai import AsyncOpenAI
from app.core.config import settings

client = None


def get_client() -> AsyncOpenAI:
    global client
    if client is None and settings.OPENAI_API_KEY:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return client


SYSTEM_PROMPT = (
    "You are the Accredit.vip assistant. Accredit.vip is a premium event infrastructure platform. "
    "You help users with: creating events, managing guests, sending invites (Email/WhatsApp/SMS), "
    "RSVP management, QR code accreditation, ticketing via Paystack, community posts, "
    "and event discovery. Keep answers concise and practical."
)


async def chat(messages: list[dict]) -> str:
    c = get_client()
    if not c:
        return "AI is not configured. Ask the admin to set an OpenAI API key."

    system = [{"role": "system", "content": SYSTEM_PROMPT}]
    resp = await c.chat.completions.create(
        model="gpt-4o-mini",
        messages=system + messages[-10:],
        max_tokens=500,
    )
    return resp.choices[0].message.content


async def generate_flier_image(prompt: str) -> str | None:
    c = get_client()
    if not c:
        return None

    resp = await c.images.generate(
        model="dall-e-3",
        prompt=f"Professional event flier design: {prompt}. Clean layout, vibrant colors, modern typography.",
        size="1024x1024",
        quality="standard",
        n=1,
    )
    return resp.data[0].url
