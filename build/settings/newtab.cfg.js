
// ---------------------------------------------------------------- new tab look
// Bigger FrostWolf logo and name on the new tab / home page, on a frosty ice-blue background.
// A user style sheet, so it survives Firefox updates to the new tab page as long as the class
// names stay the same (if they change, the page just falls back to the normal look).
try {
  const sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
  const snow = encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">' +
      '<g fill="#cdeeff">' +
      '<circle cx="18" cy="30" r="1.2" opacity=".35"/><circle cx="96" cy="12" r="0.8" opacity=".25"/>' +
      '<circle cx="170" cy="54" r="1.5" opacity=".3"/><circle cx="220" cy="140" r="1" opacity=".25"/>' +
      '<circle cx="60" cy="120" r="0.9" opacity=".3"/><circle cx="130" cy="180" r="1.3" opacity=".3"/>' +
      '<circle cx="30" cy="210" r="1" opacity=".2"/><circle cx="200" cy="222" r="0.8" opacity=".3"/>' +
      '<circle cx="110" cy="90" r="0.7" opacity=".2"/></g></svg>'
  );
  const css = `@-moz-document url-prefix("about:newtab"), url-prefix("about:home") {
    body {
      --newtab-background-color: #0a1420 !important;
      --newtab-background-color-secondary: #13263a !important;
      --newtab-background-card: rgba(19, 38, 58, 0.78) !important;
      --newtab-primary-action-background: #5ec8ff !important;
      background-color: #0a1420 !important;
      background-image:
        radial-gradient(1100px 520px at 50% -8%, rgba(94, 200, 255, 0.30), transparent 62%),
        radial-gradient(800px 520px at 105% 105%, rgba(37, 99, 190, 0.32), transparent 60%),
        radial-gradient(700px 460px at -5% 100%, rgba(120, 220, 255, 0.14), transparent 60%),
        url("data:image/svg+xml,${snow}"),
        linear-gradient(180deg, #0d1b2c 0%, #08111c 100%) !important;
      background-size: auto, auto, auto, 240px 240px, auto !important;
      background-repeat: no-repeat, no-repeat, no-repeat, repeat, no-repeat !important;
      background-attachment: fixed !important;
    }
    .logo-and-wordmark {
      gap: 22px;
      margin-block-end: 44px !important;
    }
    .logo-and-wordmark .logo {
      width: 132px !important;
      height: 132px !important;
      background: url("chrome://branding/content/about-logo@2x.png") center / contain no-repeat !important;
      filter: drop-shadow(0 0 22px rgba(94, 200, 255, 0.45));
    }
    .logo-and-wordmark .wordmark {
      display: inline-flex !important;
      align-items: center;
      width: auto !important;
      height: 132px !important;
      margin-inline-start: 0 !important;
      background: none !important;
    }
    .logo-and-wordmark .wordmark::before {
      content: "FrostWolf";
      font: 800 72px/1 system-ui, "Segoe UI", sans-serif;
      letter-spacing: -1.5px;
      background: linear-gradient(180deg, #f2fbff 0%, #8fdcff 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      filter: drop-shadow(0 2px 14px rgba(94, 200, 255, 0.35));
    }
    @media (max-width: 609px) {
      .logo-and-wordmark .logo { width: 88px !important; height: 88px !important; }
      .logo-and-wordmark .wordmark { height: 88px !important; }
      .logo-and-wordmark .wordmark::before { font-size: 46px; }
    }
    .search-wrapper .search-handoff-button,
    .search-wrapper .search-inner-wrapper input {
      border-radius: 999px !important;
      background-color: rgba(19, 38, 58, 0.85) !important;
      box-shadow: 0 0 0 1px rgba(94, 200, 255, 0.28), 0 8px 30px rgba(0, 0, 0, 0.35) !important;
    }
  }`;
  const uri = Services.io.newURI("data:text/css;charset=utf-8," + encodeURIComponent(css));
  if (!sss.sheetRegistered(uri, sss.USER_SHEET)) {
    sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
  }
} catch (e) {}
