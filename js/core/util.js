/* Small random, clamp and hash helpers. */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

__tram.reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;
__tram.rnd=(a,b)=>a+Math.random()*(b-a), __tram.ri=(a,b)=>Math.floor(__tram.rnd(a,b+1)), __tram.pick=a=>a[__tram.ri(0,a.length-1)];
__tram.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
__tram.hash=n=>{n=Math.sin(n*127.1+311.7)*43758.5453;return n-Math.floor(n)};

});
