"""Downloads the official Tor Expert Bundle for Windows x64 from torproject.org and verifies it two
ways before FrostWolf ships it:
  1. its SHA-256 must match the Tor Project's published sha256sums-unsigned-build.txt;
  2. its OpenPGP signature (.asc) must be valid and made by the Tor Browser Developers signing key
     (fingerprint below, the same key Tor Browser downloads are checked with).

  python fetch_tor.py <out dir>   -> <out dir>/tor/tor.exe (+ DLLs), <out dir>/data/geoip, geoip6
                                     <out dir>/VERSION
"""
import hashlib
import io
import os
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request

DIST = "https://dist.torproject.org/torbrowser/"
# Tor Browser Developers (signing key), as published on torproject.org.
SIGNING_KEY = "EF6E286DDA85EA2A4BA7DE684E2C6E8793298290"
UA = {"User-Agent": "frostwolf-build"}


def get(url, timeout=120):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def latest_version():
    html = get(DIST).decode()
    vers = set(re.findall(r'href="(\d+\.\d+(?:\.\d+)*)/"', html))
    for v in sorted(vers, key=lambda v: [int(x) for x in v.split(".")], reverse=True):
        listing = get(DIST + v + "/").decode()
        if f"tor-expert-bundle-windows-x86_64-{v}.tar.gz" in listing:
            return v
    sys.exit("no Windows Tor Expert Bundle found")


def _gpg_path(p):
    """Git for Windows' GnuPG wants /c/... paths (only matters for local test builds on Windows)."""
    if os.name == "nt" and re.match(r"^[A-Za-z]:\\", p):
        return "/" + p[0].lower() + p[2:].replace("\\", "/")
    return p


def verify_signature(data, sig):
    gpg = shutil.which("gpg")
    if not gpg:
        sys.exit("gpg is required to verify Tor's signature")
    # The Tor Project's own key directory (WKD) for torbrowser@torproject.org, which is how the Tor
    # Project tells users to fetch this key; keys.openpgp.org as a fallback.
    try:
        key = get("https://openpgpkey.torproject.org/.well-known/openpgpkey/torproject.org/hu/kounek7zrdx745qydx6p59t9mqjpuhdf")
    except Exception:
        key = get(f"https://keys.openpgp.org/vks/v1/by-fingerprint/{SIGNING_KEY}")
    with tempfile.TemporaryDirectory() as home:
        env = dict(os.environ, GNUPGHOME=_gpg_path(home))
        paths = {n: os.path.join(home, n) for n in ("key.asc", "file", "file.asc")}
        open(paths["key.asc"], "wb").write(key)
        open(paths["file"], "wb").write(data)
        open(paths["file.asc"], "wb").write(sig)
        imp = subprocess.run([gpg, "--batch", "--import", _gpg_path(paths["key.asc"])], env=env, capture_output=True, text=True)
        if imp.returncode != 0:
            sys.exit("could not import Tor's signing key: " + imp.stderr)
        r = subprocess.run([gpg, "--batch", "--status-fd", "1", "--verify", _gpg_path(paths["file.asc"]), _gpg_path(paths["file"])],
                           env=env, capture_output=True, text=True)
        # VALIDSIG <signing (sub)key fpr> ... <primary key fpr>
        ok = any(l.startswith("[GNUPG:] VALIDSIG ") and l.split()[-1].upper() == SIGNING_KEY for l in r.stdout.splitlines())
        if r.returncode != 0 or not ok:
            sys.exit("Tor's OpenPGP signature is NOT valid: refusing to ship it")


def main(out):
    v = latest_version()
    name = f"tor-expert-bundle-windows-x86_64-{v}.tar.gz"
    data = get(DIST + f"{v}/{name}", timeout=600)
    sums = get(DIST + f"{v}/sha256sums-unsigned-build.txt").decode()
    want = next((l.split()[0] for l in sums.splitlines() if l.strip().endswith(name)), None)
    got = hashlib.sha256(data).hexdigest()
    if not want or want.lower() != got:
        sys.exit("Tor bundle SHA-256 mismatch: refusing to ship it")
    verify_signature(data, get(DIST + f"{v}/{name}.asc"))
    print(f"Tor {v}: SHA-256 and Tor Project signature verified")

    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as t:
        for m in t.getmembers():
            parts = m.name.replace("\\", "/").split("/")
            if not m.isfile() or ".." in parts:
                continue
            # tor/tor.exe + DLLs, data/geoip(6); skip pluggable transports and docs
            if parts[0] == "tor" and len(parts) == 2 and parts[1] != "tor-gencert.exe" or parts[0] == "data" and parts[-1] in ("geoip", "geoip6"):
                dest = os.path.join(out, *parts)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with t.extractfile(m) as src, open(dest, "wb") as f:
                    shutil.copyfileobj(src, f)
    if not os.path.exists(os.path.join(out, "tor", "tor.exe")):
        sys.exit("tor.exe missing from the bundle")
    open(os.path.join(out, "VERSION"), "w").write(v + "\n")
    return v


if __name__ == "__main__":
    main(sys.argv[1])
