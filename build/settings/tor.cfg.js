
// ---------------------------------------------------------------- Tor (on by default)
// FrostWolf ships the official Tor (verified at build time) and starts it with the browser: every
// connection, DNS lookup included, goes through Tor, so websites can't see your IP address.
// Each website gets its own Tor circuit. Tor stops when FrostWolf closes.
// The onion button in the toolbar turns Tor on or off (right away, no restart), shows the IP
// address websites see, and gets you a new Tor identity. With Tor off, DNS is encrypted through
// Quad9 instead.
defaultPref("frostwolf.tor.enabled", true);
defaultPref("frostwolf.tor.socks_port", 9160);   // not 9150 / 9050, so it never clashes with Tor Browser or a Tor service

try {
  const tor = {
    proc: null,

    exe() {
      const f = Services.dirsvc.get("GreD", Ci.nsIFile);
      f.append("tor");
      f.append("tor");
      f.append("tor.exe");
      return f;
    },

    installed() {
      return this.exe().exists();
    },

    enabled() {
      return Services.prefs.getBoolPref("frostwolf.tor.enabled", true);
    },

    // Proxy settings live on the default branch, so your own about:config changes still win.
    setPrefs(on) {
      const d = Services.prefs.getDefaultBranch("");
      if (on) {
        // All traffic through Tor's SOCKS port, DNS too; no WebRTC outside the proxy; no DoH (DNS
        // goes through Tor instead).
        d.setIntPref("network.proxy.type", 1);
        d.setStringPref("network.proxy.socks", "127.0.0.1");
        d.setIntPref("network.proxy.socks_port", Services.prefs.getIntPref("frostwolf.tor.socks_port", 9160));
        d.setIntPref("network.proxy.socks_version", 5);
        d.setBoolPref("network.proxy.socks_remote_dns", true);
        d.setBoolPref("network.proxy.socks5.remote_dns", true);
        d.setStringPref("network.proxy.no_proxies_on", "");
        d.setBoolPref("network.proxy.allow_hijacking_localhost", false);
        d.setIntPref("network.trr.mode", 5);
        d.setBoolPref("media.peerconnection.ice.proxy_only", true);
        d.setBoolPref("network.dns.disableIPv6", true);
      } else {
        // Back to FrostWolf's normal settings: system proxy (if any), DNS encrypted through Quad9.
        d.setIntPref("network.proxy.type", 5);
        d.setIntPref("network.trr.mode", 2);
        d.setBoolPref("media.peerconnection.ice.proxy_only", false);
        d.setBoolPref("network.dns.disableIPv6", false);
      }
      // Drop open connections so nothing keeps using the old route.
      try {
        Services.obs.notifyObservers(null, "net:prune-all-connections");
      } catch (e) {}
    },

    start() {
      if (!this.installed() || (this.proc && this.proc.isRunning)) {
        return;
      }
      const app = Services.dirsvc.get("GreD", Ci.nsIFile);
      const geoip = app.clone(); geoip.append("tor"); geoip.append("data"); geoip.append("geoip");
      const geoip6 = app.clone(); geoip6.append("tor"); geoip6.append("data"); geoip6.append("geoip6");
      const dataDir = Services.dirsvc.get("ProfD", Ci.nsIFile);
      dataDir.append("tor-data");
      if (!dataDir.exists()) {
        dataDir.create(Ci.nsIFile.DIRECTORY_TYPE, 0o700);
      }
      const port = Services.prefs.getIntPref("frostwolf.tor.socks_port", 9160);
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
      proc.init(this.exe());
      proc.startHidden = true;
      proc.runwAsync(args, args.length);
      this.proc = proc;
    },

    stop() {
      try {
        if (this.proc && this.proc.isRunning) {
          this.proc.kill();
        }
      } catch (e) {}
      this.proc = null;
    },

    setEnabled(on) {
      Services.prefs.setBoolPref("frostwolf.tor.enabled", on);
      this.setPrefs(on);
      if (on) {
        this.start();
      } else {
        this.stop();
      }
      Services.obs.notifyObservers(null, "frostwolf-tor-changed");
    },

    // New identity: restart Tor (new circuits for everything) and drop open connections.
    newIdentity(win) {
      this.stop();
      win.setTimeout(() => {
        this.start();
        this.setPrefs(true);
        Services.obs.notifyObservers(null, "frostwolf-tor-changed");
      }, 800);
    },
  };

  // ---- country of an IPv4 address, from Tor's own GeoIP file (no web lookup)
  let geoLines = null;
  const countryOf = async (win, ip) => {
    const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip || "");
    if (!m) {
      return "";
    }
    const n = ((+m[1] * 256 + +m[2]) * 256 + +m[3]) * 256 + +m[4];
    if (!geoLines) {
      const f = Services.dirsvc.get("GreD", Ci.nsIFile);
      f.append("tor"); f.append("data"); f.append("geoip");
      if (!f.exists()) {
        return "";
      }
      geoLines = (await win.IOUtils.readUTF8(f.path)).split("\n");
    }
    for (const line of geoLines) {
      if (!line || line[0] === "#") {
        continue;
      }
      const [a, b, cc] = line.split(",");
      if (n >= +a && n <= +b) {
        return (cc || "").trim();
      }
    }
    return "";
  };
  const countryName = (cc) => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) || cc;
    } catch (e) {
      return cc;
    }
  };

  // ---- start with the browser
  Services.obs.addObserver(function frostwolfTor() {
    Services.obs.removeObserver(frostwolfTor, "profile-after-change");
    try {
      if (tor.enabled()) {
        tor.setPrefs(true);
        tor.start();
      }
    } catch (e) {
      Cu.reportError(e);
    }
  }, "profile-after-change");

  // ---- toolbar button + panel
  const ICON = (on) =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="${on ? "#5ec8ff" : "#8a94a6"}" stroke-width="1.3">` +
        `<path d="M8 2.2c-.6 1.2-1.6 1.9-2.6 2.6C3.9 5.9 3 7.4 3 9.3 3 12 5.2 14 8 14s5-2 5-4.7c0-1.9-.9-3.4-2.4-4.5C9.6 4.1 8.6 3.4 8 2.2z"/>` +
        `<path d="M8 5.6c-1.4.9-2.4 2.1-2.4 3.7S6.7 12 8 12s2.4-1.1 2.4-2.7S9.4 6.5 8 5.6z"/><path d="M8 8.6v2.2"/></g>` +
        (on ? "" : `<path d="M2.5 13.5 13.5 2.5" stroke="#ff6b6b" stroke-width="1.6"/>`) +
        `</svg>`
    );
  const XHTML = "http://www.w3.org/1999/xhtml";
  let widgetMade = false;

  const buildPanel = (win) => {
    const doc = win.document;
    const panel = doc.createXULElement("panel");
    panel.id = "frostwolf-tor-panel";
    panel.setAttribute("type", "arrow");
    panel.setAttribute("role", "dialog");
    const box = doc.createElementNS(XHTML, "div");
    box.style.cssText = "width:290px;padding:14px 16px;font:menu;font-size:13px;line-height:1.45;";
    const el = (tag, css, text) => {
      const e = doc.createElementNS(XHTML, tag);
      if (css) e.style.cssText = css;
      if (text) e.textContent = text;
      return e;
    };
    const title = el("div", "font-size:15px;font-weight:700;margin-bottom:2px;", "Tor");
    const state = el("div", "margin-bottom:12px;opacity:.85;");
    const ipLabel = el("div", "font-size:11px;text-transform:uppercase;letter-spacing:.06em;opacity:.65;", "IP address websites see");
    const ip = el("div", "font-size:16px;font-weight:700;font-family:ui-monospace,Consolas,monospace;margin:2px 0;");
    const where = el("div", "opacity:.85;margin-bottom:12px;");
    const btnCss =
      "display:block;width:100%;box-sizing:border-box;margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid rgba(94,200,255,.35);" +
      "font:inherit;font-weight:600;cursor:pointer;";
    const toggle = el("button", btnCss);
    const fresh = el("button", btnCss + "background:transparent;color:inherit;", "New Tor identity");
    const recheck = el("button", btnCss + "background:transparent;color:inherit;", "Check again");
    const hint = el("div", "font-size:11.5px;opacity:.6;margin-top:10px;", "Reload open pages to use the new connection.");
    box.append(title, state, ipLabel, ip, where, toggle, fresh, recheck, hint);
    panel.append(box);
    doc.getElementById("mainPopupSet").append(panel);

    let seq = 0;
    const check = async () => {
      const mine = ++seq;
      const on = tor.enabled();
      ip.textContent = "Checking…";
      where.textContent = "";
      try {
        const res = await win.fetch("https://check.torproject.org/api/ip", { cache: "no-store", credentials: "omit" });
        const j = await res.json();
        if (mine !== seq) return;
        ip.textContent = j.IP || "unknown";
        const cc = await countryOf(win, j.IP).catch(() => "");
        if (mine !== seq) return;
        const place = cc ? countryName(cc) : "";
        where.textContent = j.IsTor
          ? `✓ Tor is working${place ? ` · exit in ${place}` : ""}`
          : `Not through Tor${place ? ` · ${place}` : ""} — websites see your real IP`;
        where.style.color = j.IsTor ? "#3fd28b" : on ? "#ff8a8a" : "";
      } catch (e) {
        if (mine !== seq) return;
        ip.textContent = on ? "Connecting to Tor…" : "Couldn't check";
        where.textContent = on ? "Tor can take a few seconds to start. Try “Check again”." : "";
        where.style.color = "";
      }
    };
    const render = () => {
      const on = tor.enabled();
      if (!tor.installed()) {
        state.textContent = "Tor isn't included in this copy of FrostWolf.";
        toggle.hidden = fresh.hidden = true;
        return;
      }
      state.textContent = on ? "On — websites can't see your real IP address." : "Off — websites see your real IP address.";
      toggle.textContent = on ? "Turn Tor off" : "Turn Tor on";
      toggle.style.background = on ? "transparent" : "#5ec8ff";
      toggle.style.color = on ? "inherit" : "#06121e";
      fresh.hidden = !on;
    };
    toggle.addEventListener("click", () => {
      tor.setEnabled(!tor.enabled());
      render();
      win.setTimeout(check, tor.enabled() ? 4000 : 500);
    });
    fresh.addEventListener("click", () => {
      tor.newIdentity(win);
      ip.textContent = "Getting a new identity…";
      where.textContent = "";
      win.setTimeout(check, 6000);
    });
    recheck.addEventListener("click", check);
    panel.addEventListener("popupshowing", () => {
      render();
      check();
    });
    return panel;
  };

  const makeWidget = (win) => {
    if (widgetMade) return;
    widgetMade = true;
    const { CustomizableUI } = ChromeUtils.importESModule(
      "moz-src:///browser/components/customizableui/CustomizableUI.sys.mjs"
    );
    CustomizableUI.createWidget({
      id: "frostwolf-tor-button",
      type: "button",
      label: "Tor",
      tooltiptext: "Tor: turn on or off, see your IP address",
      defaultArea: CustomizableUI.AREA_NAVBAR,
      removable: true,
      onCreated(node) {
        node.setAttribute("image", ICON(tor.enabled()));
        // (node.ownerGlobal isn't visible from frostwolf.cfg's sandbox; ownerDocument.defaultView is.)
        node.addEventListener("command", () => {
          try {
            const w = node.ownerDocument.defaultView;
            const p = w.document.getElementById("frostwolf-tor-panel") || buildPanel(w);
            if (p.state === "open" || p.state === "showing") {
              p.hidePopup();
            } else {
              p.openPopup(node, "bottomleft topleft", 0, 0, false, false);
            }
          } catch (e) {
            Cu.reportError("FrostWolf Tor button: " + e);
          }
        });
      },
    });
    // First time only: put it just left of the address bar (you can move it later).
    if (!Services.prefs.getBoolPref("frostwolf.tor.button_placed", false)) {
      Services.prefs.setBoolPref("frostwolf.tor.button_placed", true);
      const nav = CustomizableUI.getWidgetIdsInArea(CustomizableUI.AREA_NAVBAR);
      const at = nav.indexOf("urlbar-container");
      CustomizableUI.addWidgetToArea("frostwolf-tor-button", CustomizableUI.AREA_NAVBAR, at >= 0 ? at : undefined);
    }
  };

  Services.obs.addObserver((win) => {
    try {
      makeWidget(win);
    } catch (e) {
      Cu.reportError(e);
    }
  }, "browser-delayed-startup-finished");

  // Keep the icon in every window in sync.
  Services.obs.addObserver(() => {
    const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
    for (const w of wm.getEnumerator("navigator:browser")) {
      const b = w.document.getElementById("frostwolf-tor-button");
      if (b) b.setAttribute("image", ICON(tor.enabled()));
    }
  }, "frostwolf-tor-changed");
} catch (e) {}
