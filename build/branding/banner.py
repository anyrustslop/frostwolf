"""Renders the README banner (assets/banner.png): night-sky ice gradient, frost facets, the
FrostWolf logo and name. Needs Pillow and a TrueType font (Segoe UI / Bahnschrift on Windows).
python banner.py <out dir>  (banner.png + section-*.png)"""
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logo  # noqa: E402

W, H = 1600, 520
FONTS = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts")


def font(name, size):
    try:
        return ImageFont.truetype(os.path.join(FONTS, name), size)
    except OSError:
        return ImageFont.load_default(size)


def main(out):
    img = Image.new("RGBA", (W, H))
    px = img.load()
    # Diagonal gradient: deep navy -> ice blue glow on the right.
    for y in range(H):
        for x in range(W):
            t = x / W
            u = y / H
            glow = math.exp(-(((x - W * 0.27) / (W * 0.30)) ** 2 + ((y - H * 0.5) / (H * 0.75)) ** 2))
            r = int(8 + 10 * t + 30 * glow)
            g = int(14 + 22 * t + 70 * glow - 6 * u)
            b = int(28 + 40 * t + 120 * glow - 10 * u)
            px[x, y] = (r, g, max(0, b), 255)

    # Frost: faint triangular facets, like the logo's geometry.
    rnd = random.Random(7)
    facets = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(facets)
    for _ in range(70):
        cx, cy = rnd.uniform(W * 0.45, W * 1.05), rnd.uniform(-60, H + 60)
        s = rnd.uniform(40, 160)
        pts = [(cx + s * math.cos(a), cy + s * math.sin(a)) for a in (rnd.uniform(0, 6.28) for _ in range(3))]
        fd.polygon(pts, fill=(140, 210, 255, rnd.randint(6, 18)), outline=(150, 220, 255, rnd.randint(14, 34)))
    img.alpha_composite(facets)

    # Snow / stars.
    stars = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    for _ in range(220):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        r = rnd.choice([0.8, 1.0, 1.3, 1.8])
        sd.ellipse([x - r, y - r, x + r, y + r], fill=(220, 240, 255, rnd.randint(60, 200)))
    img.alpha_composite(stars.filter(ImageFilter.GaussianBlur(0.4)))

    # Logo with a soft glow.
    size = 360
    lg = logo.render(size)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow.alpha_composite(lg, (int(W * 0.27 - size / 2), int(H / 2 - size / 2)))
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    tint = Image.new("RGBA", (W, H), (94, 200, 255, 0))
    tint.putalpha(glow.getchannel("A").point(lambda a: int(a * 0.55)))
    img.alpha_composite(tint)
    img.alpha_composite(lg, (int(W * 0.27 - size / 2), int(H / 2 - size / 2)))

    # Text.
    d = ImageDraw.Draw(img)
    x0 = int(W * 0.47)
    title = font("bahnschrift.ttf", 132)
    d.text((x0, 112), "FrostWolf", font=title, fill=(232, 246, 255, 255))
    sub = font("segoeui.ttf", 40)
    d.text((x0 + 4, 268), "Firefox, hardened for privacy.", font=sub, fill=(150, 210, 250, 255))
    small = font("seguisb.ttf", 27)
    d.text((x0 + 4, 336), "No telemetry  ·  uBlock Origin  ·  Anti-fingerprinting", font=small, fill=(120, 180, 225, 255))
    d.text((x0 + 4, 380), "Inspired by LibreWolf  ·  open source (MPL-2.0)", font=small, fill=(120, 180, 225, 255))
    # Accent line.
    d.rounded_rectangle([x0 + 6, 252, x0 + 186, 257], radius=3, fill=(94, 200, 255, 255))

    img.convert("RGB").save(out, optimize=True)
    print(out)


SECTIONS = {
    "why-privacy": ("Why privacy matters", "Your browsing is the most personal data you create"),
    "features": ("What's inside", "Firefox ESR, rebuilt and locked down"),
    "download": ("Download", "Windows 10 / 11, installer or portable"),
    "build": ("How it's built", "From Mozilla's source, in the open"),
    "librewolf": ("Inspired by LibreWolf", "Standing on the shoulders of a great project"),
}


def section(key, out):
    """Slim header in the same style as the main banner."""
    title, subtitle = SECTIONS[key]
    w, h = 1600, 190
    img = Image.new("RGBA", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = x / w
            glow = math.exp(-(((x - w * 0.06) / (w * 0.22)) ** 2 + ((y - h * 0.5) / (h * 1.2)) ** 2))
            px[x, y] = (int(9 + 10 * t + 22 * glow), int(16 + 20 * t + 52 * glow), int(32 + 36 * t + 92 * glow), 255)
    rnd = random.Random(sum(map(ord, key)))
    facets = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    fd = ImageDraw.Draw(facets)
    for _ in range(26):
        cx, cy = rnd.uniform(w * 0.55, w * 1.05), rnd.uniform(-40, h + 40)
        s = rnd.uniform(30, 110)
        pts = [(cx + s * math.cos(a), cy + s * math.sin(a)) for a in (rnd.uniform(0, 6.28) for _ in range(3))]
        fd.polygon(pts, fill=(140, 210, 255, rnd.randint(6, 16)), outline=(150, 220, 255, rnd.randint(14, 30)))
    for _ in range(70):
        x, y = rnd.uniform(0, w), rnd.uniform(0, h)
        r = rnd.choice([0.8, 1.0, 1.4])
        fd.ellipse([x - r, y - r, x + r, y + r], fill=(220, 240, 255, rnd.randint(50, 170)))
    img.alpha_composite(facets)
    lg = logo.render(112)
    img.alpha_composite(lg, (56, (h - 112) // 2))
    d = ImageDraw.Draw(img)
    d.text((204, 34), title, font=font("bahnschrift.ttf", 66), fill=(232, 246, 255, 255))
    d.rounded_rectangle([208, 118, 328, 122], radius=2, fill=(94, 200, 255, 255))
    d.text((208, 132), subtitle, font=font("segoeui.ttf", 30), fill=(140, 200, 240, 255))
    img.convert("RGB").save(out, optimize=True)
    print(out)


if __name__ == "__main__":
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    main(os.path.join(out_dir, "banner.png"))
    for key in SECTIONS:
        section(key, os.path.join(out_dir, f"section-{key}.png"))
