/* Sample-level helpers for the sound library. Plain Float32Arrays in and out (no Web Audio here), so the same code
   runs in the game and in Node tests.

   Loops: a recording is never loop-ready as it comes. It may fade in and out, drift in level, or end on a different
   waveform value than it starts on, and every one of those is audible as a click or a pump once per cycle.
   prepareLoop() fixes that in three steps:
     1. keep the longest steady stretch of the file (trims fades and level drift),
     2. pick the tail position that matches the head best (cross-correlation), so tones and rhythms line up,
     3. cross-fade that tail into the head. The result starts exactly where the audio before its end would have gone on.
   Shots: prepareShot() bakes a few milliseconds of fade in and a short fade out into the buffer, so no shot starts or
   stops with a click, whatever speed it is played at. */

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function levels(chs) {
  let peak = 0, sum = 0, n = 0;
  for (const c of chs) { for (let i = 0; i < c.length; i++) { const v = c[i], a = v < 0 ? -v : v; if (a > peak) peak = a; sum += v * v; } n += c.length; }
  return { peak, rms: Math.sqrt(sum / Math.max(1, n)) };
}

export function toMono(chs) {
  if (chs.length === 1) return chs[0];
  const n = chs[0].length, m = new Float32Array(n), k = 1 / chs.length;
  for (const c of chs) for (let i = 0; i < n; i++) m[i] += c[i] * k;
  return m;
}

/* The longest stretch whose loudness (RMS, smoothed over half a second) stays close to the file's median.
   Returns {start, end} in samples; the whole file when no long enough steady stretch exists. */
export function findLoopRegion(mono, sr) {
  const win = Math.max(64, Math.round(sr * 0.05)), nw = Math.floor(mono.length / win);
  if (nw < 20) return { start: 0, end: mono.length };
  const env = new Float32Array(nw);
  for (let w = 0; w < nw; w++) { let s = 0; for (let i = w * win, e = i + win; i < e; i++) s += mono[i] * mono[i]; env[w] = Math.sqrt(s / win); }
  const R = 5, sm = new Float32Array(nw);
  for (let w = 0; w < nw; w++) { const a = Math.max(0, w - R), b = Math.min(nw - 1, w + R); let s = 0; for (let k = a; k <= b; k++) s += env[k]; sm[w] = s / (b - a + 1); }
  const med = Array.from(sm).sort((x, y) => x - y)[nw >> 1];
  const minLen = Math.max(40, Math.round(nw * 0.35));
  for (const [lo, hi] of [[0.7, 1.45], [0.6, 1.7]]) {
    let best = null, run = -1;
    for (let w = 0; w <= nw; w++) {
      const ok = w < nw && sm[w] >= lo * med && sm[w] <= hi * med;
      if (ok && run < 0) run = w;
      if (!ok && run >= 0) { if (!best || w - run > best.n) best = { w0: run, n: w - run }; run = -1; }
    }
    if (best && best.n >= minLen) return { start: best.w0 * win, end: (best.w0 + best.n) * win };
  }
  return { start: 0, end: mono.length };
}

/* Trim the region a little more so the loop starts and ends at the same loudness: tries starts from the first fifth
   and ends from the last fifth (every 50 ms) and keeps the pair whose `len`-sample windows are closest in level,
   with a small price for every bit of audio thrown away. */
export function matchLoopLevels(mono, start, end, len, sr) {
  const pre = new Float64Array(mono.length + 1);
  for (let i = 0; i < mono.length; i++) pre[i + 1] = pre[i] + mono[i] * mono[i];
  const rms = (a, b) => Math.sqrt((pre[b] - pre[a]) / Math.max(1, b - a)) + 1e-6;
  const hop = Math.round(sr * 0.05), span = Math.floor((end - start) * 0.2);
  let best = { cost: Infinity, start, end };
  for (let s = start; s <= start + span; s += hop) {
    const head = rms(s, s + len);
    for (let e = end; e >= end - span; e -= hop) {
      const db = Math.abs(20 * Math.log10(head / rms(e - len, e))), lost = ((s - start) + (end - e)) / (end - start);
      const cost = db + 10 * lost;
      if (cost < best.cost) best = { cost, start: s, end: e };
    }
  }
  return best;
}

/* Where should the loop end? Looks back from `end - xfade` for the position E whose next `xfade` samples look most
   like the samples at the loop start (normalised cross-correlation, coarse then fine). Returns {E, corr}. */
export function findLoopEnd(mono, start, end, xfade, sr) {
  const maxBack = Math.min(Math.round(sr * 0.6), Math.max(0, end - start - 3 * xfade));
  const score = (E, dec) => {
    const n = Math.floor(xfade / dec); let xy = 0, xx = 0, yy = 0;
    for (let k = 0; k < n; k++) { const x = mono[start + k * dec], y = mono[E + k * dec]; xy += x * y; xx += x * x; yy += y * y; }
    return xy / Math.sqrt(xx * yy + 1e-20);
  };
  let best = -2, bestE = end - xfade;
  for (let back = 0; back <= maxBack; back += 16) { const E = end - xfade - back, c = score(E, 16); if (c > best) { best = c; bestE = E; } }
  const lo = Math.max(start + 2 * xfade, bestE - 16), hi = Math.min(end - xfade, bestE + 16);
  let fine = -2, fineE = bestE;
  for (let E = lo; E <= hi; E++) { const c = score(E, 2); if (c > fine) { fine = c; fineE = E; } }
  return { E: fineE, corr: fine };
}

/* chs[start..E) with its first `xfade` samples replaced by a blend of the head and the audio that follows E.
   Equal gain for audio that is coherent (the same waveform), equal power for audio that is not (noise). */
export function crossfadeLoop(chs, start, E, xfade, coherent) {
  return chs.map((c) => {
    const o = c.slice(start, E);
    for (let i = 0; i < xfade; i++) {
      const t = (i + 0.5) / xfade, a = coherent ? t : Math.sin(t * Math.PI / 2), b = coherent ? 1 - t : Math.cos(t * Math.PI / 2);
      o[i] = c[start + i] * a + c[E + i] * b;
    }
    return o;
  });
}

/* Seamless loop out of a recording, plus the gain that brings it to a common loudness (RMS 0.1, never past a peak of 0.9). */
export function prepareLoop(chs, sr, opts) {
  const src = opts && opts.stereo ? chs : [toMono(chs)], mono = toMono(src);
  const found = findLoopRegion(mono, sr);
  const xfade = Math.max(Math.round(sr * 0.05), Math.min(Math.round(sr * 0.5), Math.floor((found.end - found.start) * 0.25)));
  const reg = matchLoopLevels(mono, found.start, found.end, xfade, sr);
  const m = findLoopEnd(mono, reg.start, reg.end, xfade, sr);
  const out = crossfadeLoop(src, reg.start, m.E, xfade, m.corr > 0.5), lv = levels(out);
  return { chs: out, norm: clamp(Math.min(0.1 / (lv.rms || 1), 0.9 / (lv.peak || 1)), 0.05, 8), info: { start: reg.start, end: m.E, xfade, corr: m.corr, length: m.E - reg.start, of: mono.length } };
}

/* One-shot: a 4 ms fade in and a 40 ms fade out baked in, normalised to a peak of 0.85. */
export function prepareShot(chs, sr, opts) {
  const src = opts && opts.stereo ? chs : [toMono(chs)];
  const n = src[0].length, fi = Math.min(Math.round(sr * 0.004), n >> 2), fo = Math.min(Math.round(sr * 0.04), n >> 2);
  const out = src.map((c) => {
    const o = Float32Array.from(c);
    for (let i = 0; i < fi; i++) o[i] *= i / fi;
    for (let i = 0; i < fo; i++) { const t = i / fo; o[n - 1 - i] *= t * t * (3 - 2 * t); }
    return o;
  });
  const lv = levels(out);
  return { chs: out, norm: clamp(0.85 / (lv.peak || 1), 0.25, 4), info: { length: n } };
}
