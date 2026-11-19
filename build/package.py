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
