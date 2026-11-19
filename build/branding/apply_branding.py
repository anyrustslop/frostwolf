"""Creates browser/branding/frostwolf in a Firefox source tree.

Starts from Firefox's own "unofficial" branding (so every file Firefox expects is there), then
replaces every icon and image with FrostWolf's logo at the same size, and every product name with
"FrostWolf". Usage: python apply_branding.py <firefox source dir>
"""
import os
import re
import shutil
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import logo  # noqa: E402

NAME = "FrostWolf"
URL = "https://codeberg.org/anyrustslop/frostwolf"
RELEASES = "https://github.com/anyrustslop/frostwolf/releases"
DARK_BG = (11, 18, 32, 255)


def replace_images(root):
    for dirpath, _, files in os.walk(root):
        for f in files:
            p = os.path.join(dirpath, f)
            ext = f.lower().rsplit(".", 1)[-1]
            if ext == "png":
                with Image.open(p) as im:
                    w, h = im.size
                img = logo.render(w) if w == h else logo.render_box(w, h)
                img.save(p)
            elif ext == "ico":
                logo.render(256).save(p, sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
            elif ext == "bmp":  # installer artwork
                with Image.open(p) as im:
                    w, h = im.size
                logo.render_box(w, h, background=DARK_BG).convert("RGB").save(p)
            elif ext == "svg":
                text = logo.wordmark_svg() if "wordmark" in f.lower() else logo.svg()
                open(p, "w", encoding="utf8").write(text)


def set_names(root):
    # Fluent brand names: keep every message, change the values.
    for p in [os.path.join(dp, f) for dp, _, fs in os.walk(root) for f in fs if f == "brand.ftl"]:
        s = open(p, encoding="utf8").read()
        s = re.sub(r"^(-brand-[a-z-]+|-vendor-short-name)\s*=.*$", lambda m: f"{m.group(1)} = {NAME}", s, flags=re.M)
        s = re.sub(r"^(trademarkInfo)\s*=.*$", lambda m: m.group(1) + ' = { " " }', s, flags=re.M)
        open(p, "w", encoding="utf8").write(s)
    for p in [os.path.join(dp, f) for dp, _, fs in os.walk(root) for f in fs if f == "brand.properties"]:
        s = open(p, encoding="utf8").read()
        s = re.sub(r"^(brand[A-Za-z]*Name|vendorShortName)\s*=.*$", lambda m: f"{m.group(1)}={NAME}", s, flags=re.M)
        open(p, "w", encoding="utf8").write(s)
    cfg = os.path.join(root, "configure.sh")
    s = open(cfg, encoding="utf8").read()
    s = re.sub(r"^MOZ_APP_DISPLAYNAME=.*$", f"MOZ_APP_DISPLAYNAME={NAME}", s, flags=re.M)
    if "MOZ_APP_DISPLAYNAME" not in s:
        s += f"\nMOZ_APP_DISPLAYNAME={NAME}\n"
    open(cfg, "w", encoding="utf8").write(s)
    nsi = os.path.join(root, "branding.nsi")
    if os.path.exists(nsi):
        s = open(nsi, encoding="utf8").read()
        for key in ("BrandShortName", "BrandFullNameInternal", "BrandFullName", "CompanyName", "BrandProductName"):
            s = re.sub(rf'^(!define {key}\s+)".*"', rf'\1"{NAME}"', s, flags=re.M)
        for key in ("URLInfoAbout", "URLUpdateInfo", "HelpLink", "URLManualDownload", "URLSystemRequirements"):
            s = re.sub(rf'^(!define {key}\s+)".*"', rf'\1"{URL}"', s, flags=re.M)
        open(nsi, "w", encoding="utf8").write(s)
    # No Mozilla welcome / "what's new" pages.
    for p in [os.path.join(dp, f) for dp, _, fs in os.walk(root) for f in fs if f.endswith("-branding.js")]:
        s = open(p, encoding="utf8").read()
        s = re.sub(r'(pref\("startup\.homepage_(welcome|override)_url[^"]*",\s*)"[^"]*"', r'\1""', s)
        s = re.sub(r'(pref\("app\.update\.url\.(manual|details)",\s*)"[^"]*"', rf'\1"{RELEASES}"', s)
        open(p, "w", encoding="utf8").write(s)


def main():
    src = sys.argv[1]
    base = os.path.join(src, "browser", "branding")
    dst = os.path.join(base, "frostwolf")
    if os.path.exists(dst):
        shutil.rmtree(dst)
    shutil.copytree(os.path.join(base, "unofficial"), dst)
    replace_images(dst)
    set_names(dst)
    print(f"branding: {dst}")


if __name__ == "__main__":
    main()
