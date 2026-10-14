#!/usr/bin/env node
/* textures-src/<key>.ai  ->  assets/textures/<key>.png  and  assets/textures/<key>-height.png
   Needs no Illustrator: an .ai saved with "Create PDF Compatible File" (the default) holds a PDF with every layer in
   it, and this renders those layers one at a time. See config.js for the layer names and the workflow.

   What comes out of one .ai
     layer "texture"  ->  <key>.png          exactly as drawn, transparency kept. An EMPTY layer leaves the current PNG alone.
     layer "height"   ->  <key>-height.png   flattened onto 50% grey (so what you did not paint is flat) and turned to greyscale.
                                             An EMPTY layer removes the height PNG again: no bumps.
     "reference" and "notes" are never exported.
   manifest.json is kept in step: new textures get an entry, height maps get a "<key>-height" entry (and lose it again).

   CLI:  node tools/textures/convert.js                 only .ai files saved since the last conversion
         node tools/textures/convert.js --all           everything, again
         node tools/textures/convert.js walls/ doors/regular/oak     only these keys (or key prefixes)  */
const fs = require("fs");
const path = require("path");
const C = require("./config");

let pdfjsPromise = null;
const pdfjs = () => pdfjsPromise || (pdfjsPromise = import(path.join(C.ROOT, "node_modules/pdfjs-dist/legacy/build/pdf.mjs")));
const canvasLib = () => require("@napi-rs/canvas");

/* ---------- small helpers ---------- */
const walkAi = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkAi(p, out); else if (e.name.endsWith(".ai") && !e.name.startsWith(".")) out.push(p);
  }
  return out;
};
const keyOfAi = (file) => path.relative(C.SRC_DIR, file).replace(/\.ai$/, "").split(path.sep).join("/");
const aiOfKey = (key) => path.join(C.SRC_DIR, key + ".ai");
const pngOfKey = (key) => path.join(C.TEX_DIR, key + ".png");

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return fallback; } };
function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

/* ---------- reading the layers ---------- */
/* Which optional-content groups (= Illustrator layers) belong to a layer name: the group itself, its sublayers and the
   layers it sits in. pdf.js gives the layer tree as getOrder(): ids, where an object { order: [...] } right after an id
   holds that id's children. */
function layerIds(cfg, name) {
  const want = name.toLowerCase(), names = new Map();
  for (const [id, g] of cfg) names.set(id, (g.name || "").toLowerCase());
  const parent = new Map(), kids = new Map();
  const visit = (order, owner) => {
    let last = null;
    for (const item of order) {
      if (typeof item === "string") { last = item; if (owner) { parent.set(item, owner); (kids.get(owner) || kids.set(owner, []).get(owner)).push(item); } }
      else if (item && item.order) { visit(item.order, last || owner); }
      else if (Array.isArray(item)) { visit(item, last || owner); }
    }
  };
  visit(cfg.getOrder(), null);
  const out = new Set();
  const down = (id) => { out.add(id); for (const k of kids.get(id) || []) down(k); };
  for (const [id, n] of names) if (n === want) {
    down(id);
    for (let p = parent.get(id); p; p = parent.get(p)) out.add(p);
  }
  return out;
}

// render only the layer called `name`; returns { data: RGBA bytes, width, height } or null when there is no such layer
async function renderLayer(doc, page, name) {
  const cfg = await doc.getOptionalContentConfig();
  const ids = layerIds(cfg, name);
  if (!ids.size) return null;
  for (const [id] of cfg) cfg.setVisibility(id, ids.has(id));
  const vp = page.getViewport({ scale: 1 }), w = Math.round(vp.width), h = Math.round(vp.height);
  const { createCanvas } = canvasLib(), canvas = createCanvas(w, h);
  await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport: vp, background: "rgba(0,0,0,0)", optionalContentConfigPromise: Promise.resolve(cfg) }).promise;
  const img = canvas.getContext("2d").getImageData(0, 0, w, h);
  return { data: img.data, width: w, height: h };
}

const maxAlpha = (px) => { let m = 0; for (let i = 3; i < px.data.length; i += 4) if (px.data[i] > m) m = px.data[i]; return m; };

const encodePng = async (rgba, w, h) => {
  const { createCanvas } = canvasLib(), cv = createCanvas(w, h), g = cv.getContext("2d");
  g.putImageData(new (require("@napi-rs/canvas").ImageData)(new Uint8ClampedArray(rgba), w, h), 0, 0);
  return cv.encode("png");
};

// the height layer on 50% grey, as greyscale (r = g = b), opaque
function flattenHeight(px) {
  const out = new Uint8ClampedArray(px.data.length), flat = C.FLAT_GREY;
  for (let i = 0; i < px.data.length; i += 4) {
    const a = px.data[i + 3] / 255;
    const r = px.data[i] * a + flat * (1 - a), g = px.data[i + 1] * a + flat * (1 - a), b = px.data[i + 2] * a + flat * (1 - a);
    const v = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    out[i] = out[i + 1] = out[i + 2] = v; out[i + 3] = 255;
  }
  return out;
}

/* ---------- manifest ---------- */
function syncManifest(changes) { // changes: { add: {key: note}, remove: [key] }
  const manifest = readJson(C.MANIFEST, null);
  if (!manifest) throw new Error("Could not read " + C.MANIFEST);
  let out = { ...manifest }, dirty = false;
  for (const key of changes.remove || []) if (key in out) { delete out[key]; dirty = true; }
  for (const [key, note] of Object.entries(changes.add || {})) {
    if (key in out) continue;
    dirty = true;
    const base = key.endsWith(C.HEIGHT_SUFFIX) ? key.slice(0, -C.HEIGHT_SUFFIX.length) : null;
    if (base && base in out) { // a height map goes right after its texture
      const next = {};
      for (const k of Object.keys(out)) { next[k] = out[k]; if (k === base) next[key] = note; }
      out = next;
    } else out[key] = note;
  }
  if (dirty) writeAtomic(C.MANIFEST, JSON.stringify(out, null, 1) + "\n");
  return dirty;
}

/* ---------- one texture ---------- */
/* Converts textures-src/<key>.ai. Returns { key, texture, height, notes: [text] } where texture / height say what happened:
   "written" | "kept" (texture layer empty) | "removed" | "none" | "missing-layer". Throws if the .ai can not be read. */
async function convertKey(key) {
  const file = aiOfKey(key);
  if (!fs.existsSync(file)) throw new Error("No such file: " + path.relative(C.ROOT, file));
  const pdf = await pdfjs();
  const data = new Uint8Array(fs.readFileSync(file));
  let doc;
  try {
    doc = await pdf.getDocument({
      data, verbosity: 0, isEvalSupported: false,
      standardFontDataUrl: path.join(C.ROOT, "node_modules/pdfjs-dist/standard_fonts/") ,
      cMapUrl: path.join(C.ROOT, "node_modules/pdfjs-dist/cmaps/"), cMapPacked: true,
    }).promise;
  } catch (e) {
    throw new Error(key + ".ai can not be read as a PDF. In Illustrator's save dialog tick 'Create PDF Compatible File'. (" + e.message + ")");
  }
  const result = { key, texture: "none", height: "none", notes: [] };
  try {
    const page = await doc.getPage(1);
    const manifestAdd = {}, manifestRemove = [];

    // texture layer
    const tex = await renderLayer(doc, page, C.LAYERS.texture);
    if (!tex) { result.texture = "missing-layer"; result.notes.push("no layer named '" + C.LAYERS.texture + "' in " + key + ".ai"); }
    else if (maxAlpha(tex) < C.EMPTY_ALPHA) result.texture = "kept";
    else {
      writeAtomic(pngOfKey(key), await encodePng(tex.data, tex.width, tex.height));
      result.texture = "written";
      manifestAdd[key] = "New texture, made in textures-src/" + key + ".ai (edit that file, not this PNG).";
    }

    // height layer
    const hei = await renderLayer(doc, page, C.LAYERS.height), heightFile = path.join(C.TEX_DIR, key + C.HEIGHT_SUFFIX + ".png");
    if (!hei) { result.height = "missing-layer"; result.notes.push("no layer named '" + C.LAYERS.height + "' in " + key + ".ai"); }
    else if (maxAlpha(hei) < C.EMPTY_ALPHA) {
      if (fs.existsSync(heightFile)) { fs.rmSync(heightFile); result.height = "removed"; } else result.height = "none";
      manifestRemove.push(key + C.HEIGHT_SUFFIX);
    } else {
      writeAtomic(heightFile, await encodePng(flattenHeight(hei), hei.width, hei.height));
      result.height = "written";
      manifestAdd[key + C.HEIGHT_SUFFIX] = "Height map (greyscale bumps) for " + key + ", from the 'height' layer of textures-src/" + key + ".ai. White = out, black = in, 50% grey = flat.";
    }
    // a texture whose PNG does not exist (a brand-new .ai that is still empty) must not get a manifest entry
    if (!fs.existsSync(pngOfKey(key))) delete manifestAdd[key];
    result.manifestChanged = syncManifest({ add: manifestAdd, remove: manifestRemove });
  } finally {
    await doc.destroy();
  }
  return result;
}

/* ---------- many textures, with a memory of what was converted ---------- */
const readState = () => readJson(C.STATE_FILE, {});
const writeState = (s) => writeAtomic(C.STATE_FILE, JSON.stringify(s, null, 1) + "\n");
const stamp = (file) => { const s = fs.statSync(file); return s.mtimeMs + ":" + s.size; };

// keys of .ai files saved since they were last converted (or all, or the ones matching `only`)
function staleKeys({ all, only } = {}) {
  const state = readState();
  return walkAi(C.SRC_DIR).map(keyOfAi).filter((key) => {
    if (only && only.length && !only.some((o) => key === o || key.startsWith(o))) return false;
    return all || !state[key] || state[key].stamp !== stamp(aiOfKey(key));
  });
}

// converts the given keys one after the other; onResult(result | { key, error }) is called after each
async function convertKeys(keys, onResult) {
  const state = readState(), results = [];
  for (const key of keys) {
    let r;
    try {
      r = await convertKey(key);
      state[key] = { stamp: stamp(aiOfKey(key)), texture: r.texture, height: r.height };
    } catch (e) { r = { key, error: e.message }; }
    results.push(r);
    if (onResult) onResult(r);
  }
  writeState(state);
  return results;
}

const describe = (r) => r.error ? "ERROR " + r.key + ": " + r.error
  : r.key + "  texture: " + r.texture + "  height: " + r.height + (r.notes.length ? "  (" + r.notes.join("; ") + ")" : "");

module.exports = { convertKey, convertKeys, staleKeys, keyOfAi, aiOfKey, describe, walkAi };

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2), only = args.filter((a) => !a.startsWith("--")).map((a) => a.replace(/\.ai$/, ""));
    const keys = staleKeys({ all: args.includes("--all") || only.length > 0, only });
    if (!keys.length) { console.log("All textures are up to date."); return; }
    console.log("Converting " + keys.length + " .ai file(s) ...");
    const t0 = Date.now();
    const res = await convertKeys(keys, (r) => { if (r.error || r.texture === "written" || r.height === "written" || r.height === "removed" || r.notes.length) console.log(describe(r)); });
    const written = res.filter((r) => r.texture === "written").length, heights = res.filter((r) => r.height === "written").length, errors = res.filter((r) => r.error).length;
    console.log("Done in " + ((Date.now() - t0) / 1000).toFixed(1) + " s: " + written + " texture PNG(s), " + heights + " height map(s), " + errors + " error(s).");
    if (errors) process.exitCode = 1;
  })().catch((e) => { console.error(e); process.exit(1); });
}
