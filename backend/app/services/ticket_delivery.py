"""Ticket delivery service - generates QR codes and sends via email/WhatsApp"""

import asyncio
import qrcode
import io
import base64
from datetime import datetime
from app.core.config import settings


def generate_ticket_qr(
    ticket_reference: str,
    event_title: str,
    event_date: str,
) -> str:
    """Generate QR code for ticket and return as base64 image"""
    qr_data = f"TICKET|{ticket_reference}|{event_title}|{event_date}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    return img_base64


def format_ticket_email(
    buyer_name: str,
    event_title: str,
    event_date: str,
    event_time: str,
    venue: str,
    ticket_reference: str,
    ticket_count: int,
    amount_paid: float,
    qr_code_base64: str,
) -> tuple[str, str]:
    """Format ticket email content - returns (subject, html_content)"""

    subject = f"Your Ticket for {event_title} - {ticket_reference}"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #E91E8C, #C4166F); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .ticket {{ background: white; border: 1px solid #e8edf2; padding: 20px; }}
            .qr-section {{ text-align: center; margin: 20px 0; }}
            .qr-section img {{ max-width: 200px; }}
            .details {{ background: #f8f9fc; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e8edf2; }}
            .label {{ font-weight: bold; color: #64748b; }}
            .value {{ color: #0D1B2A; }}
            .footer {{ background: #f8f9fc; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px; }}
            .success-badge {{ display: inline-block; background: #dcfce7; color: #166534; padding: 10px 15px; border-radius: 5px; margin: 10px 0; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Ticket Confirmed</h1>
                <p>Your ticket has been issued successfully</p>
            </div>

            <div class="ticket">
                <div class="success-badge">✓ Payment Received</div>

                <h2 style="color: #E91E8C; margin-top: 20px;">{event_title}</h2>

                <div class="details">
                    <div class="detail-row">
                        <span class="label">Ticket Reference:</span>
                        <span class="value">{ticket_reference}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Attendee Name:</span>
                        <span class="value">{buyer_name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Number of Tickets:</span>
                        <span class="value">{ticket_count} ticket{'s' if ticket_count > 1 else ''}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date & Time:</span>
                        <span class="value">{event_date} at {event_time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Venue:</span>
                        <span class="value">{venue}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Amount Paid:</span>
                        <span class="value" style="color: #166534;">₦{amount_paid:,.0f}</span>
                    </div>
                </div>

                <div class="qr-section">
                    <p style="font-weight: bold; color: #0D1B2A;">Your Entry QR Code</p>
                    <img src="data:image/png;base64,{qr_code_base64}" alt="Ticket QR Code" />
                    <p style="font-size: 12px; color: #64748b;">Present this QR code at the gate for entry</p>
                </div>

                <div style="background: #fff1f8; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <p style="font-weight: bold; color: #E91E8C;">📱 Keep This Email Safe</p>
                    <p style="font-size: 14px; color: #0D1B2A;">You'll need to show this QR code to gain entry to the event. Save this email or take a screenshot.</p>
                </div>
            </div>

            <div class="footer">
                <p>Powered by accredit.vip</p>
                <p>If you have any questions, contact us at support@accredit.vip</p>
            </div>
        </div>
    </body>
    </html>
    """

    return subject, html_content


async def send_ticket_email(
    buyer_email: str,
    buyer_name: str,
    event_title: str,
    event_date: str,
    event_time: str,
    venue: str,
    ticket_reference: str,
    ticket_count: int,
    amount_paid: float,
    qr_code_base64: str,
):
    """Send ticket via email using Resend"""
    from app.services.email import send_email

    subject, html_content = format_ticket_email(
        buyer_name=buyer_name,
        event_title=event_title,
        event_date=str(event_date),
        event_time=str(event_time),
        venue=venue,
        ticket_reference=ticket_reference,
        ticket_count=ticket_count,
        amount_paid=amount_paid,
        qr_code_base64=qr_code_base64,
    )

    await asyncio.wait_for(
        send_email(to=buyer_email, subject=subject, html=html_content),
        timeout=15,
    )


async def send_ticket_whatsapp(
    buyer_phone: str,
    buyer_name: str,
    ticket_reference: str,
    event_title: str,
    event_date: str,
):
    """Send ticket via WhatsApp using Twilio"""
    import httpx

    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        return False

    message = f"""
🎉 *Ticket Confirmed!*

Hi {buyer_name},

Your ticket for *{event_title}* on {event_date} has been confirmed!

Reference: {ticket_reference}

Please check your email for the full ticket details and QR code.

See you at the event! 🎊
    """.strip()

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                data={
                    "From": settings.TWILIO_PHONE_NUMBER,
                    "To": buyer_phone,
                    "Body": message,
                },
            )
        return True
    except Exception as e:
        print(f"WhatsApp send failed: {e}")
        return False
