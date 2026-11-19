
// ---------------------------------------------------------------- welcome guide
// welcome/welcome.html next to frostwolf.exe: a plain local page (no add-on), opened once in the
// first window of a new profile. Clicking a search engine on it makes that engine the default:
// FrostWolf watches for "#setengine=<name>" on exactly this local page (websites can't open
// file:// pages, so they can't use this).
try {
  const welcomeFile = () => {
    const f = Services.dirsvc.get("GreD", Ci.nsIFile);
    f.append("welcome");
    f.append("welcome.html");
    return f;
  };

  // The search service is a plain module now (no Services.search in the autoconfig sandbox).
  const search = () => {
    try {
      return ChromeUtils.importESModule("moz-src:///toolkit/components/search/SearchService.sys.mjs").SearchService;
    } catch (e) {
      return Services.search;
    }
  };

  const setEngine = async (name) => {
    const ss = search();
    await ss.init();
    const engine = ss.getEngineByName(name);
    if (engine) {
      await ss.setDefault(engine, ss.CHANGE_REASON ? ss.CHANGE_REASON.USER : Ci.nsISearchService.CHANGE_REASON_USER);
    }
  };

  Services.obs.addObserver((win) => {
    try {
      const page = welcomeFile();
      if (!page.exists() || !win.gBrowser) {
        return;
      }
      const base = Services.io.newFileURI(page).spec;

      win.gBrowser.addTabsProgressListener({
        onLocationChange(browser, webProgress, request, location) {
          try {
            if (!webProgress.isTopLevel || location.scheme !== "file") {
              return;
            }
            if (location.spec.split(/[?#]/)[0] !== base) {
              return;
            }
            const m = /^setengine=(.+)$/.exec(location.ref || "");
            if (m) {
              setEngine(decodeURIComponent(m[1])).catch(Cu.reportError);
            }
          } catch (e) {
            Cu.reportError(e);
          }
        },
      });

      // First start of a new profile: open the guide (once).
      if (!Services.prefs.getBoolPref("frostwolf.welcome.shown", false)) {
        Services.prefs.setBoolPref("frostwolf.welcome.shown", true);
        Promise.resolve()
          .then(() => search().init())
          .then(() => search().getDefault())
          .then((e) => (e ? e.name : ""), () => "")
          .then((current) => {
            const url = base + (current ? "?engine=" + encodeURIComponent(current) : "");
            win.gBrowser.selectedTab = win.gBrowser.addTab(url, {
              triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
            });
          });
      }
    } catch (e) {
      Cu.reportError(e);
    }
  }, "browser-delayed-startup-finished");
} catch (e) {}
