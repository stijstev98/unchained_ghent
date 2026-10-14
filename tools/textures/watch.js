/* Dev mode texture watcher: keeps assets/textures in step with textures-src/*.ai while the game runs.
   Started by tools/dev-server.js --dev (npm run dev). It
     1. converts every .ai that was saved since the last conversion (a few seconds on the very first start),
     2. then watches textures-src/ and converts a file as soon as Illustrator has finished saving it,
     3. tells the open game pages (through the dev server) to reload when a texture or height map changed.
   Conversion itself is convert.js. */
const fs = require("fs");
const path = require("path");
const C = require("./config");
const { convertKeys, staleKeys, keyOfAi, aiOfKey, describe } = require("./convert");

const SETTLE_MS = 500;    // wait this long after the last change to a file before converting
const STABLE_MS = 250;    // and until the file size has stopped changing for this long
const RETRIES = 3;        // a file that can not be read yet (half saved) is tried again

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* emit({ type: "status" | "converted" | "error", ... }) is called for everything worth showing.
   Returns { close() }. */
function startTextureWatcher(emit) {
  const pending = new Set();
  let timer = null, busy = Promise.resolve(), closed = false;

  const sizeOf = (f) => { try { return fs.statSync(f).size; } catch (e) { return -1; } };
  async function untilStable(file) {
    let last = sizeOf(file);
    for (let i = 0; i < 20; i++) { await sleep(STABLE_MS); const now = sizeOf(file); if (now === last && now > 0) return true; last = now; }
    return false;
  }

  async function run(keys) {
    emit({ type: "status", message: "Converting " + (keys.length === 1 ? keys[0] : keys.length + " textures") + " ..." });
    const changed = [];
    let todo = keys;
    for (let attempt = 0; attempt < RETRIES && todo.length; attempt++) {
      if (attempt) await sleep(1000);
      for (const k of todo) await untilStable(aiOfKey(k));
      const retry = [];
      await convertKeys(todo, (r) => {
        if (r.error) { if (attempt < RETRIES - 1) retry.push(r.key); else emit({ type: "error", key: r.key, message: r.error }); return; }
        for (const n of r.notes) emit({ type: "error", key: r.key, message: n });
        if (r.texture === "written" || r.height === "written" || r.height === "removed") { console.log("[textures] " + describe(r)); changed.push(r.key); }
      });
      todo = retry;
    }
    if (changed.length) emit({ type: "converted", keys: changed });
    else { console.log("[textures] " + keys.length + " file(s) checked, nothing to export (texture and height layers empty)"); emit({ type: "status", message: "No texture changes" }); }
  }

  const enqueue = (keys) => { busy = busy.then(() => closed ? null : run(keys)).catch((e) => emit({ type: "error", message: e.message })); return busy; };

  // 1. catch up
  const stale = staleKeys();
  if (stale.length) { console.log("[textures] " + stale.length + " .ai file(s) saved since the last conversion, converting ..."); enqueue(stale); }
  else console.log("[textures] all textures up to date, watching " + path.relative(C.ROOT, C.SRC_DIR) + "/");

  // 2. watch
  let watcher = null;
  if (fs.existsSync(C.SRC_DIR)) {
    watcher = fs.watch(C.SRC_DIR, { recursive: true }, (event, name) => {
      if (!name || !name.endsWith(".ai") || path.basename(name).startsWith(".")) return;
      const key = keyOfAi(path.join(C.SRC_DIR, name));
      if (!fs.existsSync(aiOfKey(key))) return; // deleted or renamed away
      pending.add(key);
      clearTimeout(timer);
      timer = setTimeout(() => { const keys = [...pending]; pending.clear(); enqueue(keys); }, SETTLE_MS);
    });
    watcher.on("error", (e) => emit({ type: "error", message: "texture watcher: " + e.message }));
  } else console.warn("[textures] " + C.SRC_DIR + " does not exist yet: run npm run textures:make-ai");

  return { close() { closed = true; clearTimeout(timer); if (watcher) watcher.close(); } };
}

module.exports = { startTextureWatcher };
