"""Turns Firefox's packaged zip into FrostWolf's release files.

  python package.py <firefox package zip> <version> <out dir>

Adds FrostWolf's settings (autoconfig + frostwolf.cfg), policies.json and the built-in ice theme,
then writes:
  FrostWolf-<version>-win64-portable.zip   (unzip anywhere, run frostwolf.exe)
  app/                                     (the same files, for the installer: build/installer.nsi)
  frostwolf.ico
"""
import os
import shutil
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "branding"))
import logo  # noqa: E402


def main():
    pkg, version, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    app = os.path.join(out, "app")
    if os.path.exists(app):
        shutil.rmtree(app)
    with zipfile.ZipFile(pkg) as z:
        z.extractall(out + "/unpacked")
    top = os.path.join(out, "unpacked", os.listdir(out + "/unpacked")[0])  # "frostwolf/"
    shutil.move(top, app)
    shutil.rmtree(out + "/unpacked")
    if not os.path.exists(os.path.join(app, "frostwolf.exe")):
        sys.exit("frostwolf.exe missing from the package")

    s = os.path.join(HERE, "settings")
    shutil.copy(os.path.join(s, "frostwolf.cfg"), os.path.join(app, "frostwolf.cfg"))
    os.makedirs(os.path.join(app, "defaults", "pref"), exist_ok=True)
    shutil.copy(os.path.join(s, "autoconfig.js"), os.path.join(app, "defaults", "pref", "autoconfig.js"))
    os.makedirs(os.path.join(app, "distribution"), exist_ok=True)
    shutil.copy(os.path.join(s, "policies.json"), os.path.join(app, "distribution", "policies.json"))

    ext = os.path.join(app, "browser", "extensions")
    os.makedirs(ext, exist_ok=True)
    with zipfile.ZipFile(os.path.join(ext, "frostwolf-ice@frostwolf.xpi"), "w", zipfile.ZIP_DEFLATED) as x:
        x.write(os.path.join(HERE, "theme", "manifest.json"), "manifest.json")
    # FrostWolf Guard (anti-ClickFix).
    with zipfile.ZipFile(os.path.join(ext, "frostwolf-guard@frostwolf.xpi"), "w", zipfile.ZIP_DEFLATED) as x:
        for f in ("manifest.json", "detect.js", "guard.js"):
            x.write(os.path.join(HERE, "guard", f), f)
    # FrostWolf Welcome (first-start guide), with the logo rendered for it.
    import io
    png = io.BytesIO()
    logo.render(264).save(png, format="PNG")
    sys.path.insert(0, os.path.join(HERE, "welcome"))
    import fetch_logos  # noqa: E402
    logos_dir = os.path.join(out, "welcome-logos")
    fetch_logos.main(logos_dir)
    with zipfile.ZipFile(os.path.join(ext, "frostwolf-welcome@frostwolf.xpi"), "w", zipfile.ZIP_DEFLATED) as x:
        for f in ("manifest.json", "background.js", "welcome.html", "welcome.css"):
            x.write(os.path.join(HERE, "welcome", f), f)
        x.writestr("logo.png", png.getvalue())
        for f in sorted(os.listdir(logos_dir)):
            x.write(os.path.join(logos_dir, f), "logos/" + f)

    # FrostWolf logo at the top left of the window (added to frostwolf.cfg).
    import base64
    small = io.BytesIO()
    logo.render(64).save(small, format="PNG")
    snippet = open(os.path.join(s, "ui-logo.cfg.js"), encoding="utf8").read()
    snippet = snippet.replace("@FROSTWOLF_LOGO_PNG@", base64.b64encode(small.getvalue()).decode())
    with open(os.path.join(app, "frostwolf.cfg"), "a", encoding="utf8") as f:
        f.write(snippet)
        # Tor, on by default (tor/tor/tor.exe + tor/data/geoip*, verified by fetch_tor.py).
        f.write(open(os.path.join(s, "tor.cfg.js"), encoding="utf8").read())
    sys.path.insert(0, os.path.join(HERE, "tor"))
    import fetch_tor  # noqa: E402
    tor_version = fetch_tor.main(os.path.join(app, "tor"))
    print(f"Tor {tor_version} included")

    logo.render(256).save(os.path.join(out, "frostwolf.ico"),
                          sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    portable = os.path.join(out, f"FrostWolf-{version}-win64-portable.zip")
    with zipfile.ZipFile(portable, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for dp, _, files in os.walk(app):
            for f in files:
                full = os.path.join(dp, f)
                z.write(full, os.path.join("FrostWolf", os.path.relpath(full, app)))
    print(portable)


if __name__ == "__main__":
    main()
