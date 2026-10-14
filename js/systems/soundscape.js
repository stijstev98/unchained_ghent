/* What the game sounds like: which recording belongs to which thing, and when it plays. The engine itself
   (loading, loops, fades, panning, Doppler) is audio.js.
   - riderSounds():  loops that follow the player: tyres, pedalling, motor, wind, jacket, rain and the city. Each one
     is a voice that stays open and whose gain and pitch follow the ride, so it fades up and down with it.
   - objectLoops():  traffic that makes a sound as it goes (trams, cars, the BMW, the courier, other cyclists). Every
     one is a positional voice that follows its object, so it pans, fades with distance and gets Doppler-shifted as it
     passes. Only the nearest few are kept alive, and they fade out when their object is gone or knocked over.
   - __tram.snd.*:   one-off events called from the game code (bell, coin, crash...). */
import { __tram } from "../runtime.js";
import { VOLUME } from "./sound-config.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const jit = (r, a) => r * (1 + (Math.random() * 2 - 1) * a);
const play = (name, o) => __tram.sfx.play(name, o);
// play a one-off at its level from sound-config.js: key = the VOLUME entry that scales it
const P = (key, name, o) => play(name, Object.assign({}, o, { gain: (o && o.gain != null ? o.gain : 1) * VOLUME[key] }));
const smooth = (t) => t * t * (3 - 2 * t);
const MAX_OBJ_VOICES = 10;

/* ---------- traffic: sound layers per object type. gain/rate are read every frame; ref = metres before it fades with distance, max = metres where it is silent ---------- */
const TRAMS = ["tram_1", "tram_2"];
const pedalLoop = { vol: "cyclists", sound: () => "bike_pedaling", gain: () => 1, rate: (o) => 0.7 + 0.06 * Math.abs(o.v || 0), ref: 3, max: 30 };
const OBJ_LOOPS = {
  tram: [{ vol: "tram", sound: (o, s) => TRAMS[s.variant], gain: (o) => 0.55 + 0.45 * clamp(Math.abs(o.v || 0) / 1.5, 0, 1), rate: () => 1, ref: 14, max: 110 }],
  car: [{ vol: "car", sound: () => "engine", gain: () => 0.5, rate: (o) => 0.75 + 0.09 * Math.abs(o.v || 0), ref: 6, max: 60 }],
  // the BMW's engine winds up over its first second and a half, as the old growl did
  bmw: [{ vol: "bmw", sound: () => "engine", gain: () => 1, rate: (o, s) => 1 + 0.5 * clamp((__tram.G.t - s.t0) / 1.6, 0, 1), ref: 7, max: 90 }],
  ebike: [{ vol: "courier", sound: () => "escooter", gain: () => 1, rate: () => 1.1, ref: 5, max: 60 }],
  cyclist: [pedalLoop],
  drunk: [pedalLoop]
};
const tracked = new Set();
let frameNo = 0;

function objectLoops() {
  const G = __tram.G, L = __tram.sfx.listener, list = [];
  frameNo++;
  for (const o of G.objs) {
    const cfg = OBJ_LOOPS[o.type];
    if (!cfg || !o.active || o.dead || o.knocked) continue;
    const p = o.mesh.position;
    list.push({ o, cfg, d: Math.hypot(p.x - L.x, p.z - L.z) });
  }
  list.sort((a, b) => a.d - b.d);
  let budget = MAX_OBJ_VOICES;
  for (const { o, cfg, d } of list) {
    const s = o.snd || (o.snd = { t0: G.t, variant: Math.random() < 0.5 ? 0 : 1, v: [], seen: 0 });
    s.seen = frameNo; tracked.add(o);
    cfg.forEach((ly, i) => {
      let v = s.v[i]; if (v && v.dead) v = s.v[i] = null;
      if (d >= (v ? ly.max * 1.2 : ly.max) || budget <= 0) { if (v) { v.stop(); s.v[i] = null; } return; }
      budget--;
      if (!v) s.v[i] = __tram.sfx.play(ly.sound(o, s), { follow: o, gain: ly.gain(o, s) * VOLUME[ly.vol], rate: ly.rate(o, s), ref: ly.ref, randomStart: true });
      else v.set(ly.gain(o, s) * VOLUME[ly.vol], ly.rate(o, s));
    });
  }
  for (const o of tracked) if (o.snd.seen !== frameNo) { for (const v of o.snd.v) if (v) v.stop(); o.snd.v = []; tracked.delete(o); }
}

/* ---------- the rider ---------- */
const R = {}, NOOP = { set() {}, stop() {}, dead: true };
let squeal = null, wasBraking = false;
// a loop that stays open for the whole session; its gain and pitch are steered every frame
function ride(key, name) {
  let v = R[key];
  if (!v || v.dead) { v = __tram.sfx.play(name, { gain: 0 }); if (!v) return NOOP; R[key] = v; }
  return v;
}
function riderSounds() {
  const G = __tram.G, V = G.V || {}, m = V.model || {}, st = __tram.state, riding = st === "play" && !G.reason;
  const sp = G.speed || 0, rain = G.rain || 0, sprint = G.sprintK || 0, ground = riding && !(G.jy > 0.05);
  const ty = __tram.typeAt(G.s, G.u), cob = ty === "cobble" ? 1 : ty === "park" ? 0.4 : 0;   // the same roughness the camera bounce uses
  const spd = clamp(sp / 18, 0, 1.2);
  ride("roll", "tire_rolling").set((ground ? clamp(sp / 6, 0, 1) : 0) * 0.55 * (1 - 0.9 * cob) * (1 + 0.4 * rain) * VOLUME.tyres, 0.8 + 0.4 * spd);
  ride("cobble", "tire_cobblestone").set((ground ? clamp(sp / 5, 0, 1) * 0.6 * cob : 0) * VOLUME.cobblestone, 0.75 + 0.45 * spd);
  const pedalling = ground && !m.scooter && sp > 1.5 && !(__tram.keys.br && V.brakes);
  ride("pedal", "bike_pedaling").set((pedalling ? 0.3 + 0.9 * clamp((sp - 2) / 20, 0, 1) : 0) * VOLUME.pedalling, 0.7 + 0.5 * clamp(Math.min(sp * 1.7, 15) / 15, 0, 1));
  const motor = riding && (m.ebike || m.scooter);
  ride("motor", "escooter").set((motor ? (0.15 + 0.4 * clamp(sp / 20, 0, 1)) * (m.scooter ? 0.9 : 0.6) : 0) * VOLUME.motor, 0.75 + 0.8 * clamp(sp / 22, 0, 1.2));
  ride("wind", "wind_rush").set((riding ? 0.9 * Math.pow(clamp((sp - 3) / 20, 0, 1), 1.1) + 0.45 * sprint : 0) * VOLUME.wind, 0.75 + 0.35 * clamp(sp / 25, 0, 1.2));
  ride("flap", "fabric_flap").set((riding ? 0.55 * smooth(clamp((sp - 13) / 9, 0, 1)) + 0.25 * sprint : 0) * VOLUME.jacket, 0.85 + 0.3 * clamp(sp / 25, 0, 1.2));
  ride("rain", "rain").set(0.6 * rain * VOLUME.rain, 1, 0.4);
  ride("city", "ambient_city").set((st === "menu" ? 0.5 : 0.38 - 0.12 * rain) * VOLUME.city, 1, 0.5);
  // brake squeal: starts when you grab the brakes at speed, fades out when you let go or have nearly stopped
  const braking = riding && __tram.keys.br && V.brakes && sp > (wasBraking ? 3 : 7), sqRate = 0.8 + 0.3 * clamp(sp / 14, 0, 1), sqGain = 0.7 * clamp(sp / 16, 0.3, 1) * VOLUME.brakes;
  if (braking && !wasBraking) squeal = play("bike_brakes", { gain: sqGain, rate: sqRate });
  else if (braking && squeal && !squeal.dead) squeal.set(sqGain, sqRate);
  if (!braking && squeal) { squeal.stop(0.12); squeal = null; }
  wasBraking = braking;
}

/* ---------- events ---------- */
const HURT = ["voice_eek_1", "voice_eek_2", "voice_eek_sharp", "voice_ouch", "voice_woah"];
// what the rider hits decides the sound of the crash (the bike and the rider's voice always play)
const CRASH = {
  rail: { voice: "voice_eek_2" }, pothole: { voice: "voice_woah" },
  roadworks: { hit: "car_impact_short", voice: "voice_ouch" }, door: { hit: "car_impact_short", voice: "voice_ouch" },
  car: { hit: "car_impact", voice: "voice_eek_sharp" }, bmw: { hit: "car_impact", rate: 0.85, voice: "voice_eek_sharp" }, tram: { hit: "car_impact", rate: 0.7, voice: "voice_eek_1" },
  person: { voice: "voice_ouch" }
};
const SEMI = [0, 2, 4, 7, 9, 12, 14, 16];   // coins picked up in a row climb a pentatonic scale
let coinChain = 0, coinAt = 0, counter = null;
const where = (o, ref, maxDist) => o && o.mesh ? { follow: o, ref, maxDist } : {};

__tram.snd = {
  bell() { P("bell", "bike_bell_1", { gain: 0.6, rate: jit(1, 0.03) }); },
  ringRing(o) { P("courierBell", "bike_bell_2", Object.assign({ gain: 0.9 }, where(o, 6, 90))); },
  horn(o) { P("horn", "car_horn", Object.assign({ gain: 0.8 }, where(o, 8, 120))); },
  coin() {
    const t = performance.now(); coinChain = t - coinAt < 1100 ? Math.min(coinChain + 1, SEMI.length - 1) : 0; coinAt = t;
    P("coin", "coin_bing", { gain: 0.5, rate: Math.pow(2, SEMI[coinChain] / 12) });
  },
  helmetOn() { P("helmet", "coin_bing", { gain: 0.5, rate: 1.26 }); P("helmet", "coin_bing", { gain: 0.5, rate: 1.68, delay: 0.11 }); },
  helmetBreak() { this.clatter(0.6); P("carImpact", "car_impact_short", { gain: 0.7 }); P("riderVoice", "voice_aw_sad", { gain: 0.7, delay: 0.12 }); },
  nearMiss(o) {
    if (o && (o.type === "cyclist" || o.type === "drunk" || o.type === "ebike")) P("nearMiss", "voice_hey", Object.assign({ gain: 0.75, rate: jit(1, 0.1), delay: 0.1 }, where(o, 4, 50)));
    else P("nearMiss", "voice_woah", { gain: 0.5, rate: jit(1.1, 0.05) });
  },
  // the bike hitting the road: whenever the rider falls or runs into something (louder = harder)
  clatter(g) { P("bikeClatter", "bike_crash", { gain: g == null ? 0.9 : g, rate: jit(1, 0.05) }); },
  crash(reason) {
    const c = CRASH[reason] || CRASH.person;
    this.clatter(0.9);
    if (c.hit) P("carImpact", c.hit, { gain: 0.9, rate: c.rate || 1 });
    P("riderVoice", c.voice, { gain: 0.8, delay: 0.08, rate: jit(1, 0.04) });
  },
  // something is thrown into the air: a car crunches, bikes clatter, people shout
  launch(o, car) {
    if (car) { P("carImpact", "car_impact", Object.assign({ gain: 0.9 }, where(o, 8, 80))); return; }
    if (__tram.BIKES.includes(o.type)) P("bikeClatter", "bike_crash", Object.assign({ gain: 0.75 }, where(o, 5, 80)));
    P("victimVoice", __tram.pick(HURT), Object.assign({ gain: 0.8, delay: 0.06, rate: jit(1, 0.12) }, where(o, 4, 80)));
  },
  carBlast(o) { P("carImpact", "car_impact_short", Object.assign({ gain: 0.9, rate: 0.75 }, where(o, 8, 100))); },
  thud(o) { P("hits", "tire_bump", Object.assign({ gain: 0.6, rate: jit(0.85, 0.1) }, where(o, 4, 40))); },
  signDown(o) { this.clatter(0.5); P("hits", "car_impact_short", Object.assign({ gain: 0.5, rate: jit(1.3, 0.1) }, where(o, 5, 50))); },
  coneDown(o) { this.clatter(0.4); P("hits", "car_impact_short", Object.assign({ gain: 0.3, rate: jit(1.8, 0.1) }, where(o, 4, 40))); },
  doorBang(o) { this.clatter(0.5); P("hits", "car_impact_short", Object.assign({ gain: 0.8, rate: 0.8 }, where(o, 5, 50))); },
  // a parked car's door swinging open: a light, high "thunk" of the short impact (there is no door recording)
  doorOpen(o) { P("doorOpen", "car_impact_short", Object.assign({ gain: 0.35, rate: jit(1.4, 0.05) }, where(o, 5, 40))); },
  pothole() { P("pothole", "tire_bump", { gain: 0.9, rate: 0.7 }); },
  slip() { this.clatter(0.6); P("riderVoice", "voice_woah", { gain: 0.7, rate: jit(1, 0.05) }); },
  jump() { P("jump", "tire_bump", { gain: 0.35, rate: 1.4 }); },
  land() { P("landing", "tire_bump", { gain: 0.6, rate: 0.9 }); },
  clack() { P("railBump", "tire_bump", { gain: 0.3, rate: jit(1.5, 0.1) }); },
  yell(o) { P("shout", "voice_hey", Object.assign({ gain: 0.8, rate: jit(1, 0.12) }, where(o, 4, 50))); },
  // a pedestrian on the road is startled by the bell: a quiet yelp, a moment later
  bellStartle(o) { P("yelpOnBell", __tram.pick(["voice_hey", "voice_eek_1", "voice_eek_2", "voice_woah"]), Object.assign({ delay: 0.12 + Math.random() * 0.35, rate: jit(1, 0.15) }, where(o, 4, 40))); },
  ui(kind) {
    if (kind === "buy") { P("ui", "coin_bing", { gain: 0.5 }); P("ui", "coin_bing", { gain: 0.5, rate: 1.5, delay: 0.09 }); }
    else if (kind === "cash") P("ui", "coin_bing", { gain: 0.5, rate: 1.26 });
    else P("ui", "bike_bell_2", { gain: 0.45 });
  },
  // the coin counter on the game-over ticket: ticks for as long as the bar fills, then one last bing
  countStart() { this.countStop(); counter = P("coinCounter", "coins_count_up", { gain: 0.5, fadeIn: 0.08 }); },
  countStop(finished) {
    if (counter) { counter.stop(0.2); counter = null; if (finished) P("coinCounter", "coin_bing", { gain: 0.5, delay: 0.05 }); }
  }
};

/* Once per frame, after everything has been placed (so object positions are this frame's). */
__tram.audioUpdate = function audioUpdate(dt) {
  if (!__tram.sfx.frame(dt) || !__tram.G) return;
  riderSounds(); objectLoops();
};

__tram.__inits.push(() => {

// the first click, tap or key press unlocks audio (browsers keep it silent until then)
for (const ev of ["pointerdown", "keydown", "touchend"]) addEventListener(ev, () => __tram.audio(), { passive: true });

});
