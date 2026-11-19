"""Frostwolf's logo: the geometric wolf head of its sibling RustWolf, in ice blue.

Renders straight from polygons (no image files in the repo), so every icon Firefox's branding
needs can be generated at its exact size. Needs Pillow.
"""
from PIL import Image, ImageDraw

# Points in a 100 x 100 box (same shape as RustWolf's src/logo.rs).
HEAD = [(50, 24), (60, 28), (80, 5), (85, 37), (96, 50), (86, 55), (92, 66), (76, 70), (62, 90), (50, 97),
        (38, 90), (24, 70), (8, 66), (14, 55), (4, 50), (15, 37), (20, 5), (40, 28)]
EAR_L = [(23, 14), (36, 30), (26, 37)]
EAR_R = [(77, 14), (64, 30), (74, 37)]
BROW = [(50, 27), (57, 39), (50, 50), (43, 39)]
MASK = [(50, 50), (65, 60), (60, 80), (50, 91), (40, 80), (35, 60)]
CHEEK_L = [(8, 66), (24, 70), (20, 58)]
CHEEK_R = [(92, 66), (76, 70), (80, 58)]
EYE_L = [(27, 47), (43, 53), (32, 56)]
EYE_R = [(73, 47), (57, 53), (68, 56)]
NOSE = [(43, 80), (57, 80), (50, 88)]

# Ice-blue palette (RustWolf uses reds).
LAYERS = [
    (HEAD, ((140, 220, 255), (24, 92, 170))),   # gradient top -> bottom
    (EAR_L, (10, 42, 82)),
    (EAR_R, (10, 42, 82)),
    (BROW, (30, 110, 190)),
    (CHEEK_L, (16, 66, 122)),
    (CHEEK_R, (16, 66, 122)),
    (MASK, ((214, 244, 255), (96, 186, 240))),
    (EYE_L, (236, 250, 255)),
    (EYE_R, (236, 250, 255)),
    (NOSE, (6, 18, 34)),
]

ACCENT = "#5ec8ff"
DARK = "#0b1220"


def _fill(img, poly, color, scale, pad):
    pts = [(pad + x * scale, pad + y * scale) for x, y in poly]
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    if isinstance(color[0], tuple):  # vertical gradient over the 100-unit box
        top, bottom = color
        grad = Image.new("RGBA", img.size)
        gd = ImageDraw.Draw(grad)
        h = img.size[1]
        for y in range(h):
            t = min(max((y - pad) / (100 * scale), 0.0), 1.0)
            c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
            gd.line([(0, y), (img.size[0], y)], fill=c)
        img.paste(grad, (0, 0), mask)
    else:
        img.paste(Image.new("RGBA", img.size, tuple(color) + (255,)), (0, 0), mask)


def render(size, background=None):
    """Square logo, `size` px, transparent (or `background`) behind the head."""
    ss = 4
    big = size * ss
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0) if background is None else background)
    pad = big * 0.02
    scale = (big - 2 * pad) / 100.0
    for poly, color in LAYERS:
        _fill(img, poly, color, scale, pad)
    return img.resize((size, size), Image.LANCZOS)


def render_box(width, height, background=None):
    """Logo centered in a width x height box (for non-square branding images)."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0) if background is None else background)
    side = max(1, int(min(width, height) * 0.86))
    logo = render(side)
    img.alpha_composite(logo, ((width - side) // 2, (height - side) // 2))
    return img


def svg():
    """The logo as SVG."""
    def pts(p):
        return " ".join(f"{x},{y}" for x, y in p)

    def hexc(c):
        return "#%02x%02x%02x" % c

    out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
           '<defs>'
           f'<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(LAYERS[0][1][0])}"/><stop offset="1" stop-color="{hexc(LAYERS[0][1][1])}"/></linearGradient>'
           f'<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{hexc(LAYERS[6][1][0])}"/><stop offset="1" stop-color="{hexc(LAYERS[6][1][1])}"/></linearGradient>'
           '</defs>']
    for poly, color in LAYERS:
        if isinstance(color[0], tuple):
            fill = "url(#h)" if poly is HEAD else "url(#m)"
        else:
            fill = hexc(color)
        out.append(f'<polygon points="{pts(poly)}" fill="{fill}"/>')
    out.append("</svg>")
    return "".join(out)


def wordmark_svg():
    """'Frostwolf' wordmark (used where Firefox shows its name as an image)."""
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 172 42">'
            f'<text x="0" y="32" font-family="Segoe UI, Arial, sans-serif" font-size="32" font-weight="600" fill="{ACCENT}">Frostwolf</text>'
            '</svg>')


if __name__ == "__main__":
    import sys
    render(512).save(sys.argv[1] if len(sys.argv) > 1 else "frostwolf-logo.png")
