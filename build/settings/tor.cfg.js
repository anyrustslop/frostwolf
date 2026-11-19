
// ---------------------------------------------------------------- Tor (on by default)
// FrostWolf ships the official Tor (verified at build time) and starts it with the browser: every
// connection, DNS lookup included, goes through Tor, so websites can't see your IP address.
// Each website gets its own Tor circuit. Tor stops when FrostWolf closes.
// Turn it off: about:config > frostwolf.tor.enabled = false, then restart FrostWolf (your
// connection then uses encrypted DNS through Quad9 instead).
defaultPref("frostwolf.tor.enabled", true);
defaultPref("frostwolf.tor.socks_port", 9160);   // not 9150 / 9050, so it never clashes with Tor Browser or a Tor service

try {
  const startTor = () => {
    const prefs = Services.prefs;
    if (!prefs.getBoolPref("frostwolf.tor.enabled", true)) {
      return;
    }
    const port = prefs.getIntPref("frostwolf.tor.socks_port", 9160);
    const d = prefs.getDefaultBranch("");
    // All traffic through Tor's SOCKS port, DNS too; no WebRTC outside the proxy; no DoH (DNS goes
    // through Tor instead).
    d.setIntPref("network.proxy.type", 1);
    d.setStringPref("network.proxy.socks", "127.0.0.1");
    d.setIntPref("network.proxy.socks_port", port);
    d.setIntPref("network.proxy.socks_version", 5);
    d.setBoolPref("network.proxy.socks_remote_dns", true);
    d.setBoolPref("network.proxy.socks5.remote_dns", true);
    d.setStringPref("network.proxy.no_proxies_on", "");
    d.setBoolPref("network.proxy.allow_hijacking_localhost", false);
    d.setIntPref("network.trr.mode", 5);
    d.setBoolPref("media.peerconnection.ice.proxy_only", true);
    d.setBoolPref("network.dns.disableIPv6", true);

    const app = Services.dirsvc.get("GreD", Ci.nsIFile);
    const exe = app.clone();
    exe.append("tor");
    exe.append("tor");
    exe.append("tor.exe");
    if (!exe.exists()) {
      return;
    }
    const geoip = app.clone(); geoip.append("tor"); geoip.append("data"); geoip.append("geoip");
    const geoip6 = app.clone(); geoip6.append("tor"); geoip6.append("data"); geoip6.append("geoip6");
    const dataDir = Services.dirsvc.get("ProfD", Ci.nsIFile);
    dataDir.append("tor-data");
    if (!dataDir.exists()) {
      dataDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
    }
    const args = [
      "--ignore-missing-torrc", "-f", "frostwolf-no-torrc",
      "--SocksPort", `127.0.0.1:${port} IsolateDestAddr IsolateDestPort`,
      "--DataDirectory", dataDir.path,
      "--GeoIPFile", geoip.path,
      "--GeoIPv6File", geoip6.path,
      "--ClientOnly", "1",
      "--AvoidDiskWrites", "1",
      "--Log", "notice stderr",
      // Tor exits by itself when FrostWolf (this process) does.
      "--__OwningControllerProcess", String(Services.appinfo.processID),
    ];
    const proc = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
    proc.init(exe);
    proc.startHidden = true;
    proc.runwAsync(args, args.length);
  };
  // After your own settings are loaded, before any window opens.
  Services.obs.addObserver(function frostwolfTor() {
    Services.obs.removeObserver(frostwolfTor, "profile-after-change");
    try { startTor(); } catch (e) { Cu.reportError(e); }
  }, "profile-after-change");
} catch (e) {}
