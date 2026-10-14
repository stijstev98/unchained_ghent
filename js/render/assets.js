/* Texture files. Every image in assets/textures is listed in assets/textures/manifest.json,
   loaded once before the world is built and then handed out as three.js textures.
   Edit a PNG and reload: nothing else needs to change as long as the file name stays the same.

   Building parts live in assets/textures/<kind>/<style>/<name>.png:
     kind  walls | windows | doors | roofs | details (shutters, anchors, weather ...) | bays (a wall and window baked in one image)
     style regular | modern | medieval | nouveau | specialty
   The loader sorts them into pools (texPool) so a style only has to be a folder: drop a PNG in, list it in manifest.json.
   One-off textures that belong to a single model (landmarks, the crane) are under specialty/.

   Height maps: a greyscale PNG called <name>-height.png next to <name>.png, listed in manifest.json, is picked up
   automatically wherever <name> is used. White = sticks out, black = sunk in, mid grey = flat. It becomes a bump map
   (the renderer turns the grey values into light and shade), so no RGB normal map is needed. */
import { __tram, T } from "../runtime.js";

__tram.TEX_DIR = "assets/textures/";
__tram.IMG = {};      // path (without extension) -> HTMLImageElement
__tram.texFiles = {}; // path -> three.js texture, shared between users of the same file

__tram.TEX_KINDS = ["walls", "windows", "doors", "roofs", "details", "bays"];
__tram.TEX_STYLES = ["regular", "modern", "medieval", "nouveau", "specialty"];
__tram.HEIGHT_SUFFIX = "-height";
__tram.texPools = {}; // kind -> style -> [names]

// How strongly height maps push the light around. Raise a single texture here if its bumps are too faint or too harsh.
__tram.BUMP_SCALE = 1;
__tram.BUMP_SCALES = {}; // texture key -> scale, e.g. { "walls/regular/brick": 2 }

__tram.loadAssets = async function loadAssets() {
  const res = await fetch(__tram.TEX_DIR + "manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not read " + __tram.TEX_DIR + "manifest.json");
  const manifest = await res.json();
  const keys = Object.keys(manifest).filter((k) => !k.startsWith("_"));
  await Promise.all(keys.map((key) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { __tram.IMG[key] = img; resolve(); };
    img.onerror = () => reject(new Error("Missing texture file: " + __tram.TEX_DIR + key + ".png"));
    img.src = __tram.TEX_DIR + key + ".png";
  })));
  __tram.texKeys = keys;
  buildPools(keys);
};

function buildPools(keys) {
  for (const kind of __tram.TEX_KINDS) { __tram.texPools[kind] = {}; for (const s of __tram.TEX_STYLES) __tram.texPools[kind][s] = []; }
  for (const key of keys) {
    const m = key.match(/^([a-z]+)\/([a-z]+)\/([^/]+)$/);
    if (!m || m[3].endsWith(__tram.HEIGHT_SUFFIX) || !__tram.texPools[m[1]] || !__tram.texPools[m[1]][m[2]]) continue;
    __tram.texPools[m[1]][m[2]].push(m[3]);
  }
}

/* The names in a kind/style pool, e.g. texPool("doors", "nouveau").
   withFallback: a style that has none of that kind yet borrows the regular pool (so an unfinished style still renders). */
__tram.texPool = function texPool(kind, style, withFallback) {
  const own = (__tram.texPools[kind] || {})[style || "regular"] || [];
  if (own.length || !withFallback) return own;
  return (__tram.texPools[kind] || {}).regular || [];
};

/* The manifest key for a building part, looked up in the style first, then regular, then specialty.
   A name can pin its own style: "specialty/factory-dark". */
__tram.texResolve = function texResolve(kind, name, style) {
  const pin = name.includes("/") ? name.split("/") : null, n = pin ? pin[1] : name;
  const order = pin ? [pin[0]] : [...new Set([style || "regular", "regular", "specialty"])];
  for (const s of order) { const key = kind + "/" + s + "/" + n; if (__tram.IMG[key]) return key; }
  throw new Error("No " + kind + " texture '" + name + "' for style '" + (style || "regular") + "' (looked in " + order.join(", ") + ")");
};

// first manifest entry that starts with the prefix, e.g. "shops/shopfront-3-" (so renaming a shop keeps working)
__tram.texKey = function texKey(prefix) {
  const k = __tram.texKeys.find((p) => p.startsWith(prefix));
  if (!k) throw new Error("No texture file starting with " + prefix + " in manifest.json");
  return k;
};

__tram.img = function img(key) {
  const i = __tram.IMG[key];
  if (!i) throw new Error("Texture not in manifest.json: " + key);
  return i;
};

/* On a touch device an image of 512 px or more on its longest side is uploaded at half size: a phone screen never shows
   that detail, and it is a quarter of the graphics memory. Anything smaller is returned as is. */
__tram.MOBILE_TEX_MIN = 512;
__tram.mobileImage = function mobileImage(img) {
  if (!__tram.isTouch || Math.max(img.width, img.height) < __tram.MOBILE_TEX_MIN) return img;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width / 2); c.height = Math.round(img.height / 2);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c;
};

// A texture from a file. Tiles by default; pass false for decals and signs that must not repeat.
__tram.fileTex = function fileTex(key, repeat) {
  const id = key + (repeat === false ? "|once" : "");
  if (__tram.texFiles[id]) return __tram.texFiles[id];
  const t = new T.Texture(__tram.mobileImage(__tram.img(key)));
  if (repeat !== false) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = __tram.ANISO; t.needsUpdate = true;
  t.texKey = key; // three r128 textures have no userData; lamTex reads this to find the height map
  return __tram.texFiles[id] = t;
};

/* ---------- height maps ---------- */
// the key of the height map that goes with a texture, or null when there is none (yet)
__tram.heightKey = function heightKey(key) {
  const h = key + __tram.HEIGHT_SUFFIX;
  return __tram.IMG[h] ? h : null;
};
__tram.bumpScaleFor = (key) => (key in __tram.BUMP_SCALES ? __tram.BUMP_SCALES[key] : __tram.BUMP_SCALE);

/* Add bumpMap / bumpScale to material properties when a texture has a height map. Does nothing otherwise.
   key = the colour texture's key; repeat as in fileTex. */
__tram.withBump = function withBump(props, key, repeat) {
  const h = __tram.heightKey(key);
  if (h) { props.bumpMap = __tram.fileTex(h, repeat); props.bumpScale = __tram.bumpScaleFor(key); }
  return props;
};

/* A toon material for a file texture (colour map + its height map if there is one).
   tex comes from fileTex / tile() in js/textures/textures.js. opts are extra material properties. */
__tram.lamTex = function lamTex(tex, colour, opts) {
  const props = Object.assign({ map: tex }, opts || {});
  if (tex.texKey) __tram.withBump(props, tex.texKey, tex.wrapS === T.RepeatWrapping ? undefined : false);
  return __tram.lam(colour == null ? 0xffffff : colour, props);
};
