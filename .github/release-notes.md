> [!WARNING]
> FrostWolf is a new, unofficial Firefox build by a small project. Security fixes reach you when Mozilla releases a new Firefox ESR or the Tor Project releases a new Tor, and FrostWolf rebuilds (checked daily). FrostWolf doesn't update itself yet: download each new release.

**FrostWolf VERSION** is **Firefox FIREFOXESR** with **Tor TORVERSION** built in, compiled from Mozilla's source, rebranded with an ice-blue theme and hardened for privacy.

Why this release: BUILDREASON.

## Download
- **`FrostWolf-VERSION-win64-setup.exe`**: installs for your Windows user (no admin rights), with Start menu and desktop shortcuts. Uninstall from Settings > Apps.
- **`FrostWolf-VERSION-win64-portable.zip`**: unzip anywhere and run `frostwolf.exe`.

Neither is code-signed, so Windows SmartScreen may warn you: click **More info > Run anyway**. Check the download against `SHA256SUMS.txt`, or verify it was built by this repository's workflow: `gh attestation verify <file> --repo anyrustslop/frostwolf`.

Tor comes from torproject.org and is only included if its checksum and the Tor Project's signature are valid.

Source code: https://codeberg.org/anyrustslop/frostwolf

Built automatically by GitHub Actions from commit COMMIT.
