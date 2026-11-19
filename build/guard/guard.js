// FrostWolf Guard: every way a page can write to your clipboard goes through this check first.
// Runs as a content script and wraps the page's own clipboard functions through Firefox's
// "Xray" API (exportFunction), so the page can't get around it and site CSP doesn't block it.
// Copying you do yourself (Ctrl+C, right-click > Copy) doesn't pass through page code and is never
// touched.
"use strict";

(function () {
  const page = window.wrappedJSObject;
  if (!page) return;
  const looks = frostwolfLooksLikeCommand;

  let shown = false;
  function warn() {
    if (shown || window.top !== window) {
      try { window.top.postMessage({ frostwolfGuard: true }, "*"); } catch (e) {}
      if (window.top !== window) return;
    }
    shown = true;
    const show = () => {
      const box = document.createElement("div");
      box.setAttribute("role", "alert");
      box.style.cssText = [
        "position:fixed", "z-index:2147483647", "left:50%", "top:16px", "transform:translateX(-50%)",
        "max-width:640px", "width:calc(100% - 32px)", "box-sizing:border-box", "padding:16px 20px",
        "background:#2a0d12", "color:#ffe9ec", "border:2px solid #ff4d5e", "border-radius:12px",
        "font:15px/1.45 system-ui,Segoe UI,sans-serif", "box-shadow:0 8px 32px rgba(0,0,0,.5)",
      ].join(";");
      const h = document.createElement("div");
      h.style.cssText = "font-weight:700;font-size:16px;margin-bottom:6px";
      h.textContent = "FrostWolf blocked a scam attempt";
      const p = document.createElement("div");
      p.textContent = "This page tried to put a command in your clipboard. If it asks you to press Win+R, " +
        "open PowerShell or a terminal and paste something to \"verify you're human\" or \"fix\" a problem, " +
        "it's a scam that installs malware. Don't paste anything; close this page.";
      const b = document.createElement("button");
      b.textContent = "OK";
      b.style.cssText = "margin-top:10px;padding:6px 18px;border-radius:8px;border:0;background:#ff4d5e;color:#fff;font-weight:600;cursor:pointer";
      b.addEventListener("click", () => box.remove());
      box.append(h, p, b);
      (document.body || document.documentElement).append(box);
    };
    if (document.body) show(); else document.addEventListener("DOMContentLoaded", show, { once: true });
  }
  if (window.top === window) {
    window.addEventListener("message", (e) => { if (e.data && e.data.frostwolfGuard === true) warn(); });
  }

  const rejected = () => new page.Promise(exportFunction((resolve, reject) => {
    reject(new page.DOMException("Blocked by FrostWolf: this looks like a scam command", "NotAllowedError"));
  }, page));

  // navigator.clipboard.writeText(text)
  try {
    const CP = page.Clipboard && page.Clipboard.prototype;
    if (CP && CP.writeText) {
      const writeText = CP.writeText;
      exportFunction(function (text) {
        if (looks(String(text))) { warn(); return rejected(); }
        return writeText.call(this, text);
      }, CP, { defineAs: "writeText" });
    }
    // navigator.clipboard.write([ClipboardItem]): check every text it carries before writing.
    if (CP && CP.write) {
      const write = CP.write;
      exportFunction(function (items) {
        const self = this;
        return new page.Promise(exportFunction((resolve, reject) => {
          (async () => {
            const texts = [];
            for (const item of Array.from(items || [])) {
              for (const type of Array.from(item.types || [])) {
                if (/^text\//i.test(type)) {
                  try { texts.push(await (await item.getType(type)).text()); } catch (e) {}
                }
              }
            }
            return texts;
          })().then((texts) => {
            if (texts.some((t) => looks(t))) {
              warn();
              reject(new page.DOMException("Blocked by FrostWolf: this looks like a scam command", "NotAllowedError"));
            } else {
              write.call(self, items).then(resolve, reject);
            }
          }, reject);
        }, page));
      }, CP, { defineAs: "write" });
    }
  } catch (e) {}

  // Copy-event handlers: event.clipboardData.setData("text/plain", ...)
  try {
    const DT = page.DataTransfer && page.DataTransfer.prototype;
    if (DT && DT.setData) {
      const setData = DT.setData;
      exportFunction(function (type, data) {
        if (/text/i.test(String(type)) && looks(String(data))) { warn(); return; }
        return setData.call(this, type, data);
      }, DT, { defineAs: "setData" });
    }
  } catch (e) {}

  // document.execCommand("copy") on a (usually hidden) text box or selection.
  try {
    const D = page.Document && page.Document.prototype;
    if (D && D.execCommand) {
      const execCommand = D.execCommand;
      exportFunction(function (cmd, ...rest) {
        if (/^(copy|cut)$/i.test(String(cmd))) {
          let text = "";
          try {
            const el = this.activeElement;
            if (el && typeof el.value === "string" && typeof el.selectionStart === "number") {
              text = el.value.substring(el.selectionStart, el.selectionEnd);
            }
            if (!text) text = String(this.getSelection());
          } catch (e) {}
          if (looks(text)) { warn(); return false; }
        }
        return execCommand.call(this, cmd, ...rest);
      }, D, { defineAs: "execCommand" });
    }
  } catch (e) {}
})();
