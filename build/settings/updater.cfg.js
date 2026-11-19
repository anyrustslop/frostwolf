
// ---------------------------------------------------------------- automatic updates
// frostwolf-updater.exe (Rust, next to frostwolf.exe) checks for a newer FrostWolf a minute after
// start, through Tor when Tor is on, downloads and verifies it in the background, and installs it
// when FrostWolf closes. FrostWolf shows a bar when an update is ready.
// Turn it off: about:config > frostwolf.update.enabled = false.
defaultPref("frostwolf.update.enabled", true);

try {
  const appFile = (name) => {
    const f = Services.dirsvc.get("GreD", Ci.nsIFile);
    f.append(name);
    return f;
  };

  Services.obs.addObserver(function frostwolfUpdater() {
    Services.obs.removeObserver(frostwolfUpdater, "final-ui-startup");
    try {
      if (!Services.prefs.getBoolPref("frostwolf.update.enabled", true)) {
        return;
      }
      const exe = appFile("frostwolf-updater.exe");
      if (!exe.exists()) {
        return;
      }
      const relaunch = appFile("update-relaunch.txt");
      if (relaunch.exists()) {
        relaunch.remove(false);
      }
      const args = ["check", "--pid", String(Services.appinfo.processID)];
      if (Services.prefs.getBoolPref("frostwolf.tor.enabled", true) && appFile("tor").exists()) {
        args.push("--proxy", "socks5://127.0.0.1:" + Services.prefs.getIntPref("frostwolf.tor.socks_port", 9160));
      }
      const proc = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
      proc.init(exe);
      proc.startHidden = true;
      proc.runwAsync(args, args.length);
    } catch (e) {
      Cu.reportError(e);
    }
  }, "final-ui-startup");

  // "Update ready" bar in each browser window.
  Services.obs.addObserver((win) => {
    try {
      const show = () => {
        const ready = appFile("update-ready.txt");
        if (!ready.exists() || win.closed || !win.gNotificationBox) {
          return false;
        }
        win.IOUtils.readUTF8(ready.path).then((text) => notify(text.trim().replace(/[^0-9.\-]/g, "")), Cu.reportError);
        return true;
      };
      const notify = (version) => {
        const box = win.gNotificationBox;
        if (win.closed || box.getNotificationWithValue("frostwolf-update")) {
          return;
        }
        box.appendNotification("frostwolf-update", {
          label: `FrostWolf ${version} is ready. It will be installed when you close FrostWolf.`,
          priority: box.PRIORITY_INFO_HIGH,
        }, [{
          label: "Restart now",
          accessKey: "R",
          callback: () => {
            try {
              const f = appFile("update-relaunch.txt");
              const out = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
              out.init(f, 0x02 | 0x08 | 0x20, 0o644, 0);
              out.write("1", 1);
              out.close();
            } catch (e) {}
            Services.startup.quit(Ci.nsIAppStartup.eAttemptQuit);
          },
        }]);
        return true;
      };
      if (!show()) {
        const timer = win.setInterval(() => { if (show()) win.clearInterval(timer); }, 60 * 1000);
      }
    } catch (e) {
      Cu.reportError(e);
    }
  }, "browser-delayed-startup-finished");
} catch (e) {}
