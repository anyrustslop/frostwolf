// Opens FrostWolf's welcome page the first time FrostWolf starts with a new profile.
"use strict";
browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    browser.tabs.create({ url: browser.runtime.getURL("welcome.html"), active: true });
  }
});
