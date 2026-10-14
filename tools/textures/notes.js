/* The text on the hidden "notes" layer of every .ai: what the texture is, where it appears in the game and what the
   rules are (tiling, transparency, tint). Built from three sources, so it stays true when the code changes:
     - the description in assets/textures/manifest.json
     - GROUPS below (what a kind of texture is, in plain words)
     - a scan of the .mtl files and the js/ folder for who actually uses the texture */
const fs = require("fs");
const path = require("path");
const C = require("./config");

/* ---------- usage scan ---------- */
const walk = (dir, ext, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(C.ROOT, p).split(path.sep).join("/");

/* usage = { models: key -> [model names], code: key -> [js files] }, for every key in the list.
   Code usage comes from: the key written out in a file, a key prefix that a file extends ("shops/shopfront-" + i),
   and the __tram.xxxTex names that js/textures/textures.js gives to a texture (then every file that uses __tram.xxxTex). */
function scanUsage(keys) {
  const models = {}, code = {};
  const add = (map, key, v) => { (map[key] = map[key] || new Set()).add(v); };

  for (const mtl of walk(C.MODELS_DIR, ".mtl")) {
    const model = path.relative(C.MODELS_DIR, mtl).replace(/\.mtl$/, "").split(path.sep).join("/");
    for (const line of fs.readFileSync(mtl, "utf8").split("\n")) {
      const m = line.trim().match(/^map_Kd\s+(.+)$/);
      if (!m) continue;
      const p = m[1].trim().replace(/\\/g, "/").replace(/\.[a-z]+$/i, ""), i = p.lastIndexOf("textures/");
      if (i >= 0) add(models, p.slice(i + 9), model);
    }
  }

  // comments are left out, so an example in a comment does not count as a use
  const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const files = walk(C.JS_DIR, ".js").map((f) => ({ file: rel(f), text: stripComments(fs.readFileSync(f, "utf8")) }));
  const registry = "js/textures/textures.js";
  const vars = {}; // key -> __tram name
  for (const f of files) for (const m of f.text.matchAll(/__tram\.(\w+)\s*=\s*(?:tile|once)\("([^"]+)"\)/g)) vars[m[2]] = m[1];
  const prefixes = new Set();
  for (const f of files) {
    for (const m of f.text.matchAll(/["'`]([a-z]+\/[a-z0-9-]*)["'`]\s*\+/g)) prefixes.add(m[1]);
    for (const m of f.text.matchAll(/`([a-z]+\/[a-z0-9-]*)\$\{/g)) prefixes.add(m[1]);
  }
  // a file that builds a name from a prefix ("shops/shopfront-" + i) usually does so inside __tram.shopMat = ...: the files
  // that call that are the real users, so name those instead
  const consumers = (f, prefix) => {
    const lines = f.text.split("\n"), at = lines.findIndex((l) => l.includes(prefix));
    for (let i = at; i >= Math.max(0, at - 8); i--) {
      const m = lines[i].match(/__tram\.(\w+)\s*=/);
      if (m) return files.filter((g) => g.file !== f.file && new RegExp("__tram\\." + m[1] + "\\b").test(g.text)).map((g) => g.file);
    }
    return [];
  };
  for (const key of keys) {
    for (const f of files) {
      if (f.text.includes('"' + key + '"')) add(code, key, f.file);
      for (const p of prefixes) if (key.startsWith(p) && f.text.includes(p)) { const users = consumers(f, p); for (const u of users.length ? users : [f.file]) add(code, key, u); }
      if (vars[key] && f.file !== registry && new RegExp("__tram\\." + vars[key] + "\\b").test(f.text)) add(code, key, f.file);
    }
    // the registry alone says nothing useful when another file also mentions the texture
    if (code[key] && code[key].size > 1) code[key].delete(registry);
  }
  const out = { models: {}, code: {} };
  for (const k of Object.keys(models)) out.models[k] = [...models[k]].sort();
  for (const k of Object.keys(code)) out.code[k] = [...code[k]].sort();
  return out;
}

/* ---------- what each kind of texture is ---------- */
const HERE = "js/textures/facade.js";
const GROUPS = [
  { re: /^walls\//, tile: true, noModels: true, code: [HERE],
    where: "The wall of every house bay, also side walls, gable ends and dormers. One tile = one bay, 3.0 m wide x 3.2 m tall.",
    rules: "Must tile seamlessly left-right and up-down. Keep it a NEUTRAL light grey (about 90% white): the game multiplies it with the facade colour (" + HERE + ", FACADES). Opaque." },
  { re: /^windows\//, noModels: true, code: [HERE],
    where: "Laid over the tinted wall of one bay (3.0 x 3.2 m) on every window floor of a house. The front door model stands over the ground-floor one. Chosen per facade in " + HERE + " (FACADES, win).",
    rules: "Transparent PNG: whatever is not window stays transparent so the wall shows through. Window centred in the bay." },
  { re: /^doors\//, noModels: true, code: [HERE],
    where: "The leaf of a house front door (assets/models/buildings/door.obj), one image stretched over the leaf. Picked at random from the style's doors, or set per facade (FACADES, door). Until a door texture exists, doors are plain painted colours.",
    rules: "Opaque. Draw the whole door leaf edge to edge." },
  { re: /^details\/.*shutters/, noModels: true, code: [HERE],
    where: "Painted shutters either side of the window, over the wall of one bay (3.0 x 3.2 m). Chosen per facade (FACADES, shut).",
    rules: "Transparent PNG, shutters only. Must line up with the window texture of the same style." },
  { re: /^details\/.*anchors/, noModels: true, code: [HERE],
    where: "Wrought-iron wall anchors over the wall of one bay (3.0 x 3.2 m), on some old brick facades (FACADES, anch).",
    rules: "Transparent PNG, anchors only." },
  { re: /^details\/.*spek-bands/, noModels: true, code: [HERE],
    where: "White stone bands in brick walls (spekbanden), over the wall of one bay (3.0 x 3.2 m), on some facades (FACADES, spek).",
    rules: "Transparent PNG, bands only. Bands must run across the whole tile width so bays join up." },
  { re: /^details\/.*weather/, noModels: true, code: [HERE],
    where: "Soft stain under every floor and rain streaks, drawn on EVERY facade as the top layer.",
    rules: "Transparent PNG, subtle. Must tile seamlessly left-right and up-down when bays are stacked." },
  { re: /^details\/.*grime/, noModels: true, code: [HERE],
    where: "Extra dirt on facades in the student quarter (Overpoort-style streets) only.",
    rules: "Transparent PNG, subtle. Tiles seamlessly like the weather layer." },
  { re: /^roofs\//, tile: true, code: ["js/render/materials.js"],
    where: "Roof surface of pitched roofs and dormers on houses, and on some landmarks. A material is picked per house style with roofMat() in js/render/materials.js.",
    rules: "Must tile seamlessly. Opaque. Kept light enough that the toon shading still reads." },
  { re: /^bays\//, tile: true,
    where: "One bay (3.0 x 3.2 m) of a modern block or a tower, wall and windows in ONE image. Repeated across the front and up the floors.",
    rules: "Left and right edges must line up with the next bay, top and bottom with the floor above. Opaque." },
  { re: /^specialty\/landmarks\//,
    where: "Textures of the landmark models (Belfort, Gravensteen, Vooruit, station ...). Which model uses it is listed below. Many are neutral grey and tinted per landmark.",
    rules: "Check the UV layout in the model before changing proportions." },
  { re: /^specialty\//,
    where: "A one-off texture that belongs to a single model.", rules: "Alpha is cut at 40%: pixels below that are not drawn." },
  { re: /^surfaces\//, tile: true,
    where: "Ground material, repeated over the road, pavement, rails, paths, grass or canal geometry.",
    rules: "Must tile seamlessly. Opaque. The game darkens it when it rains." },
  { re: /^decals\//,
    where: "A single decal, pickup icon, sprite or speech bubble. It does not repeat.", rules: "Usually transparent PNG." },
  { re: /^signs\//,
    where: "The face of a street or road sign, stretched over the sign plate. It does not repeat.", rules: "Alpha is cut at 40% on the road signs." },
  { re: /^shops\/shopfront/,
    where: "Shopfront of the ground floor of a house (256 x 128), stretched over the shop box, 2 bays wide. Shop number is the first number in the file name.", rules: "Opaque. Its blade sign has the same number." },
  { re: /^shops\/blade/,
    where: "Small double-sided blade sign hanging from a bracket between the shop and the first-floor windows.", rules: "Same shop as the shopfront with the same number." },
  { re: /^shops\/awning/, tile: true,
    where: "Striped awning over a shopfront.", rules: "Must tile along the stripes." },
  { re: /^student\//,
    where: "Student quarter decoration: graffiti shutters (closed shops) and party posters on house fronts.", rules: "Does not repeat." },
  { re: /^vehicles\//,
    where: "A texture of a car, the tram or their parts.", rules: "Check the UV layout in the model before changing proportions." },
];

const LEGEND_SHORT = "HEIGHT: 50% grey = flat, lighter = out, darker = in, empty = no bumps.";
const LEGEND_FULL = "HEIGHT layer (greyscale): empty = no bumps. 50% grey #808080 = flat. Lighter up to white = sticks out, darker down to black = sunk in. Step of 5-10% = subtle, 20% = clear, 40% = hard. Soft gradient = round bump, hard edge = sharp ridge.";
const LAYERS_FULL = "TEXTURE layer: your new art, exported as the game PNG (leave empty to keep the current PNG). Save the .ai while 'npm run dev' runs and the game reloads.";

const list = (a, n) => a.length <= n ? a.join(", ") : a.slice(0, n).join(", ") + " +" + (a.length - n) + " more";

/* info: { key, description, width, height, hasAlpha, usage: { models, code } }
   Returns the text for the notes layer. Small artboards get the short version so it still fits. */
function buildNotes(info) {
  const g = GROUPS.find((x) => x.re.test(info.key)) || { where: "", rules: "" };
  const models = g.noModels ? [] : (info.usage && info.usage.models[info.key]) || [];
  const code = [...new Set([...(g.code || []), ...((info.usage && info.usage.code[info.key]) || [])])];
  const flags = [info.width + " x " + info.height + " px", g.tile ? "tiles" : null, info.hasAlpha ? "has transparency" : "opaque"].filter(Boolean).join(" · ");
  const used = [models.length ? "Models: " + list(models, 6) + "." : "", code.length ? "Code: " + list(code, 3) + "." : ""].filter(Boolean).join(" ");
  const small = info.width * info.height < 20000;
  const lines = [info.key + "  ·  " + flags];
  if (info.description) lines.push(info.description);
  if (small) {
    if (g.where) lines.push("WHERE: " + g.where.split(". ")[0].replace(/\.$/, "") + ".");
    if (used) lines.push(used);
    lines.push(LEGEND_SHORT);
  } else {
    if (g.where) lines.push("WHERE: " + g.where);
    if (used) lines.push("USED BY: " + used);
    if (g.rules) lines.push("RULES: " + g.rules);
    lines.push(LAYERS_FULL, LEGEND_FULL);
  }
  return lines.join("\r");
}

module.exports = { scanUsage, buildNotes };
