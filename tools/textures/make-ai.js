#!/usr/bin/env node
/* Makes the Illustrator source files in textures-src/ (see config.js for the layer layout). macOS + Illustrator needed.

     node tools/textures/make-ai.js                       an .ai for every texture in the manifest that has none yet
     node tools/textures/make-ai.js walls/ roofs/         only keys starting with one of these
     node tools/textures/make-ai.js --force               rebuild files that exist already (THROWS AWAY your drawing in them)
     node tools/textures/make-ai.js --new doors/regular/oak 128x256 "Oak front door"
                                                          a blank template for a texture that does not exist yet
                                                          (the game gets the PNG and the manifest line the first time you save it)
   Existing .ai files are never touched unless you pass --force.
   Illustrator is found in /Applications (newest version); override with ILLUSTRATOR_APP=/path/to/Adobe\ Illustrator.app. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const C = require("./config");
const { scanUsage, buildNotes } = require("./notes");

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);

function findIllustrator() {
  if (process.env.ILLUSTRATOR_APP) return process.env.ILLUSTRATOR_APP;
  const apps = fs.readdirSync("/Applications").filter((d) => /^Adobe Illustrator/.test(d)).sort().reverse();
  for (const d of apps) {
    const p = path.join("/Applications", d, "Adobe Illustrator.app");
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Adobe Illustrator not found in /Applications. Set ILLUSTRATOR_APP to its .app path.");
}

// size and transparency of a PNG
async function inspectPng(file) {
  const { createCanvas, loadImage } = require("@napi-rs/canvas");
  const img = await loadImage(file), cv = createCanvas(img.width, img.height), g = cv.getContext("2d");
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, img.width, img.height).data;
  let hasAlpha = false;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) { hasAlpha = true; break; }
  return { width: img.width, height: img.height, hasAlpha };
}

// text size that fits the notes inside the artboard
function fitFontSize(text, w, h) {
  const margin = Math.max(2, Math.min(w, h) * 0.03), area = (w - 2 * margin) * (h - 2 * margin);
  const fs = Math.sqrt((0.55 * area) / (text.length * 0.62));
  return Math.round(Math.max(2.5, Math.min(14, fs)) * 10) / 10;
}

const aiPath = (key) => path.join(C.SRC_DIR, key + ".ai");

// same folders as assets/textures (also the empty ones, so you see where new textures go)
function mirrorFolders(dir = C.TEX_DIR) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    fs.mkdirSync(path.join(C.SRC_DIR, path.relative(C.TEX_DIR, p)), { recursive: true });
    mirrorFolders(p);
  }
}

function runInIllustrator(app, jobs) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "make-ai-"));
  const jobFile = path.join(tmp, "jobs.json"), resultFile = path.join(tmp, "result.txt"), script = path.join(tmp, "run.jsx");
  fs.writeFileSync(jobFile, JSON.stringify(jobs));
  fs.writeFileSync(resultFile, "");
  fs.writeFileSync(script, `var JOB_FILE=${JSON.stringify(jobFile)};\nvar RESULT_FILE=${JSON.stringify(resultFile)};\n` + fs.readFileSync(path.join(__dirname, "make-ai.jsx"), "utf8"));
  execFileSync("osascript", [
    "-e", "with timeout of 7200 seconds",
    "-e", `tell application ${JSON.stringify(app)} to do javascript (POSIX file ${JSON.stringify(script)})`,
    "-e", "end timeout",
  ], { stdio: ["ignore", "pipe", "inherit"] });
  const lines = fs.readFileSync(resultFile, "utf8").split(/\r\n|\r|\n/).filter(Boolean).map((l) => l.split("\t"));
  fs.rmSync(tmp, { recursive: true, force: true });
  return lines;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(C.MANIFEST, "utf8"));
  const keys = Object.keys(manifest).filter((k) => !k.startsWith("_") && !k.endsWith(C.HEIGHT_SUFFIX));
  fs.mkdirSync(C.SRC_DIR, { recursive: true });
  mirrorFolders();
  const usage = scanUsage(keys);
  const jobs = [];

  const nIdx = args.indexOf("--new");
  if (nIdx >= 0) {
    const [key, size, ...desc] = args.slice(nIdx + 1);
    const m = /^(\d+)x(\d+)$/.exec(size || "");
    if (!key || !m) throw new Error('Usage: --new <kind/style/name> <width>x<height> ["what it is"]');
    if (keys.includes(key)) throw new Error(key + " already exists in the manifest. Make it with: make-ai.js " + key);
    if (fs.existsSync(aiPath(key)) && !flag("--force")) throw new Error(aiPath(key) + " exists already");
    const w = +m[1], h = +m[2], description = desc.join(" ").trim() || "New texture.";
    const notes = buildNotes({ key, description, width: w, height: h, hasAlpha: false, usage });
    fs.mkdirSync(path.dirname(aiPath(key)), { recursive: true });
    fs.mkdirSync(path.dirname(path.join(C.TEX_DIR, key)), { recursive: true });
    jobs.push({ key, ai: aiPath(key), png: null, w, h, notes, fs: fitFontSize(notes, w, h) });
  } else {
    const filters = args.filter((a) => !a.startsWith("--"));
    for (const key of keys) {
      if (filters.length && !filters.some((f) => key.startsWith(f))) continue;
      if (fs.existsSync(aiPath(key)) && !flag("--force")) continue;
      const png = path.join(C.TEX_DIR, key + ".png");
      if (!fs.existsSync(png)) { console.warn("skip (no PNG): " + key); continue; }
      const info = await inspectPng(png);
      const notes = buildNotes({ key, description: manifest[key], width: info.width, height: info.height, hasAlpha: info.hasAlpha, usage });
      jobs.push({ key, ai: aiPath(key), png, w: info.width, h: info.height, notes, fs: fitFontSize(notes, info.width, info.height) });
    }
  }

  if (!jobs.length) { console.log("Nothing to make: every texture has an .ai already (folders are mirrored)."); return; }
  const app = findIllustrator();
  console.log("Making " + jobs.length + " .ai file(s) in " + path.relative(C.ROOT, C.SRC_DIR) + "/ with " + path.basename(path.dirname(app)) + " ...");
  let ok = 0, failed = 0;
  const BATCH = 20;
  for (let i = 0; i < jobs.length; i += BATCH) {
    for (const r of runInIllustrator(app, jobs.slice(i, i + BATCH))) {
      if (r[0] === "OK") ok++; else { failed++; console.error("FAILED " + r[1] + ": " + r[2]); }
    }
    console.log("  " + Math.min(i + BATCH, jobs.length) + " / " + jobs.length);
  }
  console.log("Done: " + ok + " made, " + failed + " failed.");
  if (failed) process.exitCode = 1;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
