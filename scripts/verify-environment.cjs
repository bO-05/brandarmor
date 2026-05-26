const fs = require("fs");
const p = require("path");
const { execSync } = require("child_process");

const IS_WIN = process.platform === "win32";

const results = [];

function jp(f) {
  return JSON.parse(fs.readFileSync(f, "utf-8").replace(/^\uFEFF/, ""));
}

function report(s, l, d) {
  var px = s === "OK" ? "  OK" : s === "MISSING" ? "MISS" : "BLOCK";
  var ln = "[" + px + "] " + l + (d ? " (" + d + ")" : "");
  results.push({ s, l, ln });
  console.log(ln);
}

console.log("=== BrandArmor v4 Environment Diagnostics ===");
console.log("");

report("OK", "Node version: " + process.version);
report("OK", "Platform: " + process.platform);

// Detect npm version Windows-aware:
// On Windows, `npm` is `npm.cmd`. Try npm.cmd first, then npm with shell:true,
// and print the exact caught error code + message so blockers are actionable.
var npmVersion = null;
var npmErrorCode = "UNKNOWN";
var npmErrorMessage = "";

// Try 1: npm.cmd (Windows alias)
if (IS_WIN) {
  try {
    npmVersion = execSync("npm.cmd --version", { encoding: "utf-8", timeout: 10000 }).trim();
  } catch (e) {
    npmErrorCode = e.code || "UNKNOWN";
    npmErrorMessage = e.message ? e.message.substring(0, 200) : "";
  }
}

// Try 2: npm with shell:true (resolves PATHEXT/.cmd on Windows, /bin/sh on Unix)
if (npmVersion === null) {
  try {
    npmVersion = execSync("npm --version", { encoding: "utf-8", shell: true, timeout: 10000 }).trim();
  } catch (e) {
    if (npmErrorCode === "UNKNOWN") {
      npmErrorCode = e.code || "UNKNOWN";
      npmErrorMessage = e.message ? e.message.substring(0, 200) : "";
    }
  }
}

// Try 3: bare (works on Unix, unlikely on Windows without shell)
if (npmVersion === null) {
  try {
    npmVersion = execSync("npm --version", { encoding: "utf-8", timeout: 10000 }).trim();
  } catch (e) {
    if (npmErrorCode === "UNKNOWN") {
      npmErrorCode = e.code || "UNKNOWN";
      npmErrorMessage = e.message ? e.message.substring(0, 200) : "";
    }
  }
}

if (npmVersion !== null) {
  report("OK", "npm version: " + npmVersion);
} else {
  // Always print caught error details so the blocker is actionable
  var errDetail = "error=" + npmErrorCode + " " + npmErrorMessage;
  if (npmErrorCode === "EPERM") {
    report("BLOCKED", "npm version unavailable", "sandbox EPERM on child_process.spawn - " + errDetail);
  } else {
    report("MISSING", "npm version unavailable", errDetail);
  }
}

report("OK", "CWD: " + process.cwd());

var pk = p.resolve(process.cwd(), "package.json");
if (fs.existsSync(pk)) {
  report("OK", "package.json exists");
  try {
    var j = jp(pk);
    for (var s of ["dev", "build", "start", "typecheck", "test"]) {
      report(j.scripts[s] ? "OK" : "MISSING", "script:'" + s + "'=" + (j.scripts[s] || "missing"));
    }
    report(j.scripts["verify:env"] ? "OK" : "MISSING", "script:verify:env=" + (j.scripts["verify:env"] || "missing"));
  } catch (e) {
    report("BLOCKED", "package.json parse failed", e.message.substring(0, 150));
  }
} else {
  report("MISSING", "package.json not found");
}

for (var b of ["next", "vitest", "tsc"]) {
  report(fs.existsSync(p.resolve(process.cwd(), "node_modules", ".bin", b)) ? "OK" : "MISSING", ".bin/" + b);
}

for (var n of ["next", "vitest", "typescript"]) {
  var pj = p.resolve(process.cwd(), "node_modules", n, "package.json");
  if (fs.existsSync(pj)) {
    var j2 = jp(pj);
    report("OK", n + "/pkg", "v" + j2.version);
  } else {
    report("MISSING", n + "/pkg");
  }
}

report(fs.existsSync(p.resolve(process.cwd(), "node_modules", "next", "types.d.ts")) ? "OK" : "MISSING", "next/types.d.ts");

function tR(s) {
  try {
    require(s);
    return { r: true };
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") return { r: false };
    return { r: true, p: e.code };
  }
}

for (var s2 of ["next", "next/server", "next/navigation", "next/link", "typescript", "vitest"]) {
  var t = tR(s2);
  report(t.r ? "OK" : "MISSING", s2 + ":" + (t.r ? (t.p ? "ok(" + t.p + ")" : "ok") : "not found"));
}

report(fs.existsSync(p.resolve(process.cwd(), "next-env.d.ts")) ? "OK" : "MISSING", "next-env.d.ts");
report(fs.existsSync(p.resolve(process.cwd(), ".next", "types", "validator.ts")) ? "OK" : "MISSING", ".next/types/validator.ts");
report(fs.existsSync(p.resolve(process.cwd(), ".next", "types", "routes.d.ts")) ? "OK" : "MISSING", ".next/types/routes.d.ts");

var tcp = p.resolve(process.cwd(), "tsconfig.json");
if (fs.existsSync(tcp)) {
  var tc = jp(tcp);
  report("OK", "tsconfig.json");
  var inc = tc.include || [];
  report(inc.includes(".next/types/**/*.ts") ? "OK" : "MISSING", "tsconfig include .next/types");
  report(inc.includes("next-env.d.ts") ? "OK" : "MISSING", "tsconfig include next-env.d.ts");
} else {
  report("MISSING", "tsconfig.json");
}

var nmc = 0;
try {
  nmc = fs.readdirSync(p.resolve(process.cwd(), "node_modules")).filter(function (f) { return !f.startsWith("."); }).length;
} catch (e) {}
report("OK", "node_modules pkgs: " + nmc);

console.log("");
var oks = results.filter(function (r) { return r.s === "OK"; }).length;
var miss = results.filter(function (r) { return r.s === "MISSING"; }).length;
var blk = results.filter(function (r) { return r.s === "BLOCKED"; }).length;
console.log("---");
console.log("Summary: " + oks + " OK, " + miss + " MISSING, " + blk + " BLOCKED");
process.exit(0);
