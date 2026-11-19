"""Decides what the workflow builds. Prints KEY=value lines (for $GITHUB_OUTPUT):
  esr, tor, version, tag, skip, reason

  python next_version.py <event>      event = schedule | push | workflow_dispatch | ...

- Tag / push / manual runs: FIREFOX_VERSION + FROSTWOLF_REVISION from the repository, newest Tor.
- Daily (schedule): newest Firefox ESR and newest Tor for Windows, compared with the latest
  release (its tag says the ESR, its notes say "Tor <version>"). Anything newer -> build:
  same ESR -> next revision (v153.7.0-6 -> v153.7.0-7), new ESR -> revision 1. Nothing newer -> skip.
"""
import json
import os
import re
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "tor"))
import fetch_source  # noqa: E402
import fetch_tor  # noqa: E402


def latest_release(repo):
    headers = {"User-Agent": "frostwolf-build", "Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    try:
        with urllib.request.urlopen(urllib.request.Request(f"https://api.github.com/repos/{repo}/releases/latest", headers=headers), timeout=30) as r:
            rel = json.loads(r.read())
        return rel.get("tag_name") or "", rel.get("body") or ""
    except urllib.error.HTTPError as e:
        if e.code == 404:  # no release yet
            return "", ""
        raise


def decide(event, repo, newest_esr, newest_tor, prev_tag, prev_body, file_esr, file_rev):
    if event != "schedule":
        ver = f"{file_esr.removesuffix('esr')}-{file_rev}"
        return dict(esr=file_esr, tor=newest_tor, version=ver, tag="v" + ver, skip="false", reason="repository version")
    m = re.fullmatch(r"v(\d+(?:\.\d+)*)-(\d+)", prev_tag or "")
    prev_esr, prev_rev = (m.group(1), int(m.group(2))) if m else ("", 0)
    t = re.search(r"\bTor (\d+(?:\.\d+)+)", prev_body or "")
    prev_tor = t.group(1) if t else ""
    esr_num = newest_esr.removesuffix("esr")
    new_esr = esr_num != prev_esr
    new_tor = newest_tor != prev_tor
    rev = 1 if new_esr else prev_rev + 1
    ver = f"{esr_num}-{rev}"
    reasons = []
    if new_esr:
        reasons.append(f"new Firefox ESR {newest_esr} (was {prev_esr or 'none'})")
    if new_tor:
        reasons.append(f"new Tor {newest_tor} (was {prev_tor or 'unknown'})")
    return dict(esr=newest_esr, tor=newest_tor, version=ver, tag="v" + ver,
                skip="false" if reasons else "true", reason="; ".join(reasons) or "up to date")


def main():
    event = sys.argv[1] if len(sys.argv) > 1 else "push"
    repo = os.environ.get("GITHUB_REPOSITORY", "anyrustslop/frostwolf")
    file_esr = open(os.path.join(ROOT, "FIREFOX_VERSION")).read().strip()
    file_rev = open(os.path.join(ROOT, "FROSTWOLF_REVISION")).read().strip()
    newest_tor = fetch_tor.latest_version()
    if event == "schedule":
        newest_esr = fetch_source.latest_esr()
        prev_tag, prev_body = latest_release(repo)
    else:
        newest_esr, prev_tag, prev_body = file_esr, "", ""
    for k, v in decide(event, repo, newest_esr, newest_tor, prev_tag, prev_body, file_esr, file_rev).items():
        print(f"{k}={v}")


if __name__ == "__main__":
    main()
