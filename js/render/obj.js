/* OBJ models. Every model is assets/models/<folder>/<name>.obj with a matching .mtl next to it, listed in
   assets/models/manifest.json. They are loaded once before the world is built; __tram.model(key) then returns
   a ready-to-use group (geometry is shared between copies).

   How an OBJ becomes a game object
   - Units are metres, Y is up. A car faces -Z (front) / +Z (rear) exactly as in the game.
   - Each `o` object becomes one piece. An object whose name ends in ".nocast" does not cast a shadow.
   - Materials come from the .mtl: Kd = colour, Ke = glow, d = opacity, map_Kd = texture (a PNG in assets/textures).
     Flags are the leading words of the material name (they survive a round trip through Blender):
       unlit_   flat colour, no shading         glass_  see-through, simple shading     phong_  shiny metal
       dbl_     visible from both sides         vcol_   use the per-vertex colours in the OBJ ("v x y z r g b")
       alpha40_ (any two digits)  cut out pixels with less than 0.40 alpha (signs, lattices); plain alpha_ = 0.40
     e.g. "dbl_alpha40_tex_signs-road-oneway_ffffff". Anything without flags is the normal cartoon-shaded material.
   - A few names are filled in by the game per copy (paint colour of a car, shop sign face, ...): see the notes
     in manifest.json. Their colour/texture in the file is just a default.
   - Textures repeat when the UVs go outside 0..1 and are clamped otherwise.
   - A texture with a height map (<name>-height.png listed in the texture manifest) gets bumps on shaded materials, no .mtl change needed. */
import { __tram, T } from "../runtime.js";

__tram.MODEL_DIR = "assets/models/";
__tram.MODELS = {};   // key -> parsed template

const FLAGS = new Set(["unlit", "glass", "phong", "dbl", "vcol", "alpha"]);
const isFlag = (w) => FLAGS.has(w) || /^alpha\d\d$/.test(w);

const fetchText = async (url) => {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error("Missing model file: " + url);
  return res.text();
};

__tram.loadModels = async function loadModels() {
  const res = await fetch(__tram.MODEL_DIR + "manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not read " + __tram.MODEL_DIR + "manifest.json");
  const manifest = await res.json();
  __tram.modelKeys = Object.keys(manifest).filter((k) => !k.startsWith("_"));
  await Promise.all(__tram.modelKeys.map(async (key) => {
    const [obj, mtl] = await Promise.all([fetchText(__tram.MODEL_DIR + key + ".obj"), fetchText(__tram.MODEL_DIR + key + ".mtl")]);
    __tram.MODELS[key] = parseObj(key, obj, parseMtl(mtl));
  }));
};

/* ---------- .mtl ---------- */
function parseMtl(text) {
  const mats = {}; let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim(); if (!line || line[0] === "#") continue;
    const t = line.split(/\s+/), k = t[0];
    if (k === "newmtl") cur = mats[t[1]] = { kd: [1, 1, 1], ke: [0, 0, 0], d: 1, map: null };
    else if (!cur) continue;
    else if (k === "Kd") cur.kd = [+t[1], +t[2], +t[3]];
    else if (k === "Ke") cur.ke = [+t[1], +t[2], +t[3]];
    else if (k === "d") cur.d = +t[1];
    else if (k === "Tr") cur.d = 1 - +t[1];
    else if (k === "map_Kd") cur.map = textureKey(t[t.length - 1]);
  }
  return mats;
}
// "../../textures/signs/road-oneway.png" -> "signs/road-oneway"
function textureKey(path) {
  const p = path.replace(/\\/g, "/").replace(/\.[a-z]+$/i, ""), i = p.lastIndexOf("textures/");
  if (i >= 0) return p.slice(i + 9);
  const hit = __tram.texKeys.find((k) => p.endsWith("/" + k) || p === k || k.endsWith("/" + p.split("/").pop()));
  if (!hit) throw new Error("Texture not found in assets/textures: " + path);
  return hit;
}

/* ---------- .obj ---------- */
function parseObj(key, text, mtl) {
  const P = [], UV = [], N = [], C = [];
  const objects = []; let obj = null, matName = "default", part = null;
  const repeat = {}; // material -> uses UVs outside 0..1
  const start = (name) => { obj = { name, parts: new Map() }; objects.push(obj); part = null; };
  const use = (m) => {
    matName = m; if (!obj) start("part" + objects.length);
    part = obj.parts.get(m); if (!part) obj.parts.set(m, part = { matName: m, p: [], n: [], u: [], c: [], hasC: false });
  };
  const ix = (s, len) => { const n = parseInt(s, 10); return n < 0 ? len + n : n - 1; };
  for (const raw of text.split("\n")) {
    const line = raw.trim(); if (!line || line[0] === "#") continue;
    const t = line.split(/\s+/), k = t[0];
    if (k === "v") { P.push(+t[1], +t[2], +t[3]); C.push(t.length >= 7 ? [+t[4], +t[5], +t[6]] : null); }
    else if (k === "vt") UV.push(+t[1], +t[2]);
    else if (k === "vn") N.push(+t[1], +t[2], +t[3]);
    else if (k === "o" || k === "g") { if (k === "o" || !obj) start(t.slice(1).join(" ") || "part" + objects.length); }
    else if (k === "usemtl") use(t[1]);
    else if (k === "f") {
      if (!part) use(matName);
      const cs = t.slice(1).map((s) => { const a = s.split("/"); return [ix(a[0], P.length / 3), a[1] ? ix(a[1], UV.length / 2) : -1, a[2] ? ix(a[2], N.length / 3) : -1]; });
      for (let i = 1; i < cs.length - 1; i++) {
        const tri = [cs[0], cs[i], cs[i + 1]];
        let fn = null;
        if (tri.some((c) => c[2] < 0)) { // no normals in the file: flat normal for this triangle
          const a = tri.map((c) => [P[c[0] * 3], P[c[0] * 3 + 1], P[c[0] * 3 + 2]]);
          const ux = a[1][0] - a[0][0], uy = a[1][1] - a[0][1], uz = a[1][2] - a[0][2], vx = a[2][0] - a[0][0], vy = a[2][1] - a[0][1], vz = a[2][2] - a[0][2];
          fn = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; const l = Math.hypot(...fn) || 1; fn = fn.map((x) => x / l);
        }
        for (const c of tri) {
          part.p.push(P[c[0] * 3], P[c[0] * 3 + 1], P[c[0] * 3 + 2]);
          if (c[2] >= 0) part.n.push(N[c[2] * 3], N[c[2] * 3 + 1], N[c[2] * 3 + 2]); else part.n.push(fn[0], fn[1], fn[2]);
          if (c[1] >= 0) { const u = UV[c[1] * 2], v = UV[c[1] * 2 + 1]; part.u.push(u, v); if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) repeat[matName] = true; } else part.u.push(0, 0);
          const col = C[c[0]]; if (col) part.hasC = true; part.c.push(col ? col[0] : 1, col ? col[1] : 1, col ? col[2] : 1);
        }
      }
    }
  }
  const out = [];
  for (const o of objects) {
    const cast = !/\.nocast\b/.test(o.name), name = o.name.replace(/\.nocast\b/, "");
    for (const p of o.parts.values()) {
      if (!p.p.length) continue;
      if (!mtl[p.matName] && p.matName !== "shadowpad") throw new Error(key + ".obj uses material '" + p.matName + "' that is missing from " + key + ".mtl");
      const g = new T.BufferGeometry();
      g.setAttribute("position", new T.Float32BufferAttribute(p.p, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(p.n, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(p.u, 2));
      if (p.hasC) g.setAttribute("color", new T.Float32BufferAttribute(p.c, 3));
      out.push({ name, cast, matName: p.matName, geo: g });
    }
  }
  return { key, mtl, repeat, pieces: out, matCache: {}, merged: null, centred: null };
}

/* ---------- materials ---------- */
function materialFor(tpl, matName, over) {
  if (matName === "shadowpad") return __tram.SHADOW_PAD;
  const o = over && over[matName];
  if (o && o.isMaterial) return o;
  const colour = typeof o === "number" ? o : null, ck = tpl.key + "|" + matName + (colour === null ? "" : "|" + colour);
  if (tpl.matCache[ck]) return tpl.matCache[ck];
  const def = tpl.mtl[matName];
  const words = matName.split("_"), flags = new Set(); for (const w of words) { if (isFlag(w)) flags.add(w); else break; }
  const hex = colour !== null ? colour : (Math.round(def.kd[0] * 255) << 16) | (Math.round(def.kd[1] * 255) << 8) | Math.round(def.kd[2] * 255);
  const glow = (Math.round(def.ke[0] * 255) << 16) | (Math.round(def.ke[1] * 255) << 8) | Math.round(def.ke[2] * 255);
  const repeatMap = tpl.repeat[matName] ? undefined : false, map = def.map ? __tram.fileTex(def.map, repeatMap) : null;
  const side = flags.has("dbl") ? T.DoubleSide : T.FrontSide;
  let alphaTest = 0; for (const f of flags) if (f.startsWith("alpha")) alphaTest = f === "alpha" ? 0.4 : +f.slice(5) / 100;
  const see = def.d < 1 || alphaTest > 0, o2 = { map, side };
  if (see) { o2.transparent = true; if (def.d < 1) o2.opacity = def.d; if (alphaTest) o2.alphaTest = alphaTest; }
  let m;
  if (flags.has("unlit")) { m = new T.MeshBasicMaterial(Object.assign({ color: hex }, o2)); }
  else if (flags.has("glass")) { m = new T.MeshLambertMaterial(Object.assign({ color: hex }, o2, { transparent: true })); }
  else if (flags.has("phong")) { if (map) __tram.withBump(o2, def.map, repeatMap); m = new T.MeshPhongMaterial(Object.assign({ color: hex, shininess: 90, specular: 0xffffff }, o2)); }
  else if (flags.has("vcol")) { m = __tram.lam(0xffffff, { vertexColors: true }); }
  else if (!map && !see && side === T.FrontSide && !glow) { m = __tram.plain(hex); }
  else { if (glow) o2.emissive = glow; if (map) __tram.withBump(o2, def.map, repeatMap); m = __tram.lam(hex, o2); }
  return tpl.matCache[ck] = m;
}

/* ---------- geometry helpers ---------- */
function mergeGeos(geos) {
  let n = 0; for (const g of geos) n += g.attributes.position.count;
  const hasC = geos.some((g) => g.attributes.color), P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = hasC ? new Float32Array(n * 3).fill(1) : null;
  let o = 0;
  for (const g of geos) {
    const a = g.attributes, c = a.position.count;
    P.set(a.position.array, o * 3); N.set(a.normal.array, o * 3); U.set(a.uv.array, o * 2); if (hasC && a.color) C.set(a.color.array, o * 3);
    o += c;
  }
  const out = new T.BufferGeometry();
  out.setAttribute("position", new T.BufferAttribute(P, 3)); out.setAttribute("normal", new T.BufferAttribute(N, 3)); out.setAttribute("uv", new T.BufferAttribute(U, 2));
  if (C) out.setAttribute("color", new T.BufferAttribute(C, 3));
  return out;
}

// pieces grouped by material, one geometry per (material, casts-shadow); built once per model
function mergedPieces(tpl) {
  if (tpl.merged) return tpl.merged;
  const buckets = new Map();
  for (const p of tpl.pieces) { const k = p.matName + "|" + (p.cast ? 1 : 0); if (!buckets.has(k)) buckets.set(k, { matName: p.matName, cast: p.cast, geos: [] }); buckets.get(k).geos.push(p.geo); }
  return tpl.merged = [...buckets.values()].map((b) => ({ matName: b.matName, cast: b.cast, geo: b.geos.length === 1 ? b.geos[0] : mergeGeos(b.geos) }));
}
// every piece with its own origin at the middle of its bounding box (so a piece can fly off or swing on its own)
function centredPieces(tpl) {
  if (tpl.centred) return tpl.centred;
  return tpl.centred = tpl.pieces.map((p) => {
    p.geo.computeBoundingBox(); const c = p.geo.boundingBox.getCenter(new T.Vector3()), g = p.geo.clone(); g.translate(-c.x, -c.y, -c.z);
    return { name: p.name, cast: p.cast, matName: p.matName, geo: g, centre: c };
  });
}

/* A copy of a model.
   opts.parts  true: one mesh per piece, each positioned at its own centre and named after its OBJ object
               (for things that break apart, open or get looked up by name). Default: merged per material, fewest draw calls.
   opts.over   { materialName: THREE.Material | 0xRRGGBB }  replace a material (or just its colour) for this copy. */
__tram.model = function model(key, opts) {
  const tpl = __tram.MODELS[key]; if (!tpl) throw new Error("Unknown model: " + key + " (add it to assets/models/manifest.json)");
  const over = opts && opts.over, g = new T.Group(); g.name = key;
  if (opts && opts.parts) {
    for (const p of centredPieces(tpl)) {
      const m = new T.Mesh(p.geo, materialFor(tpl, p.matName, over)); m.name = p.name; m.position.copy(p.centre);
      m.castShadow = p.cast; m.receiveShadow = true; g.add(m);
    }
  } else {
    for (const p of mergedPieces(tpl)) { const m = new T.Mesh(p.geo, materialFor(tpl, p.matName, over)); m.castShadow = p.cast; m.receiveShadow = true; g.add(m); }
  }
  return g;
};

/* Merge a finished assembly (many small model copies) into one mesh per material, so a whole building is a handful of draw calls.
   The geometry belongs to the group: it is released with the road chunk (userData.own). */
__tram.flatten = function flatten(root) {
  root.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), m4 = new T.Matrix4();
  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.visible) return;
    m4.multiplyMatrices(inv, mesh.matrixWorld);
    accumulate(buckets, mesh, m4);
  });
  const out = new T.Group(); out.name = root.name; out.position.copy(root.position); out.rotation.copy(root.rotation); out.scale.copy(root.scale);
  for (const b of buckets.values()) out.add(bucketMesh(b));
  return out;
};

/* The two halves of a merge, shared by flatten() and bakeStatic(): accumulate() appends a mesh (transformed by m4) to the
   bucket of its material, bucketMesh() turns a finished bucket into one mesh whose geometry belongs to that mesh (userData.own). */
const _n3 = new T.Matrix3();
function accumulate(buckets, mesh, m4, tinted) {
  _n3.getNormalMatrix(m4);
  const e = m4.elements, q = _n3.elements, src = mesh.geometry, a = src.attributes, mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const pa = a.position.array, na = a.normal.array, ua = a.uv ? a.uv.array : null, ca = a.color ? a.color.array : null, ia = src.index ? src.index.array : null;
  const groups = src.groups.length ? src.groups : [{ start: 0, count: ia ? ia.length : a.position.count, materialIndex: 0 }];
  const flip = m4.determinant() < 0, flags = (mesh.castShadow ? 1 : 0) + "|" + (mesh.receiveShadow ? 1 : 0);
  for (const gr of groups) {
    const src_mat = Array.isArray(mesh.material) ? mats[gr.materialIndex] : mesh.material;
    // tinted: the material's colour goes into the vertex colours and the mesh joins the shared vertex-colour material of its side
    const mat = tinted ? vertexColourMaterial(src_mat.side) : src_mat, k = (tinted ? "vc" + src_mat.side : mat.uuid) + "|" + flags;
    const tr = tinted ? src_mat.color.r : 1, tg = tinted ? src_mat.color.g : 1, tb = tinted ? src_mat.color.b : 1;
    let b = buckets.get(k); if (!b) buckets.set(k, b = { mat, cast: mesh.castShadow, recv: mesh.receiveShadow, p: [], n: [], u: [], c: [], hasC: !!tinted });
    for (let i = 0; i < gr.count; i += 3) {
      for (let j = 0; j < 3; j++) {
        // a mirrored copy turns inside out: swap two corners of each triangle to keep the faces pointing outwards
        const vi = (ia ? ia[gr.start + i + (flip ? (j === 0 ? 0 : 3 - j) : j)] : gr.start + i + (flip ? (j === 0 ? 0 : 3 - j) : j)), v3 = vi * 3;
        const x = pa[v3], y = pa[v3 + 1], z = pa[v3 + 2];
        b.p.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
        const nx = na[v3], ny = na[v3 + 1], nz = na[v3 + 2];
        let X = q[0] * nx + q[3] * ny + q[6] * nz, Y = q[1] * nx + q[4] * ny + q[7] * nz, Z = q[2] * nx + q[5] * ny + q[8] * nz;
        const len = Math.hypot(X, Y, Z) || 1; b.n.push(X / len, Y / len, Z / len);
        if (ua) b.u.push(ua[vi * 2], ua[vi * 2 + 1]); else b.u.push(0, 0);
        if (ca) { b.hasC = true; b.c.push(ca[v3] * tr, ca[v3 + 1] * tg, ca[v3 + 2] * tb); } else b.c.push(tr, tg, tb);
      }
    }
  }
}
// one toon material per side that takes its colour from the vertices: what plain-coloured toon meshes are merged into
const vcMats = {};
function vertexColourMaterial(side) { return vcMats[side] || (vcMats[side] = new T.MeshToonMaterial({ vertexColors: true, gradientMap: __tram.TOON, side })); }
// a plain-coloured toon material (no texture, glow or transparency) behaves the same with its colour in the vertices.
// `keep` is a Set of materials the game recolours at run time (the road surfaces get darker in the rain): those stay as they are.
function isPlainColour(m, keep) {
  return m.isMeshToonMaterial && !m.map && !m.transparent && !m.vertexColors && !m.alphaTest && m.opacity === 1 && !m.emissiveMap && m.emissive.getHex() === 0 && m.gradientMap === __tram.TOON && !(keep && keep.has(m));
}
// only plain, non-interleaved geometry can be merged
function mergeable(geo) { const a = geo.attributes; return a.position && a.normal && !a.position.isInterleavedBufferAttribute && !a.normal.isInterleavedBufferAttribute && !(a.uv && a.uv.isInterleavedBufferAttribute) && !(a.color && a.color.isInterleavedBufferAttribute); }
function bucketMesh(b) {
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(b.p, 3)); g.setAttribute("normal", new T.Float32BufferAttribute(b.n, 3)); g.setAttribute("uv", new T.Float32BufferAttribute(b.u, 2));
  if (b.hasC) g.setAttribute("color", new T.Float32BufferAttribute(b.c, 3));
  g.userData.own = true;
  const m = new T.Mesh(g, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; return m;
}

/* Merge the parts of a rigged model that never move relative to each other. Inside every group of the model, the direct child
   meshes that share a material (and shadow flags) become one mesh in that same group, so the group can still be posed, spun
   or swung as before. Meshes in `skip` (a Set) are moved by code and stay as they are. Call it once the model is built.
   The merged geometry belongs to the model: release it with __tram.disposeOwn(root). */
__tram.bakeStatic = function bakeStatic(root, skip) {
  const holders = [], keep = new Set(Object.values(__tram.MAT || {})); root.traverse((o) => { if (o.children.length > 1) holders.push(o); });
  for (const grp of holders) {
    const lists = new Map();
    for (const ch of [...grp.children]) {
      if (!ch.isMesh || ch.isSkinnedMesh || ch.isInstancedMesh || Array.isArray(ch.material) || ch.children.length || (skip && skip.has(ch)) || !mergeable(ch.geometry)) continue;
      const plain = isPlainColour(ch.material, keep);
      const k = (plain ? "vc" + ch.material.side : ch.material.uuid) + "|" + (ch.castShadow ? 1 : 0) + "|" + (ch.receiveShadow ? 1 : 0) + "|" + (ch.visible ? 1 : 0);
      let l = lists.get(k); if (!l) lists.set(k, l = { plain, meshes: [] }); l.meshes.push(ch);
    }
    for (const l of lists.values()) {
      if (l.meshes.length < 2) continue;
      const buckets = new Map();
      for (const ch of l.meshes) { ch.updateMatrix(); accumulate(buckets, ch, ch.matrix, l.plain); grp.remove(ch); }
      for (const b of buckets.values()) { const m = bucketMesh(b); m.visible = l.meshes[0].visible; grp.add(m); }
    }
  }
  return root;
};

/* One InstancedMesh for many copies of a shared geometry (a tree variant, say). `matrices` are the copies' transforms in the
   mesh's parent space. The mesh gets a geometry shell that shares the original buffers but has its own bounding sphere around
   all the copies: without it three.js would test only the one original and cull the whole batch from the wrong place
   (and r128 does not cull instanced meshes at all unless asked).
   Release it with __tram.disposeInstanced(mesh). */
__tram.instanceMesh = function instanceMesh(geo, mat, matrices, cast, recv) {
  const shell = new T.BufferGeometry();
  for (const n in geo.attributes) shell.setAttribute(n, geo.attributes[n]);
  if (geo.index) shell.setIndex(geo.index);
  if (!geo.boundingSphere) geo.computeBoundingSphere();
  const mesh = new T.InstancedMesh(shell, mat, matrices.length), box = new T.Box3(), p = new T.Vector3(); let scale = 0;
  matrices.forEach((m, i) => { mesh.setMatrixAt(i, m); box.expandByPoint(p.copy(geo.boundingSphere.center).applyMatrix4(m)); scale = Math.max(scale, m.getMaxScaleOnAxis()); });
  shell.boundingSphere = box.getBoundingSphere(new T.Sphere()); shell.boundingSphere.radius += geo.boundingSphere.radius * scale;
  shell.userData.shell = true;
  mesh.frustumCulled = true;   // InstancedMesh switches culling off by default; the shell's bounding sphere makes it safe to switch back on
  mesh.castShadow = !!cast; mesh.receiveShadow = !!recv;
  return mesh;
};
// the shell shares its buffers with the real geometry, so drop them from the shell first: disposing it must not delete the shared GPU buffers
__tram.disposeInstanced = function disposeInstanced(mesh) {
  const g = mesh.geometry; g.attributes = {}; g.index = null; g.dispose(); mesh.dispose();
};

/* Release the geometry a model owns (the merged meshes from flatten(), bakeStatic() and bakeChunk()) and any instanced batches;
   shared geometry is left alone. */
__tram.disposeOwn = function disposeOwn(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) { if (o.geometry.userData.shell) __tram.disposeInstanced(o); else o.dispose(); }
    else if (o.geometry && o.geometry.userData.own) o.geometry.dispose();
  });
};

/* The scenery of one finished road chunk: houses, trees, lamps, benches, signs... Everything that is opaque and never moves is
   merged per material (and shadow flags) within 20 m cells (__tram.BAKE_CELL) along the road, so a chunk costs far fewer draw calls instead of
   over a thousand. Big shared shapes (trees) are instanced instead of copied, which keeps memory flat. Cells keep the
   frustum culling reasonably fine. Left alone: the road surface (the chunk's own big meshes), transparent meshes, meshes with
   several materials and anything already instanced. Call it just before the chunk is added to the scene. */
__tram.BAKE_CELL = 20;   // measured: a bigger cell saves a few more draw calls but starts drawing noticeably more triangles
const INSTANCE_MIN = 2000;
__tram.bakeChunk = function bakeChunk(grp) {
  const CELL = __tram.BAKE_CELL;
  grp.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(grp.matrixWorld).invert(), m4 = new T.Matrix4(), cells = new Map(), gone = [], keep = new Set(Object.values(__tram.MAT || {}));
  grp.traverse((mesh) => {
    if (mesh === grp || !mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || !mesh.visible) return;
    const mat = mesh.material, geo = mesh.geometry;
    if (Array.isArray(mat) || mat.transparent || (mesh.parent === grp && geo.userData.own) || !mergeable(geo)) return;
    m4.multiplyMatrices(inv, mesh.matrixWorld);
    const ck = Math.floor(m4.elements[12] / CELL) + "," + Math.floor(m4.elements[14] / CELL);
    let c = cells.get(ck); if (!c) cells.set(ck, c = { merged: new Map(), inst: new Map() });
    if (!geo.userData.own && geo.attributes.position.count >= INSTANCE_MIN && m4.determinant() > 0) {
      const k = geo.uuid + "|" + mat.uuid + "|" + (mesh.castShadow ? 1 : 0) + "|" + (mesh.receiveShadow ? 1 : 0);
      let b = c.inst.get(k); if (!b) c.inst.set(k, b = { geo, mat, cast: mesh.castShadow, recv: mesh.receiveShadow, mats: [] });
      b.mats.push(m4.clone());
    } else accumulate(c.merged, mesh, m4, isPlainColour(mat, keep));
    gone.push(mesh);
  });
  for (const c of cells.values()) {
    for (const b of c.merged.values()) grp.add(bucketMesh(b));
    for (const b of c.inst.values()) grp.add(__tram.instanceMesh(b.geo, b.mat, b.mats, b.cast, b.recv));
  }
  for (const m of gone) { m.parent.remove(m); if (m.geometry.userData.own) m.geometry.dispose(); }
  const prune = (node) => { for (const ch of [...node.children]) { prune(ch); if (ch.isGroup && !ch.children.length) node.remove(ch); } };
  prune(grp);
};
