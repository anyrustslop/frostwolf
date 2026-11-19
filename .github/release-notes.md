> [!WARNING]
> Frostwolf is a new, unofficial Firefox build by a small project. Security fixes reach you when Mozilla releases a new Firefox ESR and Frostwolf rebuilds it (checked daily), usually within a day. Frostwolf doesn't update itself yet: download each new release.

**Frostwolf VERSION** is **Firefox FIREFOXESR**, built from Mozilla's source, rebranded with an ice-blue theme and hardened for privacy.

## Download
- **`Frostwolf-VERSION-win64-setup.exe`**: installs for your Windows user (no admin rights), with Start menu and desktop shortcuts. Uninstall from Settings > Apps.
- **`Frostwolf-VERSION-win64-portable.zip`**: unzip anywhere and run `frostwolf.exe`.

Neither is code-signed, so Windows SmartScreen may warn you: click **More info > Run anyway**. Check the download against `SHA256SUMS.txt`, or verify it was built by this repository's workflow: `gh attestation verify <file> --repo anyrustslop/frostwolf`.

Source code: https://codeberg.org/anyrustslop/frostwolf

Built automatically by GitHub Actions from commit COMMIT.
