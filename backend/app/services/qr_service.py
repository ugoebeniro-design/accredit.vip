import qrcode
from io import BytesIO
import base64
from PIL import Image, ImageDraw
import io
import math
import random


def generate_qr_code(data: str, size: int = 200) -> Image.Image:
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


def _qr_modules(qr_img: Image.Image) -> list[tuple[int, int, int, int]]:
    w, h = qr_img.size
    cells = []
    step = max(1, w // 25)
    for y in range(0, h, step):
        for x in range(0, w, step):
            pixel = qr_img.getpixel((x, y))
            is_black = (pixel == 0) or (isinstance(pixel, tuple) and pixel[0] < 128)
            if is_black:
                cells.append((x, y, step, step))
    return cells


def generate_animated_qr_gif(data: str, size: int = 200, frames: int = 10, style: str = "pulsing") -> bytes:
    frames_list = []
    qr_base = generate_qr_code(data, size)
    background_size = int(size * 1.3)
    modules = _qr_modules(qr_base)
    cx = background_size // 2
    cy = background_size // 2
    paste_pos = ((background_size - size) // 2, (background_size - size) // 2)
    half = size // 2

    for i in range(frames):
        frame = qr_base.copy().convert("RGBA")
        background = Image.new("RGBA", (background_size, background_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(background)
        progress = i / frames

        if style == "pulsing":
            alpha = int(100 * (0.5 + 0.5 * (1 - abs(progress * 2 - 1))))
            draw.rectangle(
                [paste_pos[0], paste_pos[1], paste_pos[0] + size, paste_pos[1] + size],
                outline=(233, 30, 140, alpha), width=3,
            )
            background.paste(frame, paste_pos, frame)

        elif style == "gradient":
            draw.rectangle(
                [paste_pos[0], paste_pos[1], paste_pos[0] + size, paste_pos[1] + size],
                fill=(255, 255, 255, 255),
            )
            if progress < 0.5:
                r = int(233 - (233 - 124) * (progress * 2))
                g = int(30 + (58 - 30) * (progress * 2))
                b = int(140 + (237 - 140) * (progress * 2))
            else:
                r = int(124 - (124 - 8) * ((progress - 0.5) * 2))
                g = int(58 + (145 - 58) * ((progress - 0.5) * 2))
                b = int(237 - (237 - 178) * ((progress - 0.5) * 2))
            for mx, my, mw, mh in modules:
                draw.rectangle(
                    [paste_pos[0] + mx, paste_pos[1] + my, paste_pos[0] + mx + mw, paste_pos[1] + my + mh],
                    fill=(r, g, b, 255),
                )

        elif style == "neon":
            bbox = [paste_pos[0], paste_pos[1], paste_pos[0] + size, paste_pos[1] + size]
            frac = 0.5 + 0.5 * (1 - abs(progress * 2 - 1))
            # Outer glow
            draw.rectangle(bbox, outline=(255, 0, 200, int(60 + 40 * frac)), width=8)
            # Inner bright core
            draw.rectangle(bbox, outline=(255, 80, 220, int(150 + 80 * frac)), width=3)
            background.paste(frame, paste_pos, frame)

        elif style == "rotating":
            background.paste(frame, paste_pos, frame)
            angle = progress * 360
            rad = math.radians(angle)
            sweep_start = angle - 50
            sweep_end = angle + 50
            overlay = Image.new("RGBA", (background_size, background_size), (0, 0, 0, 0))
            ImageDraw.Draw(overlay).pieslice(
                [cx - half - 12, cy - half - 12, cx + half + 12, cy + half + 12],
                start=sweep_start, end=sweep_end,
                fill=(233, 30, 140, 55),
            )
            background = Image.alpha_composite(background, overlay)

        elif style == "bounce":
            beat = 1 - (progress * 2 % 1)
            scale = 1.0 + 0.18 * (0.5 + 0.5 * math.sin(progress * math.pi * 2))
            new_size = int(size * scale)
            offset = (background_size - new_size) // 2
            scaled = frame.resize((new_size, new_size), Image.Resampling.LANCZOS)
            background.paste(scaled, (offset, offset), scaled)

        elif style == "scanner":
            background.paste(frame, paste_pos, frame)
            line_y = paste_pos[1] + int((progress * size * 2) % size)
            draw.line(
                [paste_pos[0], line_y, paste_pos[0] + size, line_y],
                fill=(233, 30, 140, 180), width=3,
            )
            # Glow around scan line
            if line_y > 0:
                draw.line(
                    [paste_pos[0], line_y - 1, paste_pos[0] + size, line_y - 1],
                    fill=(233, 30, 140, 60), width=5,
                )
            if line_y < background_size - 1:
                draw.line(
                    [paste_pos[0], line_y + 1, paste_pos[0] + size, line_y + 1],
                    fill=(233, 30, 140, 60), width=5,
                )

        elif style == "ripple":
            background.paste(frame, paste_pos, frame)
            ripple_progress = (progress * 2) % 1
            max_r = half + 10
            r_radius = max_r * ripple_progress
            alpha = int(80 * (1 - ripple_progress))
            for w in [3, 6]:
                draw.ellipse(
                    [cx - r_radius, cy - r_radius, cx + r_radius, cy + r_radius],
                    outline=(233, 30, 140, alpha // (2 if w > 3 else 1)), width=w,
                )

        elif style == "sparkle":
            background.paste(frame, paste_pos, frame)
            seed = i * 7 + 13
            rng = random.Random(seed)
            for _ in range(12):
                sx = paste_pos[0] + rng.randint(0, size)
                sy = paste_pos[1] + rng.randint(0, size)
                spark_alpha = rng.randint(100, 220)
                spark_r = rng.randint(2, 5)
                draw.ellipse(
                    [sx - spark_r, sy - spark_r, sx + spark_r, sy + spark_r],
                    fill=(233, 30, 140, spark_alpha),
                )
                # Cross
                draw.line([sx - spark_r * 2, sy, sx + spark_r * 2, sy], fill=(255, 255, 255, spark_alpha), width=1)
                draw.line([sx, sy - spark_r * 2, sx, sy + spark_r * 2], fill=(255, 255, 255, spark_alpha), width=1)

        else:
            alpha = int(100 * (0.5 + 0.5 * (1 - abs(progress * 2 - 1))))
            draw.rectangle(
                [paste_pos[0], paste_pos[1], paste_pos[0] + size, paste_pos[1] + size],
                outline=(233, 30, 140, alpha), width=3,
            )
            background.paste(frame, paste_pos, frame)

        if style != "gradient":
            final_frame = Image.new("RGB", (background_size, background_size), (255, 255, 255))
            final_frame.paste(background, (0, 0), background)
        else:
            final_frame = background.convert("RGB")
        frames_list.append(final_frame)

    gif_buffer = io.BytesIO()
    frames_list[0].save(
        gif_buffer, format="GIF",
        save_all=True, append_images=frames_list[1:],
        duration=150, loop=0, optimize=False,
    )
    gif_buffer.seek(0)
    return gif_buffer.getvalue()


def qr_to_base64(data: str, size: int = 200) -> str:
    qr_img = generate_qr_code(data, size)
    buffer = BytesIO()
    qr_img.save(buffer, format="PNG")
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"


def qr_gif_to_base64(data: str, size: int = 200, style: str = "pulsing") -> str:
    gif_bytes = generate_animated_qr_gif(data, size, style=style)
    img_base64 = base64.b64encode(gif_bytes).decode()
    return f"data:image/gif;base64,{img_base64}"


def qr_gif_to_url(data: str, size: int = 200, style: str = "pulsing") -> str | None:
    import os
    from datetime import datetime
    try:
        gif_bytes = generate_animated_qr_gif(data, size, style=style)
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "qrs")
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"qr_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}.gif"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(gif_bytes)
        return f"/uploads/qrs/{filename}"
    except Exception:
        return None
