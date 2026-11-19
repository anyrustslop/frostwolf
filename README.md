<p align="center">
  <img src="assets/banner.png" alt="FrostWolf: Firefox, hardened for privacy" width="100%">
</p>

<p align="center">
  <a href="https://github.com/anyrustslop/frostwolf/releases/latest"><img alt="Download" src="https://img.shields.io/github/v/release/anyrustslop/frostwolf?label=download&color=5ec8ff&style=for-the-badge"></a>
  <a href="https://codeberg.org/anyrustslop/frostwolf"><img alt="Source on Codeberg" src="https://img.shields.io/badge/source-Codeberg-2185d0?style=for-the-badge&logo=codeberg&logoColor=white"></a>
  <a href="LICENSE"><img alt="License MPL-2.0" src="https://img.shields.io/badge/license-MPL--2.0-1e3a5c?style=for-the-badge"></a>
</p>

<p align="center">
  <b>FrostWolf</b> is Firefox, built from Mozilla's own source code, with everything that watches you switched off<br>
  and the protections Firefox already has turned all the way up. Same web, same speed, nobody looking over your shoulder.
</p>

> [!WARNING]
> FrostWolf is a young, independent project. It's Firefox underneath, so sites work like in Firefox, but security updates reach you when FrostWolf rebuilds a new Firefox ESR (checked every day) and you install it. It doesn't update itself yet.

<br>

<img src="assets/section-why-privacy.png" alt="Why privacy matters" width="100%">

Your browser sees more of your life than almost anything else you use: what you read, what worries you, your health questions, your money, your politics, who you talk to, where you are. On the normal web, much of that is quietly collected.

- **You are the product.** Trackers embedded in most websites follow you from site to site and build a profile that data brokers buy and sell: interests, habits, income bracket, health conditions, even guesses about your mood.
- **Profiles are used against you.** They decide which ads, prices, news and job offers you see, and they can be leaked, hacked, subpoenaed or sold on, long after you've forgotten the search that created them.
- **"Nothing to hide" isn't the point.** Privacy is what lets you look things up, change your mind and be yourself without being judged, scored or manipulated. When people know they're watched, they hold back.
- **It protects your security too.** Less data collected means less to steal, fewer ways to impersonate you, and fewer scams aimed precisely at you.
- **It's a right.** Privacy is recognised as a fundamental right (Article 12 of the Universal Declaration of Human Rights, Articles 7 and 8 of the EU Charter of Fundamental Rights). Your browser should respect it by default, not hide it in a settings menu.

FrostWolf's answer: collect nothing, block the trackers, look like everyone else, and forget everything when you close it.

<br>

<img src="assets/section-features.png" alt="What's inside" width="100%">

| Feature | What it means for you |
|---|---|
| 🦊 **Real Firefox** | **Firefox ESR**, the long-term-support Firefox that Tor Browser and Mullvad Browser are also built on, compiled from Mozilla's source tarball and verified against Mozilla's SHA-512 checksums. Every site that works in Firefox works here. |
| 🚫 **Nothing phones home** | No telemetry, studies, crash reports, sponsored content or Pocket, and no Mozilla updater or crash reporter compiled in. |
| 🛡️ **Trackers and ads blocked** | **uBlock Origin** installed on first start, tracking protection on *Strict*, Total Cookie Protection, tracking parameters stripped from links, Global Privacy Control. |
| 👤 **You look like everyone else** | Firefox's *resist fingerprinting* mode (the same protection Tor Browser and Mullvad Browser use), letterboxing, WebGL off, no local IP leaks over WebRTC. |
| 🧹 **Forgets you on close** | Cookies, site data, cache and history are wiped when you close FrostWolf (you can change that in Settings > Privacy). |
| 🔒 **Safer connections** | HTTPS-only mode, no prefetching or speculative connections, CRLite certificate checks instead of per-site OCSP pings, punycode shown for look-alike domains, no scripts in PDFs. |
| 🔎 **Private search** | DuckDuckGo by default, with Brave Search, Mojeek and Qwant. Google, Bing, Amazon and eBay are removed. |
| 🧊 **Hardened engine** | The JavaScript engine's optimizing JIT and regular-expression JIT are off (they're where most browser exploits strike), as are WebGPU and SVG-in-font parsing. Every site runs in its own process, and web pages can't make Windows graphics-kernel (win32k) calls. |
| 🪤 **Anti-ClickFix Guard** | A built-in add-on checks everything a site tries to put in your clipboard. Fake-CAPTCHA "press Win+R and paste" commands are blocked, obfuscated ones too (`p^ower^shell`…), with a warning that explains the scam. Your own copying is never touched. |
| 🎣 **Anti-phishing** | Full addresses always shown (no hidden `https://` or `www`), Windows link types that scams abuse (`search-ms:`, `ms-msdt:`…) blocked, uBlock Origin's malware, badware and URLhaus lists on. |
| 🌐 **Encrypted DNS** | DNS over HTTPS through **Quad9** (non-profit, Swiss, blocks known malware domains), plus Encrypted Client Hello where sites support it, so your network sees much less of where you go. |
| 🧩 **Locked-down add-ons** | Only signed add-ons can be installed, and add-ons slipped in by other programs on your PC stay disabled. |
| 💾 **Leaves less on your PC** | Memory-only cache, no form history, no form data or cookies in session-restore files, passwords filled only when you click. |
| 🔕 **Quiet by default** | Notification prompts blocked, no autoplaying sound or video, no push-service connection, no tracking beacons, no motion sensors, gamepads or VR APIs. |
| ❄️ **Ice-blue look** | An original wolf logo and a dark ice-blue built-in theme. |
| 🦀 **Rust inside** | Firefox's Rust components are where much of its speed and safety comes from: **Stylo** styles pages on all your CPU cores in parallel, **WebRender** draws them on your GPU, and Rust's memory safety protects the media parsers, text encoding and URL parsing that handle untrusted data from the web. FrostWolf builds all of them in. (Most of Firefox is still C++; for a browser written entirely in Rust, see FrostWolf's sibling [RustWolf](https://github.com/anyrustslop/rustwolf).) |

### Further than LibreWolf, still made for every day

FrostWolf starts from LibreWolf-style defaults and adds the hardening above on top. Everything was chosen to stay out of your way in normal browsing; the one trade-off is speed in **very heavy web apps** (online editors, 3D, big spreadsheets), which run a little slower without the optimizing JIT. If one feels slow, you can undo any setting in `about:config`:

| If you want… | Set in `about:config` |
|---|---|
| Full JavaScript speed (heavy web apps) | `javascript.options.ion` → `true` |
| Notifications from a site | allow it in the site's padlock menu |
| Videos that start by themselves | `media.autoplay.default` → `0` |
| To keep cookies and logins after closing | Settings > Privacy > uncheck *Delete cookies and site data when FrostWolf is closed* |
| Netflix, Spotify Web and other DRM | Settings > General > *Play DRM-controlled content* |

Every setting is plain text you can review: [`frostwolf.cfg`](build/settings/frostwolf.cfg), [`policies.json`](build/settings/policies.json) and the [Guard add-on](build/guard).

<br>

<img src="assets/section-download.png" alt="Download" width="100%">

Get the latest version from the **[releases page](https://github.com/anyrustslop/frostwolf/releases/latest)**:

| File | What it is |
|---|---|
| `FrostWolf-<version>-win64-setup.exe` | Installer for your Windows user (no admin rights needed). Adds Start menu and desktop shortcuts; uninstall from Settings > Apps. |
| `FrostWolf-<version>-win64-portable.zip` | Portable: unzip anywhere and run `frostwolf.exe`. |
| `SHA256SUMS.txt` | Checksums to verify your download. |

The files aren't code-signed (that costs money every year), so Windows SmartScreen may warn you: click **More info > Run anyway**. To verify a download, compare `Get-FileHash <file>` with `SHA256SUMS.txt`, or check it was built by this repository's workflow with `gh attestation verify <file> --repo anyrustslop/frostwolf`.

<br>

<img src="assets/section-build.png" alt="How it's built" width="100%">

FrostWolf is built entirely in the open by [GitHub Actions](.github/workflows/build.yml), the same way for every release:

1. **Source:** [`fetch_source.py`](build/fetch_source.py) downloads Firefox ESR from `archive.mozilla.org` and refuses it unless its SHA-512 matches Mozilla's published checksum.
2. **Branding:** [`apply_branding.py`](build/branding/apply_branding.py) turns Firefox's unofficial branding into FrostWolf's, with the logo generated in code ([`logo.py`](build/branding/logo.py)) at every size.
3. **Compile:** `./mach build` with [`mozconfig`](build/mozconfig), cross-compiling for Windows x64 on Linux the way Mozilla's own build servers do.
4. **Package:** [`package.py`](build/package.py) adds the settings, policies and theme; [`installer.nsi`](build/installer.nsi) makes the installer; checksums and signed build provenance are published with the release.

Every day, the workflow checks for a new Firefox ESR and publishes a new FrostWolf when Mozilla ships security fixes.

The source code lives on **[Codeberg](https://codeberg.org/anyrustslop/frostwolf)**, a non-profit, community-run home for free software. This GitHub repository is its mirror, used for the builds and downloads.

<br>

<img src="assets/section-librewolf.png" alt="Inspired by LibreWolf" width="100%">

FrostWolf is inspired by **[LibreWolf](https://librewolf.net)**, the community project that showed a hardened, telemetry-free Firefox can be everyone's everyday browser. Its approach (Mozilla's source, privacy-first defaults, uBlock Origin built in, cookies forgotten on close) is the model FrostWolf follows, and many of FrostWolf's settings follow LibreWolf's choices. Thank you to the LibreWolf team and contributors. 🐺

Where FrostWolf differs: it's built on **Firefox ESR** (like Tor Browser and Mullvad Browser) rather than the regular Firefox release, it ships its own ice-blue look and private search engines, and it's a much smaller, younger project. **If you want the mature, proven option, use LibreWolf.** FrostWolf is not affiliated with or endorsed by LibreWolf.

<br>

---

<p align="center">
  <img src="assets/logo.png" alt="" width="64"><br>
  <sub>MPL-2.0, like Firefox. Firefox is a trademark of the Mozilla Foundation; FrostWolf is not affiliated with or endorsed by Mozilla.<br>
  Sibling project: <a href="https://github.com/anyrustslop/rustwolf">RustWolf</a>, the all-Rust browser on the Servo engine.</sub>
</p>
