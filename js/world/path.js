/* The bending centreline every mesh and rider is placed on. */
import { __tram, T, $ } from "../runtime.js";

__tram.randomCurve=function randomCurve(){ __tram.CV={a1:__tram.rnd(9,16),w1:__tram.rnd(110,150),p1:__tram.rnd(0,6.28),a2:__tram.rnd(4,7),w2:__tram.rnd(45,62),p2:__tram.rnd(0,6.28),a3:__tram.rnd(1,2.6),w3:__tram.rnd(26,36),p3:__tram.rnd(0,6.28)}; }
__tram.uoffAt=function uoffAt(s){ let o=0; if(__tram.G&&__tram.G.uoff) for(const e of __tram.G.uoff) if(s>=e[0]){ const t=Math.min(1,Math.max(0,(s-e[0]-__tram.UR0)/__tram.UR1)); o+=e[1]*(1-t*t*(3-2*t)); } return o; }
__tram.frameAt=function frameAt(s){ const d=__tram.dcx(s),n=Math.hypot(d,1), U=__tram.uoffAt(s); return {x:__tram.cx(s)+U/n,z:-s+U*d/n,fx:d/n,fz:-1/n,rx:1/n,rz:d/n}; }
// anything that moves across a shift line keeps its place on the road
__tram.crossRebase=function crossRebase(o,a,b){ let ch=false; if(__tram.G.uoff) for(const e of __tram.G.uoff){ if(a<e[0]&&b>=e[0]){ o.u-=e[1]; ch=true; } else if(a>=e[0]&&b<e[0]){ o.u+=e[1]; ch=true; } } return ch; }
__tram.P=function P(u,s){ const f=__tram.frameAt(s); return [f.x+u*f.rx, f.z+u*f.rz]; }
__tram.place=function place(o,u,s,y,extra){ const f=__tram.frameAt(s); o.position.set(f.x+u*f.rx,y||0,f.z+u*f.rz); o.rotation.y=Math.atan2(-f.fx,-f.fz)+(extra||0); }

__tram.__inits.push(() => {

// the road's bends are three overlapping waves; each ride gets new amplitudes, lengths and phases
__tram.CV={a1:16,w1:120,p1:0,a2:7,w2:53,p2:1.3,a3:2.2,w3:31,p3:0.4};
__tram.cx=s=>__tram.CV.a1*Math.sin(s/__tram.CV.w1+__tram.CV.p1)+__tram.CV.a2*Math.sin(s/__tram.CV.w2+__tram.CV.p2)+__tram.CV.a3*Math.sin(s/__tram.CV.w3+__tram.CV.p3);
__tram.dcx=s=>__tram.CV.a1/__tram.CV.w1*Math.cos(s/__tram.CV.w1+__tram.CV.p1)+__tram.CV.a2/__tram.CV.w2*Math.cos(s/__tram.CV.w2+__tram.CV.p2)+__tram.CV.a3/__tram.CV.w3*Math.cos(s/__tram.CV.w3+__tram.CV.p3);
// after a junction the road carries on along the branch you took: the centreline shifts sideways from there
__tram.UR0=150, __tram.UR1=800;

});
