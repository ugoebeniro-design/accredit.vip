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


def generate_animated_qr_gif(data: str, size: int = 200, frames: int = 6) -> bytes:
    """
    Generate an animated QR code GIF with pulsing/glowing effect.
    Creates multiple frames with different opacity to create animation.
    """
    frames_list = []

    # Generate base QR
    qr_base = generate_qr_code(data, size)

    # Create frames with different effects
    for i in range(frames):
        # Create a copy of the QR code
        frame = qr_base.copy()
        frame = frame.convert("RGBA")

        # Add a subtle glow/pulse effect
        # Create a larger background with gradient
        background_size = int(size * 1.3)
        background = Image.new("RGBA", (background_size, background_size), (0, 0, 0, 0))

        # Add colored border based on frame (creates pulsing effect)
        alpha_pulse = int(100 * (0.5 + 0.5 * (i / frames)))  # Pulse from 50% to 100%

        # Add a subtle colored border
        border_color = (233, 30, 140, alpha_pulse)  # Pink with varying alpha
        border_width = 3

        draw = ImageDraw.Draw(background)
        bbox = [
            (background_size - size) // 2,
            (background_size - size) // 2,
            (background_size + size) // 2,
            (background_size + size) // 2,
        ]
        draw.rectangle(bbox, outline=border_color, width=border_width)

        # Paste QR code in center
        paste_pos = (
            (background_size - size) // 2,
            (background_size - size) // 2,
        )
        background.paste(frame, paste_pos, frame)

        # Convert to RGB for GIF (GIF doesn't support RGBA well)
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
        duration=200,  # 200ms per frame
        loop=0,  # Infinite loop
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


def qr_gif_to_base64(data: str, size: int = 200) -> str:
    """Generate animated QR code GIF and return as base64."""
    gif_bytes = generate_animated_qr_gif(data, size)
    img_base64 = base64.b64encode(gif_bytes).decode()
    return f"data:image/gif;base64,{img_base64}"
