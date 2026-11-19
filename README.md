# Frostwolf

**Firefox, built from Mozilla's source, rebranded in ice blue and hardened for privacy.**
The ice-blue sibling of [RustWolf](https://github.com/anyrustslop/rustwolf) (the red, all-Rust browser on the Servo engine).

> [!WARNING]
> Frostwolf is a new, unofficial Firefox build by a small project. It is Firefox underneath, so websites work like in Firefox, but security fixes only reach you when Frostwolf rebuilds a new Firefox ESR (checked daily) and you install it. Frostwolf doesn't update itself yet.

- **Source code:** [codeberg.org/anyrustslop/frostwolf](https://codeberg.org/anyrustslop/frostwolf) (main repository)
- **Downloads:** [GitHub releases](https://github.com/anyrustslop/frostwolf/releases) (built by GitHub Actions from the mirror at [github.com/anyrustslop/frostwolf](https://github.com/anyrustslop/frostwolf))

## What it is
- **Firefox ESR** (the long-term-support Firefox that Tor Browser and Mullvad Browser are built on), compiled from Mozilla's official source tarball, verified against Mozilla's SHA-512 checksums.
- **Rust:** everything Firefox has in Rust is built in, from the Stylo CSS engine and WebRender graphics to the media parsers, text encoding and URL parsing. The rest of Firefox (JavaScript engine, DOM, networking, UI) is C++ and JavaScript, as in every Firefox build. For an all-Rust browser, see RustWolf.
- **Look:** an ice-blue wolf logo and a dark ice-blue built-in theme (switch it in Add-ons and themes).

## Privacy and security settings
Applied with Firefox's own configuration system (`frostwolf.cfg`, `policies.json`), so you can review every one of them in [build/settings](build/settings):
- **No telemetry, studies, sponsored content or Pocket**, and no crash reporter or Mozilla updater compiled in.
- **uBlock Origin** is installed on first start.
- **Tracking protection** on "Strict", Total Cookie Protection, tracking parameters stripped from links, Global Privacy Control.
- **Fingerprinting resistance** (Firefox's `resistFingerprinting`, as in Tor Browser and Mullvad Browser), letterboxing, WebGL off, no local IP leaks over WebRTC.
- **Forgets cookies, site data, cache and history when you close it** (like LibreWolf; change it in Settings > Privacy).
- **HTTPS-only mode**, no DNS / link prefetching or speculative connections, CRLite certificate revocation instead of OCSP pings, punycode shown for look-alike domains, no scripts in PDFs.
- **Search:** DuckDuckGo by default; Brave Search, Mojeek and Qwant added; Google, Bing, Amazon and eBay removed.
- **DRM is off** (Netflix, Spotify Web, ...). Turn it on in Settings > General > "Play DRM-controlled content".

## Download
Get `Frostwolf-<version>-win64-setup.exe` (installs for your user, no admin rights) or the portable zip from the [releases](https://github.com/anyrustslop/frostwolf/releases). Windows SmartScreen may warn because the files aren't code-signed: click **More info > Run anyway**. Each release has `SHA256SUMS.txt` and signed build provenance (`gh attestation verify <file> --repo anyrustslop/frostwolf`).

## How it's built
[`.github/workflows/build.yml`](.github/workflows/build.yml) on Ubuntu, cross-compiling for Windows x64 the way Mozilla's own CI does:
1. [`build/fetch_source.py`](build/fetch_source.py) downloads `firefox-<ESR>.source.tar.xz` from archive.mozilla.org and checks its SHA-512.
2. [`build/branding/apply_branding.py`](build/branding/apply_branding.py) creates the Frostwolf branding (logo generated from [`logo.py`](build/branding/logo.py) at every size Firefox needs).
3. `./mach build` with [`build/mozconfig`](build/mozconfig); toolchains (clang, Rust, Windows SDK) come from Mozilla's bootstrap.
4. [`build/package.py`](build/package.py) adds the settings, policies and theme; [`build/installer.nsi`](build/installer.nsi) makes the installer.

A daily run checks for a new Firefox ESR and publishes a new Frostwolf when there is one.

## License
MPL-2.0, like Firefox. Firefox is a trademark of the Mozilla Foundation; Frostwolf is not affiliated with or endorsed by Mozilla.
