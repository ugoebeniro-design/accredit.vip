import qrcode
from io import BytesIO
import base64
from PIL import Image, ImageDraw
import io


def generate_qr_code(data: str, size: int = 200) -> Image.Image:
    """Generate a simple QR code image."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    return img.resize((size, size), Image.Resampling.LANCZOS)


def generate_animated_qr_gif(data: str, size: int = 200, frames: int = 6, style: str = "pulsing") -> bytes:
    """
    Generate an animated QR code GIF with different animation styles.
    Supports: pulsing, rotating, gradient, neon, bounce
    """
    frames_list = []
    qr_base = generate_qr_code(data, size)
    background_size = int(size * 1.3)

    for i in range(frames):
        frame = qr_base.copy()
        frame = frame.convert("RGBA")
        background = Image.new("RGBA", (background_size, background_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(background)

        progress = i / frames

        if style == "pulsing":
            # Pulsing glow effect
            alpha = int(100 * (0.5 + 0.5 * (1 - abs(progress * 2 - 1))))
            border_color = (233, 30, 140, alpha)
            border_width = 3

        elif style == "rotating":
            # Rotating effect (scale variation)
            scale = 1.0 + 0.1 * (1 - abs(progress * 2 - 1))
            new_size = int(size * scale)
            offset = (background_size - new_size) // 2
            frame = frame.resize((new_size, new_size), Image.Resampling.LANCZOS)
            background.paste(frame, (offset, offset), frame)
            final_frame = Image.new("RGB", (background_size, background_size), (255, 255, 255))
            final_frame.paste(background, (0, 0), background)
            frames_list.append(final_frame)
            continue

        elif style == "gradient":
            # Color gradient shift (E91E8C → 7C3AED → 0891B2)
            if progress < 0.5:
                r = int(233 - (233 - 124) * (progress * 2))
                g = int(30 + (58 - 30) * (progress * 2))
                b = int(140 + (237 - 140) * (progress * 2))
            else:
                r = int(124 - (124 - 8) * ((progress - 0.5) * 2))
                g = int(58 + (145 - 58) * ((progress - 0.5) * 2))
                b = int(237 - (237 - 178) * ((progress - 0.5) * 2))
            border_color = (r, g, b, 150)
            border_width = 3

        elif style == "neon":
            # Bright neon glow
            alpha = int(150 + 100 * (0.5 + 0.5 * (1 - abs(progress * 2 - 1))))
            border_color = (233, 30, 140, alpha)
            border_width = 4

        elif style == "bounce":
            # Bouncing/scaling effect
            scale = 1.0 + 0.15 * (1 - (progress * 2 % 1) ** 2)
            new_size = int(size * scale)
            offset = (background_size - new_size) // 2
            frame = frame.resize((new_size, new_size), Image.Resampling.LANCZOS)
            background.paste(frame, (offset, offset), frame)
            final_frame = Image.new("RGB", (background_size, background_size), (255, 255, 255))
            final_frame.paste(background, (0, 0), background)
            frames_list.append(final_frame)
            continue

        else:
            # Default to pulsing
            alpha = int(100 * (0.5 + 0.5 * (1 - abs(progress * 2 - 1))))
            border_color = (233, 30, 140, alpha)
            border_width = 3

        # Draw border for non-scaling styles
        bbox = [
            (background_size - size) // 2,
            (background_size - size) // 2,
            (background_size + size) // 2,
            (background_size + size) // 2,
        ]
        draw.rectangle(bbox, outline=border_color, width=border_width)
        paste_pos = ((background_size - size) // 2, (background_size - size) // 2)
        background.paste(frame, paste_pos, frame)

        # Convert to RGB for GIF
        final_frame = Image.new("RGB", (background_size, background_size), (255, 255, 255))
        final_frame.paste(background, (0, 0), background)
        frames_list.append(final_frame)

    # Save as GIF
    gif_buffer = io.BytesIO()
    frames_list[0].save(
        gif_buffer,
        format="GIF",
        save_all=True,
        append_images=frames_list[1:],
        duration=150,
        loop=0,
        optimize=False,
    )
    gif_buffer.seek(0)
    return gif_buffer.getvalue()


def qr_to_base64(data: str, size: int = 200) -> str:
    """Generate QR code and return as base64 PNG."""
    qr_img = generate_qr_code(data, size)
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"


def qr_gif_to_base64(data: str, size: int = 200, style: str = "pulsing") -> str:
    """Generate animated QR code GIF and return as base64."""
    gif_bytes = generate_animated_qr_gif(data, size, style=style)
    img_base64 = base64.b64encode(gif_bytes).decode()
    return f"data:image/gif;base64,{img_base64}"
