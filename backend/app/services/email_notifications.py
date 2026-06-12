"""Email service for sending confirmation and notification emails."""

import asyncio
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.services.email_service import send_email

async def send_payment_confirmation(
    user_email: str,
    user_name: str,
    event_title: str,
    event_date: str,
    event_time: str,
    venue: str,
    amount: float,
    currency: str = "NGN",
    channels: list = None,
    guest_count: int = 0,
    event_id: int = 0,
):
    """Send payment confirmation email to user."""
    if channels is None:
        channels = []

    channel_list = ", ".join(c.title() for c in channels)

    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f8f9fc; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #E91E8C, #C4166F); color: white; padding: 30px; border-radius: 12px; text-align: center; }}
                .content {{ background: white; padding: 30px; margin-top: 20px; border-radius: 12px; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e8edf2; }}
                .detail-label {{ color: #64748b; }}
                .detail-value {{ font-weight: bold; color: #0D1B2A; }}
                .cta-button {{ display: inline-block; background: #E91E8C; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; }}
                .footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }}
                .success-badge {{ display: inline-block; background: #f0fdf4; color: #166534; padding: 8px 16px; border-radius: 6px; font-weight: bold; margin-bottom: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0;">✓ Payment Successful</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Your invitation delivery is ready</p>
                </div>

                <div class="content">
                    <p>Hello {user_name},</p>
                    <p>Thank you for your payment! Your invitation delivery payment has been confirmed.</p>

                    <div class="success-badge">PAYMENT CONFIRMED</div>

                    <div class="detail-row">
                        <span class="detail-label">Payment Amount:</span>
                        <span class="detail-value">{currency} {amount:,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Event:</span>
                        <span class="detail-value">{event_title}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Date & Time:</span>
                        <span class="detail-value">{event_date} at {event_time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Venue:</span>
                        <span class="detail-value">{venue}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Guest Quota:</span>
                        <span class="detail-value">{guest_count} guests</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Delivery Channels:</span>
                        <span class="detail-value">{channel_list}</span>
                    </div>

                    <p style="margin-top: 20px; color: #E91E8C; font-weight: bold;">
                        ℹ️ Only these channels will be available for sending invites.
                    </p>

                    <h3 style="color: #0D1B2A; margin-top: 25px;">Next Steps</h3>
                    <ol style="color: #64748b;">
                        <li>Go to your dashboard to manage your event</li>
                        <li>Add guests (manually or import via CSV)</li>
                        <li>Customize your invitation message</li>
                        <li>Send invitations to your guests (up to 3 times)</li>
                        <li>Track delivery and RSVP responses</li>
                    </ol>

                    <center>
                        <a href="{settings.FRONTEND_URL}/dashboard/invites/{event_id}/manage" class="cta-button">
                            Go to Event Management
                        </a>
                    </center>

                    <p style="margin-top: 30px; color: #64748b;">
                        Questions? Contact support@accredit.vip
                    </p>
                </div>

                <div class="footer">
                    <p>© 2024 AccreditVIP. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
    """

    # Email will be sent asynchronously - logic handled by backend
    return True


async def send_guest_invitation(
    guest_email: str,
    guest_name: str,
    event_title: str,
    event_date: str,
    event_time: str,
    venue: str,
    host_name: str,
    rsvp_link: str,
    custom_message: Optional[str] = None,
    dress_code: Optional[str] = None,
    male_dress_code: Optional[str] = None,
    female_dress_code: Optional[str] = None,
):
    """Send invitation email to guest with RSVP link."""
    from datetime import datetime as _dt
    # Format date nicely
    try:
        d = _dt.strptime(event_date.strip(), "%Y-%m-%d")
        event_date = d.strftime("%A %B %d, %Y")
    except (ValueError, TypeError, AttributeError):
        pass
    # Format time with timezone
    tz_str = ""
    for t in ["WAT", "UTC", "GMT", "EST", "PST"]:
        if t in event_time:
            tz_str = f" ({t})"
            event_time = event_time.replace(t, "").strip()
            break
    try:
        t = _dt.strptime(event_time.strip(), "%H:%M:%S")
        hour, minute = t.hour, t.minute
    except (ValueError, TypeError):
        try:
            t = _dt.strptime(event_time.strip(), "%H:%M")
            hour, minute = t.hour, t.minute
        except (ValueError, TypeError):
            hour, minute = 0, 0
    ampm = "AM" if hour < 12 else "PM"
    h12 = hour if 1 <= hour <= 12 else (hour - 12 if hour > 12 else 12)
    m_str = f":{minute:02d}" if minute else ""
    event_time = f"{h12}{m_str} {ampm}{tz_str}"

    dress_rows = ""
    if dress_code:
        dress_rows += f'<div class="detail-row"><span class="detail-label">👔 Dress Code:</span><span class="detail-value">{dress_code}</span></div>'
    if male_dress_code:
        dress_rows += f'<div class="detail-row"><span class="detail-label">👔 Men:</span><span class="detail-value">{male_dress_code}</span></div>'
    if female_dress_code:
        dress_rows += f'<div class="detail-row"><span class="detail-label">👗 Women:</span><span class="detail-value">{female_dress_code}</span></div>'

    html_content = f"""
    <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #f8f9fc; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #E91E8C, #C4166F); color: white; padding: 30px; border-radius: 12px; text-align: center; }}
                .content {{ background: white; padding: 30px; margin-top: 20px; border-radius: 12px; }}
                .event-details {{ background: #f8f9fc; padding: 20px; border-radius: 8px; margin: 20px 0; }}
                .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; }}
                .detail-label {{ color: #64748b; }}
                .detail-value {{ font-weight: bold; color: #0D1B2A; }}
                .cta-button {{ display: inline-block; background: #E91E8C; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; margin-top: 20px; font-weight: bold; font-size: 16px; }}
                .footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; }}
                .custom-message {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }}
                @keyframes accredit-text {{ 0%,10% {{ opacity:1; }} 20%,70% {{ opacity:1; }} 85%,100% {{ opacity:0; }} }}
                @keyframes accredit-btn {{ 0%,35% {{ opacity:1; }} 45%,70% {{ opacity:1; }} 85%,100% {{ opacity:0; }} }}
                @keyframes accredit-pulse {{ 0%,100% {{ box-shadow:0 0 0 0 rgba(233,30,140,0.3); }} 50% {{ box-shadow:0 0 0 12px rgba(233,30,140,0); }} }}
            </style>
        </head>
        <body>
            <div class="container">
                <div style="background: linear-gradient(135deg, #E91E8C 0%, #C4166F 50%, #E91E8C 100%); padding: 32px 24px; text-align: center; border-radius: 12px; margin-bottom: 20px;">
                    <div style="margin-bottom: 12px;">
                        <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 1px; font-family: Arial, sans-serif;">✓ accredit.vip</p>
                        <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 500;">Premium Event Infrastructure</p>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <p style="margin: 8px 0; color: rgba(255,255,255,0.9); font-size: 13px;">Ready to host your own event?</p>
                        <a href="{settings.FRONTEND_URL}/create-event" style="display: inline-block; background: #ffffff; color: #E91E8C; padding: 12px 32px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 14px; font-family: Arial, sans-serif; letter-spacing: 0.5px; margin-top: 8px;">Create Your Event</a>
                    </div>
                </div>

                <div class="header">
                    <h1 style="margin: 0;">You're Invited!</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Join us for {event_title}</p>
                </div>

                <div class="content">
                    <p>Hello {guest_name},</p>
                    <p>{host_name} invites you to:</p>

                    <div class="event-details">
                        <h2 style="margin-top: 0; color: #0D1B2A;">{event_title}</h2>
                        <div class="detail-row">
                            <span class="detail-label">📅 Date:</span>
                            <span class="detail-value">{event_date}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">⏰ Time:</span>
                            <span class="detail-value">{event_time}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📍 Venue:</span>
                            <span class="detail-value">{venue}</span>
                        </div>
                        {dress_rows}
                    </div>

                    {f'''<div class="custom-message">
                        <p style="margin: 0;"><strong>Note from host:</strong><br/>{custom_message}</p>
                    </div>''' if custom_message else ''}

                    <p style="color: #64748b; margin: 25px 0 10px 0; font-weight: bold;">
                        Will you be attending?
                    </p>

                    <center>
                        <a href="{rsvp_link}" class="cta-button">
                            RSVP Now
                        </a>
                    </center>

                    <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
                        Please RSVP by clicking the button above or visiting the link below:
                    </p>
                    <p style="color: #E91E8C; word-break: break-all; font-size: 12px;">
                        {rsvp_link}
                    </p>

                    <p style="margin-top: 30px; color: #64748b;">
                        We look forward to seeing you!
                    </p>
                </div>

                <div class="footer">
                    <p>© 2024 AccreditVIP. All rights reserved.</p>
                    <p>This is an automated invitation email.</p>
                </div>
            </div>
        </body>
    </html>
    """

    return await send_email(guest_email, f"You're Invited to {event_title}!", html_content)
