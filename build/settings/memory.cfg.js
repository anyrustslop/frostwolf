
// ---------------------------------------------------------------- free memory when you're away
// When you stop using the computer for a minute, or minimize FrostWolf, it does what about:memory's
// "Minimize memory usage" button does, in every FrostWolf process: collect garbage and give unused
// memory back to Windows. Nothing is closed or unloaded. At most once every 5 minutes.
// Turn it off: about:config > frostwolf.memory.auto_free = false.
defaultPref("frostwolf.memory.auto_free", true);

try {
  let last = 0;
  const free = (why) => {
    if (!Services.prefs.getBoolPref("frostwolf.memory.auto_free", true)) {
      return;
    }
    const now = Date.now();
    if (now - last < 5 * 60 * 1000) {
      return;
    }
    last = now;
    try {
      Cc["@mozilla.org/memory-reporter-manager;1"]
        .getService(Ci.nsIMemoryReporterManager)
        .minimizeMemoryUsage(() => {});
    } catch (e) {
      Cu.reportError("FrostWolf memory (" + why + "): " + e);
    }
  };

  // Away from the computer for 60 seconds.
  Cc["@mozilla.org/widget/useridleservice;1"].getService(Ci.nsIUserIdleService).addIdleObserver(
    { observe(subject, topic) { if (topic === "idle") free("idle"); } },
    60
  );

  // FrostWolf minimized (wait a few seconds, in case you bring it right back).
  Services.obs.addObserver((win) => {
    try {
      win.addEventListener("sizemodechange", () => {
        if (win.windowState !== win.STATE_MINIMIZED) return;
        win.setTimeout(() => {
          if (win.windowState === win.STATE_MINIMIZED) free("minimized");
        }, 5000);
      });
    } catch (e) {
      Cu.reportError(e);
    }
  }, "browser-delayed-startup-finished");
} catch (e) {}
