/* Vibration: a short buzz when a wheel crosses a tram rail, and a light tick on every cobblestone bump.
   Android browsers use the Vibration API. iPhones (iOS 18+ Safari) have no vibration API, so the game toggles a hidden
   switch control instead, which makes the system give a tick. The menu button hides itself where neither works.
   The on/off choice is saved on this device. */
import { __tram, $ } from "../runtime.js";

const KEY = "tramspoor3d-vibe";
__tram.vibeOn = true;
try { __tram.vibeOn = localStorage.getItem(KEY) !== "off"; } catch (e) {}
const canVibrate = typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const hapticSwitch = () => document.getElementById("hapticSwitch");
const hasHaptics = () => canVibrate || (isIOS && !!hapticSwitch());

function pulse(ms) {
  if (canVibrate) navigator.vibrate(ms);
  else if (isIOS && hapticSwitch()) hapticSwitch().click();   // iOS gives a tick; its length cannot be set
}

// only while riding: not in the menu, paused, crashed or on the game-over screen
__tram.buzz = function buzz(ms) {
  if (!__tram.vibeOn || !hasHaptics() || __tram.state !== "play" || __tram.paused || __tram.G.reason) return;
  pulse(ms);
};

__tram.railBuzz = function railBuzz() { __tram.buzz(25); };

// the camera bounce on cobbles repeats about every 1.2 m; buzz once per repeat, and only when moving
let cobbleNextS = 0;
__tram.cobbleBuzz = function cobbleBuzz(s, speed) {
  if (speed < 3) return;
  if (s < cobbleNextS - 2) cobbleNextS = s;   // a new ride started
  if (s < cobbleNextS) return;
  cobbleNextS = s + 1.2;
  __tram.buzz(8);
};

__tram.__inits.push(() => {
  const b = $("vibeBtn");
  if (!hasHaptics()) { b.style.display = "none"; return; }
  const show = () => { b.setAttribute("aria-pressed", String(__tram.vibeOn)); b.textContent = "Vibration: " + (__tram.vibeOn ? "on" : "off"); };
  b.addEventListener("click", () => {
    __tram.vibeOn = !__tram.vibeOn;
    try { localStorage.setItem(KEY, __tram.vibeOn ? "on" : "off"); } catch (e) {}
    show();
    if (__tram.vibeOn) pulse(20);   // a quick preview so you can feel it
    b.blur();
  });
  show();
});
