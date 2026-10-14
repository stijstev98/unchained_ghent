/* Adaptive resolution. Frame time is watched over short windows: when the game runs well below the display's refresh rate the
   canvas drops one step in pixel ratio, and when it has had headroom for a few seconds it climbs back up. A step that did not
   work (the frame time fell apart again) is not tried again for 20 s, so the picture does not flicker between two sizes.
   The pixel ratio is the one thing that scales GPU cost directly: 1.75 draws about 3 times the pixels of 1.0. */
import { __tram, T } from "../runtime.js";

const STEP = 0.25, WINDOW = 45, HITCH_MS = 250, RETRY_MS = 20000;

__tram.__inits.push(() => {

const max = __tram.renderer.getPixelRatio(), min = Math.min(__tram.PIXEL.min, max), size = new T.Vector2();
const Q = __tram.quality = { max, min, ratio: max, n: 0, sum: 0, best: 1000 / 30, good: 0, retryAt: {} };

function apply(ratio) {
  Q.ratio = ratio;
  __tram.renderer.getSize(size); __tram.renderer.setPixelRatio(ratio); __tram.renderer.setSize(size.x, size.y, false);
}

/* Call once per frame with the time since the previous frame (ms). */
__tram.adaptQuality = function adaptQuality(ms) {
  if (max <= min || document.hidden || ms > HITCH_MS) return;   // nothing to scale, or a tab switch: not a measurement
  if (ms > 5) Q.best = Math.min(Q.best, ms);                     // the display's refresh interval, as the shortest frame seen
  Q.sum += ms;
  if (++Q.n < WINDOW) return;
  const avg = Q.sum / Q.n, ref = Math.min(17, Math.max(14, Q.best)), now = performance.now();
  Q.n = 0; Q.sum = 0;
  if (avg > ref * 1.35 && Q.ratio > min) {
    Q.retryAt[Q.ratio] = now + RETRY_MS; Q.good = 0;
    apply(Math.max(min, Q.ratio - STEP));
  } else if (avg < ref * 1.12) {
    if (++Q.good >= 5 && Q.ratio < max && now > (Q.retryAt[Q.ratio + STEP] || 0)) { Q.good = 0; apply(Math.min(max, Q.ratio + STEP)); }
  } else Q.good = 0;
};

});
