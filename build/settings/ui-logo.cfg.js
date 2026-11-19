
// ---------------------------------------------------------------- FrostWolf logo, top left
// The ice-wolf at the start of the tab strip, like RustWolf. Added as a user style sheet for the
// browser window (package.py fills in the logo).
try {
  const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  const css = `@-moz-document url("chrome://browser/content/browser.xhtml") {
    #TabsToolbar .toolbar-items::before {
      content: "";
      display: block;
      flex: none;
      width: 28px;
      height: 28px;
      margin: auto 8px auto 12px;
      background: url("data:image/png;base64,@FROSTWOLF_LOGO_PNG@") center / contain no-repeat;
      filter: drop-shadow(0 0 6px rgba(94, 200, 255, 0.35));
    }
  }`;
  const uri = Services.io.newURI("data:text/css;charset=utf-8," + encodeURIComponent(css));
  if (!sss.sheetRegistered(uri, sss.USER_SHEET)) {
    sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
  }
} catch (e) {}
