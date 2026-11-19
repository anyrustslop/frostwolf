//! FrostWolf's automatic updater (MPL-2.0).
//!
//! `frostwolf-updater check --pid <FrostWolf pid> [--proxy socks5://127.0.0.1:9160] [--delay <s>]`
//!   Started (hidden) by frostwolf.cfg. Asks GitHub for the latest release (through Tor when given
//!   a proxy). If it is newer than this install, downloads the portable zip, refuses it unless its
//!   SHA-256 matches the release's SHA256SUMS.txt, unpacks it next to the install, writes
//!   `update-ready.txt` (FrostWolf then shows a "ready" bar) and hands over to an `apply` copy of
//!   itself that waits for FrostWolf to close.
//!
//! `frostwolf-updater apply --pid <pid> --app <dir> --staged <dir>`
//!   Runs from a temporary copy (so the install folder can be replaced). After FrostWolf (and its
//!   Tor) exits: install folder -> backup, new version -> install folder, backup deleted. Any
//!   failure puts the old version back. Restarts FrostWolf if you chose "Restart now".
//!
//! Safety rules: only https://github.com/anyrustslop/frostwolf releases, only tags vX.Y.Z-N, never
//! an older or equal version, SHA-256 must match, zip entries must stay inside the FrostWolf folder.

#![windows_subsystem = "windows"]

use std::fs;
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::time::Duration;

use sha2::{Digest, Sha256};

const REPO: &str = "anyrustslop/frostwolf";
const MAX_DOWNLOAD: u64 = 600 * 1024 * 1024;

type Res<T> = Result<T, String>;

fn arg(args: &[String], name: &str) -> Option<String> {
    args.iter().position(|a| a == name).and_then(|i| args.get(i + 1)).cloned()
}

fn log(app: &Path, msg: &str) {
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true).open(app.join("update.log")) {
        let _ = writeln!(f, "{msg}");
    }
}

/// "153.7.0-6" -> [153, 7, 0, 6]
fn version_key(v: &str) -> Option<Vec<u64>> {
    let (esr, rev) = v.trim().trim_start_matches('v').rsplit_once('-')?;
    let mut k: Vec<u64> = esr.split('.').map(|p| p.parse().ok()).collect::<Option<_>>()?;
    while k.len() < 3 {
        k.push(0);
    }
    k.push(rev.parse().ok()?);
    Some(k)
}

fn agent(proxy: Option<&str>, redirects: u32) -> Res<ureq::Agent> {
    let mut b = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(60))
        .timeout_read(Duration::from_secs(120))
        .redirects(redirects)
        .user_agent("FrostWolf-updater");
    if let Some(p) = proxy {
        b = b.proxy(ureq::Proxy::new(p).map_err(|e| format!("proxy: {e}"))?);
    }
    Ok(b.build())
}

/// Latest release tag, from GitHub's `releases/latest` redirect (no API rate limits).
fn latest_tag(proxy: Option<&str>) -> Res<String> {
    let url = format!("https://github.com/{REPO}/releases/latest");
    let resp = match agent(proxy, 0)?.get(&url).call() {
        Ok(r) => r,
        Err(ureq::Error::Status(_, r)) => r,
        Err(e) => return Err(format!("checking for updates: {e}")),
    };
    let loc = resp.header("location").ok_or("no redirect from releases/latest")?.to_string();
    let prefix = format!("https://github.com/{REPO}/releases/tag/");
    let tag = loc.strip_prefix(&prefix).ok_or("unexpected release location")?.trim_end_matches('/').to_string();
    if version_key(&tag).is_none() {
        return Err(format!("unexpected tag {tag}"));
    }
    Ok(tag)
}

fn download(agent: &ureq::Agent, url: &str, to: &mut dyn Write, limit: u64) -> Res<String> {
    let resp = agent.get(url).call().map_err(|e| format!("download {url}: {e}"))?;
    let mut reader = resp.into_reader().take(limit + 1);
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1 << 16];
    let mut total = 0u64;
    loop {
        let n = reader.read(&mut buf).map_err(|e| format!("download: {e}"))?;
        if n == 0 {
            break;
        }
        total += n as u64;
        if total > limit {
            return Err("download larger than expected".into());
        }
        hasher.update(&buf[..n]);
        to.write_all(&buf[..n]).map_err(|e| format!("write: {e}"))?;
    }
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

/// Unpacks `FrostWolf/...` entries of the portable zip into `dest` (without the top folder).
fn unpack(zip_path: &Path, dest: &Path) -> Res<()> {
    let file = fs::File::open(zip_path).map_err(|e| e.to_string())?;
    let mut z = zip::ZipArchive::new(file).map_err(|e| format!("zip: {e}"))?;
    for i in 0..z.len() {
        let mut entry = z.by_index(i).map_err(|e| format!("zip: {e}"))?;
        let rel = entry.enclosed_name().ok_or("zip entry outside the archive")?;
        let mut parts = rel.components();
        match parts.next() {
            Some(Component::Normal(top)) if top == "FrostWolf" => {}
            _ => return Err(format!("unexpected zip entry {}", rel.display())),
        }
        let inner: PathBuf = parts.collect();
        if inner.as_os_str().is_empty() || inner.components().any(|c| !matches!(c, Component::Normal(_))) {
            continue;
        }
        let out = dest.join(&inner);
        if entry.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = out.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut f = fs::File::create(&out).map_err(|e| format!("{}: {e}", out.display()))?;
        std::io::copy(&mut entry, &mut f).map_err(|e| e.to_string())?;
    }
    if !dest.join("frostwolf.exe").exists() {
        return Err("frostwolf.exe missing from the update".into());
    }
    Ok(())
}

fn check(args: &[String]) -> Res<()> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let app = exe.parent().ok_or("no install folder")?.to_path_buf();
    let pid = arg(args, "--pid").ok_or("--pid missing")?;
    let proxy = arg(args, "--proxy");
    let delay: u64 = arg(args, "--delay").and_then(|d| d.parse().ok()).unwrap_or(60);
    let current = fs::read_to_string(app.join("frostwolf-version.txt")).map_err(|_| "frostwolf-version.txt missing")?;
    let current = current.trim().to_string();
    let cur_key = version_key(&current).ok_or("bad current version")?;

    // Clean up what an earlier update left behind (temporary installer copies, old backups).
    if let Ok(rd) = fs::read_dir(std::env::temp_dir()) {
        for e in rd.flatten() {
            let n = e.file_name().to_string_lossy().to_string();
            if n.starts_with("frostwolf-updater-") && n.ends_with(".exe") {
                let _ = fs::remove_file(e.path()); // fails harmlessly if one is still running
            }
        }
    }
    if let Some(parent) = app.parent() {
        if let Ok(rd) = fs::read_dir(parent) {
            for e in rd.flatten() {
                let n = e.file_name().to_string_lossy().to_string();
                if n.starts_with("FrostWolf.old-") {
                    let _ = fs::remove_dir_all(e.path());
                }
            }
        }
    }

    // Only one check at a time (FrostWolf opened twice, several profiles...). A lock older than two
    // hours is left over from a crash and is ignored.
    let parent_dir = app.parent().ok_or("no parent folder")?.to_path_buf();
    let lock_path = parent_dir.join("FrostWolf.update.lock");
    let stale = fs::metadata(&lock_path)
        .and_then(|m| m.modified())
        .map(|t| t.elapsed().map(|e| e > Duration::from_secs(2 * 3600)).unwrap_or(true))
        .unwrap_or(true);
    if stale {
        let _ = fs::remove_file(&lock_path);
    }
    if fs::OpenOptions::new().write(true).create_new(true).open(&lock_path).is_err() {
        return Ok(()); // another check is running
    }
    struct Unlock(PathBuf);
    impl Drop for Unlock {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }
    let _unlock = Unlock(lock_path);

    std::thread::sleep(Duration::from_secs(delay)); // let Tor connect first
    let tag = latest_tag(proxy.as_deref())?;
    let ver = tag.trim_start_matches('v').to_string();
    if version_key(&ver).unwrap() <= cur_key {
        log(&app, &format!("up to date ({current}, latest {ver})"));
        return Ok(());
    }
    log(&app, &format!("update {current} -> {ver}"));

    let parent = app.parent().ok_or("no parent folder")?;
    let staged = parent.join(format!("FrostWolf.update-{ver}"));
    let ready = app.join("update-ready.txt");
    if !(staged.join("frostwolf.exe").exists() && fs::read_to_string(&ready).map(|v| v.trim() == ver).unwrap_or(false)) {
        let a = agent(proxy.as_deref(), 5)?;
        let base = format!("https://github.com/{REPO}/releases/download/{tag}");
        let zip_name = format!("FrostWolf-{ver}-win64-portable.zip");
        let mut sums = Vec::new();
        download(&a, &format!("{base}/SHA256SUMS.txt"), &mut sums, 64 * 1024)?;
        let sums = String::from_utf8_lossy(&sums);
        let want = sums
            .lines()
            .find_map(|l| {
                let mut it = l.split_whitespace();
                let h = it.next()?;
                (it.next()?.trim_start_matches('*') == zip_name).then(|| h.to_lowercase())
            })
            .ok_or("update not listed in SHA256SUMS.txt")?;
        let zip_path = parent.join(format!("FrostWolf.update-{ver}.zip"));
        let got = {
            let mut f = fs::File::create(&zip_path).map_err(|e| format!("{}: {e}", zip_path.display()))?;
            download(&a, &format!("{base}/{zip_name}"), &mut f, MAX_DOWNLOAD)?
        };
        if got != want {
            let _ = fs::remove_file(&zip_path);
            return Err(format!("SHA-256 mismatch for {zip_name}: refused"));
        }
        let _ = fs::remove_dir_all(&staged);
        fs::create_dir_all(&staged).map_err(|e| e.to_string())?;
        let r = unpack(&zip_path, &staged);
        let _ = fs::remove_file(&zip_path);
        if let Err(e) = r {
            let _ = fs::remove_dir_all(&staged);
            return Err(e);
        }
        fs::write(&ready, &ver).map_err(|e| e.to_string())?;
        log(&app, &format!("{ver} downloaded, verified (SHA-256 {}...), ready", &got[..16]));
    }

    // Hand over to a temporary copy that installs once FrostWolf has closed.
    let tmp = std::env::temp_dir().join(format!("frostwolf-updater-{pid}.exe"));
    fs::copy(&exe, &tmp).map_err(|e| e.to_string())?;
    std::process::Command::new(&tmp)
        .args(["apply", "--pid", &pid, "--app"])
        .arg(&app)
        .arg("--staged")
        .arg(&staged)
        .spawn()
        .map_err(|e| format!("start installer: {e}"))?;
    Ok(())
}

fn wait_for_exit(pid: u32) {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{OpenProcess, WaitForSingleObject, INFINITE, PROCESS_SYNCHRONIZE};
    unsafe {
        let h = OpenProcess(PROCESS_SYNCHRONIZE, 0, pid);
        if !h.is_null() {
            WaitForSingleObject(h, INFINITE);
            CloseHandle(h);
        }
    }
}

fn apply(args: &[String]) -> Res<()> {
    let pid: u32 = arg(args, "--pid").and_then(|p| p.parse().ok()).ok_or("--pid missing")?;
    let app = PathBuf::from(arg(args, "--app").ok_or("--app missing")?);
    let staged = PathBuf::from(arg(args, "--staged").ok_or("--staged missing")?);
    wait_for_exit(pid);
    let relaunch = app.join("update-relaunch.txt").exists();
    let backup = app.with_file_name(format!(
        "FrostWolf.old-{}",
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
    ));
    // Tor and other FrostWolf processes need a few seconds to exit and release their files.
    let mut moved = false;
    for _ in 0..90 {
        if fs::rename(&app, &backup).is_ok() {
            moved = true;
            break;
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    if !moved {
        return Err("FrostWolf's folder is still in use; the update will be installed next time".into());
    }
    if let Err(e) = fs::rename(&staged, &app) {
        let _ = fs::rename(&backup, &app); // put the old version back
        return Err(format!("installing the update failed ({e}); kept the current version"));
    }
    // Keep the user's own logs/markers clean in the new version.
    let _ = fs::remove_file(app.join("update-ready.txt"));
    log(&app, "update installed");
    // The old version's files can stay locked for a few seconds (Tor shutting down): retry.
    for _ in 0..15 {
        if fs::remove_dir_all(&backup).is_ok() || !backup.exists() {
            break;
        }
        std::thread::sleep(Duration::from_secs(2));
    }
    if relaunch {
        let _ = std::process::Command::new(app.join("frostwolf.exe")).spawn();
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let result = match args.get(1).map(String::as_str) {
        Some("check") => check(&args),
        Some("apply") => apply(&args),
        _ => Err("usage: frostwolf-updater check|apply ...".into()),
    };
    if let Err(e) = result {
        let dir = std::env::current_exe().ok().and_then(|p| p.parent().map(Path::to_path_buf));
        let app = arg(&args, "--app").map(PathBuf::from).or(dir).unwrap_or_default();
        log(&app, &format!("error: {e}"));
        eprintln!("{e}");
        std::process::exit(1);
    }
}
