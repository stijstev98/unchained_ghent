/* Web Audio engine. Loads the WAV library in assets/sounds, turns the sustained recordings into seamless loops
   (audio-dsp.js) and plays everything through "voices": source -> fade envelope -> volume -> [panner] -> master.
   - Every voice fades in when it starts and out when it stops, so nothing clicks. Shots carry baked-in fades too.
   - A voice given `follow` (a world object) or `at` ({x,y,z}) is positional: panned and made quieter with distance,
     and shifted in pitch by the Doppler effect. Web Audio's PannerNode no longer does Doppler itself, so it is done
     here from the speed of the source and of the listener (the rider) along the line between them.
   What plays when is decided in soundscape.js. */
import { __tram } from "../runtime.js";
import { prepareLoop, prepareShot } from "./audio-dsp.js";
import { VOLUME } from "./sound-config.js";

const DIR = "assets/sounds/";
/* loop: sustained recording, made seamless. stereo: keep both channels (wide beds); everything else is mono. */
const FILES = {
  ambient_city: { loop: true, stereo: true }, rain: { loop: true, stereo: true },
  bike_pedaling: { loop: true }, engine: { loop: true }, escooter: { loop: true }, fabric_flap: { loop: true }, coins_count_up: { loop: true },
  tire_cobblestone: { loop: true }, tire_rolling: { loop: true }, tram_1: { loop: true }, tram_2: { loop: true }, wind_rush: { loop: true },
  bike_bell_1: {}, bike_bell_2: {}, bike_brakes: {}, bike_crash: {}, car_horn: {}, car_impact: {}, car_impact_short: {}, coin_bing: {}, tire_bump: {},
  voice_aw_sad: {}, voice_eek_1: {}, voice_eek_2: {}, voice_eek_sharp: {}, voice_hey: {}, voice_ouch: {}, voice_woah: {}
};
const DOPPLER = 1.5;           // 1 = real physics. A bit more makes the pitch shift of a passing tram or car easier to hear at city speeds.
const C = 343 / DOPPLER;       // speed of sound (m/s) as used for the shift
const MAX_VOICES = 48;
const MAX_SPEED = 70;          // a frame-to-frame jump faster than this is a teleport (road rebase, new game), not movement

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const A = { ctx: null, master: null, masterT: -1, holding: false, buf: {}, voices: new Set(), unlocked: false, L: { x: 0, y: 1.4, z: 0, vx: 0, vz: 0, set: false } };

function setPos(p, x, y, z) {
  if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
}

/* Decode and prepare every file. Decoding goes through an OfflineAudioContext, so it needs no user gesture and
   the real AudioContext can wait for the first click. Never rejects: a file that fails is just silent. */
__tram.loadSounds = function loadSounds() {
  const Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Off) return Promise.resolve();
  const dec = new Off(1, 1, 48000);
  return Promise.all(Object.entries(FILES).map(async ([name, f]) => {
    try {
      const res = await fetch(DIR + name + ".wav"); if (!res.ok) throw new Error("HTTP " + res.status);
      const raw = await dec.decodeAudioData(await res.arrayBuffer());
      const chs = []; for (let c = 0; c < raw.numberOfChannels; c++) chs.push(raw.getChannelData(c));
      const out = f.loop ? prepareLoop(chs, raw.sampleRate, f) : prepareShot(chs, raw.sampleRate, f);
      const data = new AudioBuffer({ numberOfChannels: out.chs.length, length: out.chs[0].length, sampleRate: raw.sampleRate });
      out.chs.forEach((c, i) => data.copyToChannel(c, i));
      A.buf[name] = { data, loop: !!f.loop, norm: out.norm, info: out.info };
    } catch (e) { console.warn("[audio] could not load " + name + ":", e); }
  }));
};

/* iPhones mute Web Audio while the side (ring/silent) switch is on silent, unless the page counts as "playback" audio.
   Newer iOS has an API for that; older iOS switches to the playback category as soon as an <audio> element plays,
   so a silent looping clip is started from the first tap. Both are harmless on desktop and Android. */
function playbackSession() {
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* not supported */ }
  if (A.keepAlive) return;
  try {
    const n = 800, b = new DataView(new ArrayBuffer(44 + n));   // 0.1 s of 8-bit mono silence at 8 kHz
    const tag = (o, s) => { for (let i = 0; i < 4; i++) b.setUint8(o + i, s.charCodeAt(i)); };
    tag(0, "RIFF"); b.setUint32(4, 36 + n, true); tag(8, "WAVE"); tag(12, "fmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, 8000, true); b.setUint32(28, 8000, true); b.setUint16(32, 1, true); b.setUint16(34, 8, true); tag(36, "data"); b.setUint32(40, n, true);
    for (let i = 0; i < n; i++) b.setUint8(44 + i, 128);
    const el = new Audio(URL.createObjectURL(new Blob([b.buffer], { type: "audio/wav" })));
    el.loop = true; el.setAttribute("playsinline", ""); el.volume = 0.01;
    A.keepAlive = el;
  } catch (e) { return; }
  const p = A.keepAlive.play(); if (p && p.catch) p.catch(() => { A.keepAlive = null; });   // blocked outside a tap: try again on the next one
}

function ensureContext() {
  if (A.ctx) return A.ctx;
  playbackSession();
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  try { A.ctx = new AC({ latencyHint: "interactive" }); } catch (e) { return null; }
  A.master = A.ctx.createGain(); A.master.gain.value = 0;   // opened smoothly by frame()
  const lim = A.ctx.createDynamicsCompressor();             // a gentle limiter: a crash on top of traffic must not clip
  lim.threshold.value = -9; lim.knee.value = 10; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.2;
  A.master.connect(lim); lim.connect(A.ctx.destination);
  return A.ctx;
}

/* Browsers only start audio after a click or key press; called from those (and from start()). */
__tram.audio = function audio() {
  const c = ensureContext(); if (!c) return;
  A.unlocked = true;
  if (!A.keepAlive) playbackSession();   // the first attempt may have been outside a tap
  else if (A.keepAlive.paused) A.keepAlive.play().catch(() => {});
  // iOS also reports "interrupted" (a call, Siri, switching apps), not only "suspended"
  if (c.state !== "running" && c.state !== "closed" && !__tram.paused && !document.hidden) c.resume().catch(() => {});
};

function makePanner(o) {
  const p = A.ctx.createPanner();
  p.panningModel = "equalpower"; p.distanceModel = "inverse";
  p.refDistance = o.ref || 5; p.rolloffFactor = o.rolloff == null ? 1.3 : o.rolloff; p.maxDistance = 1000;
  return p;
}

/* Start a sound. o: gain, rate, delay (s), fadeIn (s), randomStart (loops start at a random point), maxDist (m),
   and for positional sounds follow (an object with a .mesh) or at ({x,y,z}), ref (m, where the distance fade begins),
   rolloff, doppler:false. Returns a handle {set(gain, rate, tau), stop(release)} or null when it did not start. Loops (see FILES) repeat until stop(). */
function voice(name, o) {
  const ctx = A.ctx, b = A.buf[name];
  if (!ctx || !b || ctx.state !== "running" || A.voices.size >= MAX_VOICES) return null;
  o = o || {};
  const pos = o.follow ? o.follow.mesh.position : o.at;
  if (pos && o.maxDist) { const dx = pos.x - A.L.x, dz = pos.z - A.L.z; if (dx * dx + dz * dz > o.maxDist * o.maxDist) return null; }
  const t = ctx.currentTime + (o.delay || 0), gain = o.gain == null ? 1 : o.gain, rate = o.rate || 1;
  const src = ctx.createBufferSource(), env = ctx.createGain(), vol = ctx.createGain();
  src.buffer = b.data; src.loop = b.loop; src.playbackRate.value = rate;
  vol.gain.value = gain * b.norm;
  env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + (o.fadeIn != null ? o.fadeIn : (b.loop ? 0.35 : 0.01)));
  src.connect(env); env.connect(vol);
  let pan = null;
  if (pos) { pan = makePanner(o); setPos(pan, pos.x, pos.y || 0, pos.z); vol.connect(pan); pan.connect(A.master); } else vol.connect(A.master);
  const v = { name, src, env, vol, pan, follow: o.follow, at: o.at, norm: b.norm, loop: b.loop, base: rate, dop: o.doppler !== false, px: pos ? pos.x : 0, pz: pos ? pos.z : 0, vx: 0, vz: 0, stopping: false, dead: false };
  v.set = (g, r, tau) => {
    if (v.dead) return; const now = ctx.currentTime;
    if (g != null) vol.gain.setTargetAtTime(g * v.norm, now, tau || 0.12);
    if (r != null) { v.base = r; if (!pan || !v.dop) src.playbackRate.setTargetAtTime(r, now, tau || 0.12); }
  };
  v.stop = (rel) => {
    if (v.dead || v.stopping) return; v.stopping = true;
    const now = ctx.currentTime, r = rel == null ? (v.loop ? 0.35 : 0.08) : rel;
    env.gain.cancelScheduledValues(now); env.gain.setValueAtTime(env.gain.value, now); env.gain.linearRampToValueAtTime(0, now + r);
    try { src.stop(now + r + 0.02); } catch (e) { /* already stopped */ }
  };
  src.onended = () => { v.dead = true; A.voices.delete(v); try { src.disconnect(); env.disconnect(); vol.disconnect(); if (pan) pan.disconnect(); } catch (e) { /* gone */ } };
  src.start(t, b.loop && o.randomStart ? Math.random() * b.data.duration : 0);
  A.voices.add(v);
  return v;
}

/* The rider is the listener: at the bike, looking along the road. */
function updateListener(dt) {
  const bike = __tram.bike, G = __tram.G; if (!bike || !G) return;
  const L = A.L, x = bike.position.x, z = bike.position.z, f = __tram.frameAt(G.s), l = A.ctx.listener;
  if (dt > 0 && L.set) {
    const vx = (x - L.x) / dt, vz = (z - L.z) / dt;
    if (Math.hypot(vx, vz) < MAX_SPEED) { const k = Math.min(1, dt * 12); L.vx += (vx - L.vx) * k; L.vz += (vz - L.vz) * k; }
  } else if (!L.set) { L.vx = L.vz = 0; }
  L.x = x; L.z = z; L.set = true;
  if (l.positionX) {
    l.positionX.value = x; l.positionY.value = L.y; l.positionZ.value = z;
    l.forwardX.value = f.fx; l.forwardY.value = 0; l.forwardZ.value = f.fz; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
  } else { l.setPosition(x, L.y, z); l.setOrientation(f.fx, 0, f.fz, 0, 1, 0); }
}

/* Doppler: f' = f (c + vL.n) / (c + vS.n), n = unit vector listener -> source. Moving towards each other raises the pitch. */
function updateVoices(dt) {
  const L = A.L, now = A.ctx.currentTime;
  for (const v of A.voices) {
    if (!v.pan) continue;
    const p = v.follow ? v.follow.mesh.position : v.at;
    if (dt > 0) {
      const vx = (p.x - v.px) / dt, vz = (p.z - v.pz) / dt;
      if (Math.hypot(vx, vz) < MAX_SPEED) { const k = Math.min(1, dt * 12); v.vx += (vx - v.vx) * k; v.vz += (vz - v.vz) * k; }
    }
    v.px = p.x; v.pz = p.z;
    setPos(v.pan, p.x, p.y || 0, p.z);
    if (!v.dop || dt <= 0) continue;
    let dx = p.x - L.x, dz = p.z - L.z; const d = Math.max(0.5, Math.hypot(dx, dz)); dx /= d; dz /= d;
    const ratio = clamp((C + L.vx * dx + L.vz * dz) / (C + v.vx * dx + v.vz * dz), 0.5, 2);
    v.src.playbackRate.setTargetAtTime(v.base * ratio, now, 0.04);
  }
}

/* Pause and tab-hide: ramp the master down, then suspend a moment later (suspending mid-waveform would click). Resuming ramps it back up. */
function setHold(on) {
  const c = A.ctx; if (!c || A.holding === on) return;
  A.holding = on;
  if (on) {
    A.master.gain.cancelScheduledValues(c.currentTime); A.master.gain.setTargetAtTime(0, c.currentTime, 0.02); A.masterT = 0;
    setTimeout(() => { if (A.holding && c.state === "running") c.suspend(); }, 120);
  } else { A.masterT = -1; if (A.unlocked && c.state === "suspended") c.resume(); }
}

/* Once per frame, before the soundscape: pause with the game, mute with M, keep listener and positional voices current.
   Returns true when sounds should be updated this frame. */
function frame(dt) {
  const c = A.ctx; if (!c) return false;
  setHold(__tram.paused || document.hidden);
  if (A.unlocked && !A.holding && c.state !== "running" && c.state !== "closed") c.resume().catch(() => {});
  if (c.state !== "running" || A.holding) return false;
  const want = __tram.muted ? 0 : VOLUME.master;
  if (want !== A.masterT) { A.masterT = want; A.master.gain.setTargetAtTime(want, c.currentTime, 0.08); }
  updateListener(dt); updateVoices(dt);
  return true;
}

/* Level of everything that is playing (before the limiter): {rms, peak}. For debugging and tests. */
function meter() {
  if (!A.ctx || !A.master) return null;
  if (!A.an) { A.an = A.ctx.createAnalyser(); A.an.fftSize = 2048; A.anBuf = new Float32Array(2048); A.master.connect(A.an); }
  A.an.getFloatTimeDomainData(A.anBuf);
  let s = 0, p = 0; for (const v of A.anBuf) { s += v * v; p = Math.max(p, Math.abs(v)); }
  return { rms: +Math.sqrt(s / A.anBuf.length).toFixed(3), peak: +p.toFixed(2) };
}

__tram.sfx = {
  play: voice, meter,
  frame, listener: A.L, has: (name) => !!A.buf[name], buffers: A.buf, stats: () => ({ state: A.ctx && A.ctx.state, voices: A.voices.size,   // read-only peek for debugging: every positional voice, its pitch ratio and distance
    positional: [...A.voices].filter((v) => v.pan).map((v) => ({ name: v.name, of: v.follow ? v.follow.type : "fixed", rate: +v.src.playbackRate.value.toFixed(3), base: +v.base.toFixed(3), dist: +Math.hypot(v.px - A.L.x, v.pz - A.L.z).toFixed(1) })) })
};

document.addEventListener("visibilitychange", () => setHold(__tram.paused || document.hidden));
