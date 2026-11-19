"""Firefox ESR source: find the latest version, download it, verify it.

  python fetch_source.py latest            -> prints the newest ESR version (e.g. 153.7.0esr)
  python fetch_source.py get <ver> <dir>   -> downloads firefox-<ver>.source.tar.xz from Mozilla,
                                              checks its SHA-512 against Mozilla's SHA512SUMS and
                                              unpacks it to <dir>/firefox-src
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import urllib.request

BASE = "https://archive.mozilla.org/pub/firefox/releases"


def fetch(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "frostwolf-build"})
    return urllib.request.urlopen(req, timeout=timeout)


def latest_esr():
    html = fetch(BASE + "/").read().decode()
    vers = set(re.findall(r"/pub/firefox/releases/(\d+\.\d+(?:\.\d+)*esr)/", html))
    return max(vers, key=lambda v: [int(x) for x in re.findall(r"\d+", v)])


def get(ver, out_dir):
    if not re.fullmatch(r"\d+\.\d+(\.\d+)*esr", ver):
        sys.exit(f"not an ESR version: {ver}")
    name = f"firefox-{ver}.source.tar.xz"
    sums = fetch(f"{BASE}/{ver}/SHA512SUMS").read().decode()
    want = next((l.split()[0] for l in sums.splitlines() if l.endswith("source/" + name)), None)
    if not want:
        sys.exit(f"{name} not listed in SHA512SUMS")
    os.makedirs(out_dir, exist_ok=True)
    tar = os.path.join(out_dir, name)
    h = hashlib.sha512()
    with fetch(f"{BASE}/{ver}/source/{name}", timeout=600) as r, open(tar, "wb") as f:
        while chunk := r.read(1 << 20):
            h.update(chunk)
            f.write(chunk)
    if h.hexdigest() != want:
        os.remove(tar)
        sys.exit("SHA-512 mismatch: download corrupted or tampered with")
    print(f"verified {name} (SHA-512 {want[:16]}...)")
    dest = os.path.join(out_dir, "firefox-src")
    if os.path.exists(dest):
        shutil.rmtree(dest)
    tmp = os.path.join(out_dir, "unpack")
    os.makedirs(tmp, exist_ok=True)
    subprocess.run(["tar", "-xJf", tar, "-C", tmp], check=True)
    inner = [d for d in os.listdir(tmp) if os.path.isdir(os.path.join(tmp, d))]
    os.rename(os.path.join(tmp, inner[0]), dest)
    os.rmdir(tmp)
    os.remove(tar)  # free disk space for the build
    print(f"source: {dest}")


if __name__ == "__main__":
    if sys.argv[1] == "latest":
        print(latest_esr())
    else:
        get(sys.argv[2], sys.argv[3])
