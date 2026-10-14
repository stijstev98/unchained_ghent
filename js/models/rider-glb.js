/* The player's rider: assets/models/characters/rider.glb, a skinned model rigged in Blender.
   The procedural rider in models/cyclist.js still works out the pose every frame (lean, pedalling legs,
   arm targets). On the player and the garage preview its meshes are hidden and that pose is copied onto
   the GLB's bones. The hood has its own three bones and flaps harder the faster you ride.
   If GLTFLoader or the file can't load, the player keeps the procedural rider. NPCs are untouched.

   Bones: hips spine chest neck head, shoulder/upper_arm/forearm/hand_L|R, thigh/shin/foot_L|R, hood_1..3.
   _L is the rider's left. */
import { __tram, T } from "../runtime.js";

__tram.RIDER_GLB = "assets/models/characters/rider.glb";
__tram.riderBuf = null;

__tram.loadRider = async function loadRider() {
  if (!T.GLTFLoader) { console.warn("GLTFLoader missing, keeping the procedural rider"); return; }
  try {
    const res = await fetch(__tram.RIDER_GLB, { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    __tram.riderBuf = await res.arrayBuffer();
  } catch (e) { console.warn("Could not load rider.glb, keeping the procedural rider", e); }
};

const parseRider = () => new Promise((ok, fail) => new T.GLTFLoader().parse(__tram.riderBuf.slice(0), "", ok, fail));

// match the rest of the game: Lambert shading, textures without sRGB decoding
function prepModel(model) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    const src = o.material, map = src.map || null;
    if (map) { map.encoding = T.LinearEncoding; map.image = __tram.mobileImage(map.image); }
    const m = new T.MeshLambertMaterial({ map, skinning: !!o.isSkinnedMesh });
    if (!map) { m.color.copy(src.color); if (m.color.convertLinearToSRGB) m.color.convertLinearToSRGB(); }
    o.material = m; o.castShadow = true; o.frustumCulled = false;
  });
}

const LIMBS = { thigh_L: "shin_L", shin_L: "foot_L", thigh_R: "shin_R", shin_R: "foot_R",
  upper_arm_L: "forearm_L", forearm_L: "hand_L", upper_arm_R: "forearm_R", forearm_R: "hand_R" };
const XAX = new T.Vector3(1, 0, 0), YAX = new T.Vector3(0, 1, 0);

__tram.attachRiderGLB = function attachRiderGLB(g) {
  const u = g.userData;
  if (!__tram.riderBuf || u.glb || u.glbPending) return;
  u.glbPending = true;
  parseRider().then((gltf) => {
    const model = gltf.scene; prepModel(model);
    const bones = {}; model.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    if (!bones.hips || !bones.thigh_L || !bones.hood_1) { console.warn("rider.glb is missing bones", Object.keys(bones)); return; }
    // the model faces +Z, the game rides towards -Z
    const root = new T.Group(); root.rotation.y = Math.PI; root.add(model); u.inner.add(root);
    root.updateMatrixWorld(true);
    const wp = (n) => bones[n].getWorldPosition(new T.Vector3());
    // scale so the legs are exactly as long as the leg IK expects
    const leg = wp("thigh_L").distanceTo(wp("shin_L")) + wp("shin_L").distanceTo(wp("foot_L"));
    root.scale.setScalar((__tram.L1 + __tram.L2) / leg);
    root.updateMatrixWorld(true);
    const iq = u.inner.getWorldQuaternion(new T.Quaternion()).invert();
    const rest = {};
    for (const n in bones) {
      const b = bones[n];
      rest[n] = { q: iq.clone().multiply(b.getWorldQuaternion(new T.Quaternion())),
                  p: u.inner.worldToLocal(b.getWorldPosition(new T.Vector3())), local: b.quaternion.clone() };
    }
    for (const a in LIMBS) rest[a].dir = rest[LIMBS[a]].p.clone().sub(rest[a].p).normalize();
    rest.hand_L.dir = rest.forearm_L.dir; rest.hand_R.dir = rest.forearm_R.dir;
    // helmet holder on the head bone (the shop helmet normally sits on the procedural head)
    const helm = new T.Group(); helm.position.set(0, 0.17, 0); helm.rotation.y = Math.PI; helm.scale.setScalar(1.3);
    bones.head.add(helm);
    // head sphere for the hood guard, in the head bone's own units (centre half way up the head, radius = head + hair + margin)
    u.glb = { root, bones, rest, helm, hipOff: rest.hips.p.clone().sub(root.position), lift: 0, t: 0, last: performance.now(),
              headMid: 0.17, headRad: 0.26 * root.scale.x };
    // hide the procedural rider
    u.torso.visible = false;
    for (const a of u.arms) a.up.visible = a.fo.visible = a.sh.visible = a.el.visible = a.hand.visible = false;
    for (const l of u.legs) l.th.visible = false;
  }).catch((e) => console.warn("rider.glb failed to parse, keeping the procedural rider", e))
    .finally(() => { u.glbPending = false; });
};

const _iq = new T.Quaternion(), _pq = new T.Quaternion(), _q = new T.Quaternion(), _q2 = new T.Quaternion();
const _a = new T.Vector3(), _b = new T.Vector3(), _c = new T.Vector3(), _d = new T.Vector3(), _e = new T.Vector3(), _f = new T.Vector3(), _g = new T.Vector3(), _h = new T.Vector3();

// give bone n the orientation qIn (in the bike's inner frame)
function setQ(R, n, qIn) {
  const b = R.bones[n];
  b.parent.getWorldQuaternion(_pq); _pq.premultiply(_iq);
  b.quaternion.copy(_pq.invert().multiply(qIn));
  b.updateMatrixWorld(true);
}
// point bone n along from->to, keeping its rest twist
function aim(R, n, from, to) {
  _d.subVectors(to, from); if (_d.lengthSq() < 1e-8) return;
  _q2.setFromUnitVectors(R.rest[n].dir, _d.normalize()).multiply(R.rest[n].q);
  setQ(R, n, _q2);
}

function driveRider(c, ds) {
  const u = c.userData, R = u.glb, tor = u.torso;
  u.inner.updateMatrixWorld(true);
  u.inner.getWorldQuaternion(_iq).invert();
  // body
  R.root.position.copy(tor.position).sub(R.hipOff);
  R.root.updateMatrixWorld(true);
  setQ(R, "hips", _q.copy(tor.quaternion).multiply(R.rest.hips.q));
  if (R.bones.chest) { R.bones.chest.quaternion.copy(R.rest.chest.local); if (u.lookEnv) R.bones.chest.quaternion.multiply(_q.setFromAxisAngle(YAX, u.lookSide * 0.35 * u.lookEnv)); R.bones.chest.updateMatrixWorld(true); }
  setQ(R, "head", _q.copy(tor.quaternion).multiply(u.head.quaternion).multiply(R.rest.head.q));
  // legs: hip, knee and ankle from the procedural leg IK
  for (const l of u.legs) {
    const s = l.side < 0 ? "_L" : "_R";
    l.th.updateMatrix(); l.sh.updateMatrix();
    _a.copy(l.th.position);
    _b.copy(l.sh.position).applyMatrix4(l.th.matrix);
    _c.set(0, -__tram.L2, 0).applyMatrix4(l.sh.matrix).applyMatrix4(l.th.matrix);
    aim(R, "thigh" + s, _a, _b);
    aim(R, "shin" + s, _b, _c);
    if (l.an) setQ(R, "foot" + s, _q.copy(l.th.quaternion).multiply(l.sh.quaternion).multiply(l.an.quaternion).multiply(R.rest["foot" + s].q));
  }
  // arms: shoulder, elbow and hand targets from armPose
  for (const a of u.arms) {
    const s = a.side < 0 ? "_L" : "_R";
    aim(R, "upper_arm" + s, a.sh.position, a.el.position);
    aim(R, "forearm" + s, a.el.position, a.hand.position);
    aim(R, "hand" + s, a.el.position, a.hand.position);
  }
  // hood: lifts with speed, flutters on top. The neck bone barely moves; the lower two stream backwards.
  const now = performance.now(), dt = Math.min(0.1, (now - R.last) / 1000); R.last = now; R.t += dt;
  const spd = c === __tram.bike ? (__tram.G.speed || 0) : (dt > 0 ? ds / dt : 0);
  const target = 0.9 * __tram.clamp((spd - 2) / 12, 0, 1);
  R.lift += (target - R.lift) * Math.min(1, dt * 2.5);
  const L = R.lift;
  // the phase is integrated: multiplying the clock by a speed-dependent rate makes it jump whenever the speed changes
  R.ph = (R.ph || 0) + dt * (5.5 + spd * 0.45);
  const flutter = Math.sin(R.ph) * 0.65 + Math.sin(R.t * 11.3 + 1.7) * 0.35;
  const w = flutter * (0.10 + 0.22 * L), idle = Math.sin(R.t * 1.7) * 0.05;
  const ang = [idle * 0.35, L * 0.55 + (w + idle) * 0.85, L * 0.45 + (w + idle) * 1.35];
  const setHood = (k) => { for (let i = 0; i < 3; i++) { const n = "hood_" + (i + 1); R.bones[n].quaternion.copy(R.rest[n].local).multiply(_q.setFromAxisAngle(XAX, ang[i] * k)); } R.bones.hood_1.updateMatrixWorld(true); };
  // keep the cloth out of the head, but the resting drape already sits against the hair, so that pose is allowed
  if (!R.hoodLen) { R.hoodLen = R.bones.hood_3.position.length() || 0.15; }
  const hc = R.bones.head.localToWorld(_a.set(0, R.headMid, 0)), rad = R.headRad;
  const tip = () => { const h2 = R.bones.hood_2, h3 = R.bones.hood_3, L3 = R.hoodLen;
    return [h2.getWorldPosition(_b), h3.getWorldPosition(_c), h3.localToWorld(_d.set(0, L3, 0)),
            h2.localToWorld(_e.set(0.13, 0, 0)), h2.localToWorld(_f.set(-0.13, 0, 0)), h3.localToWorld(_g.set(0.1, L3 * 0.5, 0)), h3.localToWorld(_h.set(-0.1, L3 * 0.5, 0))]; };
  // rest clearances are measured in the current body pose: standing on the pedals moves the head relative to the hood
  setHood(0); const clear = tip().map((q) => q.distanceTo(hc));
  let k = 1; setHood(k);
  for (let it = 0; it < 8; it++) {
    const pts = tip(); let inside = false;
    for (let i = 0; i < pts.length; i++) { const d = pts[i].distanceTo(hc); if (d < rad && d < clear[i] - 0.004) { inside = true; break; } }
    if (!inside) break;
    k *= 0.75; setHood(k);
  }
  // shop helmet follows the model's head
  const hm = __tram.playerHelmet;
  if (hm && hm.parent === u.head) R.helm.add(hm);
}

const makeOrig = __tram.makeCyclist, animOrig = __tram.animCyclist;
__tram.makeCyclist = function makeCyclist(o) {
  const g = makeOrig(o);
  if (o && o.glbRider) __tram.attachRiderGLB(g);
  return g;
};
// look back over the shoulder (set by __tram.maybeLookBack): ease in, hold, ease out
function lookBack(u) {
  const now = performance.now(), dt = Math.min(0.1, (now - (u.lookLast || now)) / 1000); u.lookLast = now;
  if (!(u.lookT > 0)) { u.lookEnv = 0; return; }
  u.lookT = Math.max(0, u.lookT - dt);
  const el = u.lookDur - u.lookT, sm = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  u.lookEnv = sm(el / 0.3) * sm(u.lookT / 0.45);
  u.head.rotation.y += u.lookSide * 1.6 * u.lookEnv;   // head turns ~90 degrees towards the wreckage
  u.head.rotation.x -= 0.12 * u.lookEnv;               // chin lifts a little
}
__tram.animCyclist = function animCyclist(c, phase, ds) {
  const r = animOrig(c, phase, ds);
  if (c === __tram.bike) lookBack(c.userData);
  if (c.userData.glb) driveRider(c, ds);
  return r;
};
