// Does this text look like a command a scam page wants you to paste into Win+R / PowerShell /
// a terminal? Same rules as RustWolf's guard::looks_like_command (and its tests).
// Normal copied text never matches.
"use strict";

var frostwolfLooksLikeCommand = (function () {
  const STRONG = [
    "powershell", "pwsh", "mshta", "rundll32", "regsvr32", "wscript", "cscript", "certutil", "bitsadmin",
    "invoke-expression", "invoke-webrequest", "invoke-restmethod", "downloadstring", "downloadfile",
    "frombase64string", "-encodedcommand", "start-process", "new-object net.webclient", "add-mppreference",
    "set-mppreference", "schtasks", "forfiles", "conhost", "cmd.exe", "cmd /c", "cmd /k", "%comspec%",
    "msiexec /i http", "msiexec /q", "curl -s", "| iex", "|iex", "| sh", "|sh", "| bash", "|bash",
    "osascript", "chmod +x", "base64 -d", "/dev/tcp/",
    "wmic ", "cmstp", "msbuild", "installutil", "regasm", "regsvcs", "odbcconf", "pcalua", "hh.exe",
    "mavinject", "presentationhost", "syncappvpublishingserver", "scriptrunner", "ftp -s", "tar -xf http",
    "davwwwroot", "@ssl\\", "$(curl", "$(wget",
  ];
  const ALIASES = ["iex", "iwr", "irm", "curl", "wget", "msiexec", "explorer", "cmd", "start", "net", "reg"];

  return function looksLikeCommand(text) {
    if (typeof text !== "string") return false;
    // Undo the obfuscation cmd / PowerShell ignore: carets, quotes, backticks, invisible characters.
    const t = text.toLowerCase().replace(/[\^"`​‌‍⁠﻿­]/g, "").trim();
    if (!t) return false;
    if (STRONG.some((k) => t.includes(k))) return true;
    if (t.startsWith("finger ") && t.includes("@")) return true;   // finger user@host | cmd
    if (t.startsWith("\\\\")) return true;                          // network path runs a remote program
    const first = t.split(/\s+/)[0];
    if (ALIASES.includes(first) && (t.includes("http") || t.includes("\\") || t.includes(" /") || t.includes(" -"))) return true;
    // Typical decoy comment: "# ✅ I am not a robot - Verification ID: 1234".
    if (t.includes("#") && (t.includes("not a robot") || t.includes("verification id") || t.includes("captcha"))) return true;
    return false;
  };
})();
