"""Logos for the welcome page, fetched at build time and stored inside FrostWolf, so the page never
contacts these companies when you open it. Extensions: their icon on addons.mozilla.org. Websites:
their own apple-touch-icon / icon. Anything that can't be fetched gets a lettered tile instead.

  python fetch_logos.py <out dir>     -> <out dir>/<key>.png (96 x 96)
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

from PIL import Image, ImageDraw, ImageFont

SIZE = 96
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0"}

# key: ("amo", addon slug) or ("site", homepage), display name for the fallback tile
LOGOS = {
    "ddg": (("site", "https://duckduckgo.com/"), "DuckDuckGo"),
    "brave": (("site", "https://brave.com/"), "Brave"),
    "mojeek": (("site", "https://www.mojeek.com/"), "Mojeek"),
    "qwant": (("site", "https://www.qwant.com/"), "Qwant"),
    "ublock": (("amo", "ublock-origin"), "uBlock"),
    "bitwarden": (("amo", "bitwarden-password-manager"), "Bitwarden"),
    "containers": (("amo", "multi-account-containers"), "Containers"),
    "noscript": (("amo", "noscript"), "NoScript"),
    "mullvad": (("site", "https://mullvad.net/"), "Mullvad"),
    "protonvpn": (("site", "https://protonvpn.com/"), "Proton VPN"),
    "ivpn": (("site", "https://www.ivpn.net/"), "IVPN"),
    "tor": (("site", "https://www.torproject.org/"), "Tor"),
    "signal": (("site", "https://signal.org/"), "Signal"),
    "protonmail": (("site", "https://proton.me/mail"), "Proton Mail"),
    "tuta": (("site", "https://tuta.com/"), "Tuta"),
    "bitwarden-app": (("site", "https://bitwarden.com/"), "Bitwarden"),
    "privacyguides": (("site", "https://www.privacyguides.org/"), "Privacy Guides"),
}


def get(url, limit=4_000_000):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
        return r.read(limit), r.geturl()


def to_png(data):
    """Raster image bytes -> SIZE x SIZE RGBA, centered on a transparent square."""
    im = Image.open(io.BytesIO(data))
    if getattr(im, "n_frames", 1) > 1 or im.format == "ICO":
        try:  # largest frame of an .ico
            sizes = sorted(im.info.get("sizes", []) or [im.size], key=lambda s: s[0] * s[1])
            im.size = sizes[-1]
        except Exception:
            pass
    im = im.convert("RGBA")
    bbox = im.getbbox()  # trim transparent margins
    if bbox:
        im = im.crop(bbox)
    if min(im.size) < 16:
        raise ValueError("too small")
    scale = SIZE / max(im.size)  # same size for every logo (small favicons are enlarged)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2))
    return out


def from_amo(slug):
    info = json.loads(get(f"https://addons.mozilla.org/api/v5/addons/addon/{slug}/")[0])
    icons = info.get("icons") or {}
    url = icons.get("128") or icons.get("64") or info.get("icon_url")
    return to_png(get(url)[0])


def from_site(home):
    html, final = get(home, 600_000)
    html = html.decode("utf8", "replace")
    cands = []
    for tag in re.findall(r"<link\b[^>]*>", html, re.I):
        rel = re.search(r'rel=["\']([^"\']+)', tag, re.I)
        href = re.search(r'href=["\']([^"\']+)', tag, re.I)
        if not rel or not href or "icon" not in rel.group(1).lower():
            continue
        h = href.group(1)
        if h.lower().split("?")[0].endswith(".svg"):
            continue  # needs a vector renderer
        size = re.search(r'sizes=["\'](\d+)x', tag, re.I)
        score = (2 if "apple-touch" in rel.group(1).lower() else 1, int(size.group(1)) if size else 0)
        cands.append((score, urllib.parse.urljoin(final, h)))
    cands.sort(reverse=True)
    for _, url in cands + [((0, 0), urllib.parse.urljoin(final, "/apple-touch-icon.png")), ((0, 0), urllib.parse.urljoin(final, "/favicon.ico"))]:
        try:
            return to_png(get(url)[0])
        except Exception:
            continue
    raise ValueError("no usable icon")


def tile(name):
    """Fallback: initial on an ice-blue rounded tile."""
    im = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=22, fill=(30, 58, 92, 255))
    try:
        f = ImageFont.truetype("DejaVuSans-Bold.ttf", 46)
    except OSError:
        try:
            f = ImageFont.truetype(os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", "segoeuib.ttf"), 46)
        except OSError:
            f = ImageFont.load_default()
    d.text((SIZE / 2, SIZE / 2), name[0].upper(), font=f, fill=(94, 200, 255, 255), anchor="mm")
    return im


def main(out):
    os.makedirs(out, exist_ok=True)
    for key, ((kind, ref), name) in LOGOS.items():
        try:
            im = from_amo(ref) if kind == "amo" else from_site(ref)
            how = "fetched"
        except Exception as e:
            im, how = tile(name), f"fallback tile ({type(e).__name__})"
        im.save(os.path.join(out, f"{key}.png"))
        print(f"{key:<14} {how}")


if __name__ == "__main__":
    main(sys.argv[1])
