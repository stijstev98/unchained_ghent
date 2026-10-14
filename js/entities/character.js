/* Shared low-poly body, head and face kit. */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

/* ================= actors ================= */
__tram.AM={
  glass:__tram.lam(0x2a3a48), dark:__tram.lam(0x26292d),
  head:__tram.basic(0xfff3cf), tail:__tram.basic(0xff3b2e), tyre:__tram.lam(0x1a1c1f), steel:__tram.lam(0xb8c0c7), chrome:__tram.lam(0xeef1f3),
  shoe:__tram.lam(0x24262a), shoeW:__tram.lam(0xe9e7e2), map:__tram.lam(0xf6f1e6,{side:T.DoubleSide}), eye:__tram.lam(0x16181b), belt:__tram.lam(0x3a2a20),
};
__tram.SKINS=[0xf0c8a0,0xd99c6e,0x9a6440,0xf6d9bc,0xc28456];
__tram.HAIRS=[0x2b1d14,0x6b4a2b,0xe0b86a,0x8a8a8a,0x1a1a1a,0xa0522d];

/* -- low-poly body kit shared by every character: faceted lathes and prisms, nothing round -- */
__tram.facet=g=>{ const n=g.toNonIndexed(); n.computeVertexNormals(); return n; };
__tram.flathe=(key,pts,seg,sz,rot)=>__tram.cached(key,()=>{ const g=new T.LatheGeometry(pts.map(q=>new T.Vector2(q[0],q[1])),seg); if(sz) g.scale(1,1,sz); if(rot) g.rotateY(rot); return __tram.facet(g); });
__tram.fcyl=(rt,rb,h,seg)=>__tram.cached(`fc${rt}_${rb}_${h}_${seg}`,()=>__tram.facet(new T.CylinderGeometry(rt,rb,h,seg||6)));
__tram.fsph=r=>__tram.cached(`fs${r}`,()=>new T.IcosahedronGeometry(r,1));
__tram.fbox=(w,h,d)=>__tram.cached(`fb${w}_${h}_${d}`,()=>new T.BoxGeometry(w,h,d));
// torso: ten-sided, shoulders wider than the waist, rounded off at the collar. Hips: a short ten-sided barrel.
__tram.TORSO=__tram.flathe("torso",[[0,0],[0.17,0],[0.186,0.05],[0.176,0.16],[0.184,0.28],[0.208,0.4],[0.216,0.49],[0.205,0.56],[0.16,0.615],[0.09,0.645],[0,0.655]],10,0.62,Math.PI/10);
__tram.HIPS=__tram.flathe("hips",[[0,-0.12],[0.12,-0.115],[0.17,-0.06],[0.185,0.0],[0.175,0.08],[0.12,0.12],[0,0.12]],10,0.7,Math.PI/10);
// limbs are six-sided prisms lathed from a profile (fraction along the bone, radius): shoulder, biceps, elbow, forearm, wrist; hip, thigh, knee, calf, ankle
__tram.PROF={up:[[0,0.058],[0.12,0.063],[0.45,0.055],[0.8,0.047],[1,0.042]],fo:[[0,0.043],[0.18,0.05],[0.45,0.046],[0.85,0.034],[1,0.031]],
  th:[[0,0.09],[0.12,0.092],[0.5,0.08],[0.85,0.064],[1,0.058]],sh:[[0,0.058],[0.12,0.06],[0.32,0.066],[0.62,0.05],[0.9,0.038],[1,0.036]]};
// shoe: extruded sneaker profile, origin under the ankle
__tram.SHOE_G=__tram.cached("shoeG",()=>{ const sh=new T.Shape(); [[-0.11,0],[0.15,0],[0.175,0.025],[0.16,0.065],[0.07,0.085],[-0.02,0.11],[-0.1,0.115],[-0.125,0.06]].forEach((q,i)=>i?sh.lineTo(q[0],q[1]):sh.moveTo(q[0],q[1])); sh.closePath();
  const g=new T.ExtrudeGeometry(sh,{depth:0.075,bevelEnabled:true,bevelThickness:0.014,bevelSize:0.012,bevelSegments:1,curveSegments:2}); g.rotateY(Math.PI/2); g.translate(-0.037,0,0); return g; });
__tram.SOLE=__tram.plain(0xf2efe8);
// head: a ten-sided egg with a jaw, flat face panel at the front; boxy ears, eyes, brows, a pyramid nose and a mouth
__tram.HEAD_G=__tram.flathe("headG",[[0,-0.15],[0.055,-0.148],[0.09,-0.12],[0.112,-0.07],[0.128,0.0],[0.136,0.06],[0.128,0.11],[0.1,0.15],[0.055,0.175],[0,0.182]],10,1.06,Math.PI/10);
__tram.NOSE_G=__tram.cached("nose",()=>{ const g=new T.ConeGeometry(0.022,0.062,4); g.rotateX(-Math.PI/2); g.rotateZ(Math.PI/4); return __tram.facet(g); });
__tram.EYEW=__tram.lam(0xf6f4ee), __tram.LIPS=__tram.lam(0x9a4a40);
// hair: a faceted cap that sits clearly proud of the skull, ending just above the brows, plus a nape piece that
// wraps the back and sides below it (short, or long down to the shoulders), a fringe slab on the forehead
__tram.HAIRCAP=__tram.flathe("haircap",[[0,0.2],[0.08,0.196],[0.13,0.168],[0.155,0.115],[0.16,0.07],[0.128,0.07]],10,1.06,Math.PI/10);
__tram.napeGeo=(key,pts,arc)=>__tram.cached(key,()=>{ const a=arc||0.9; const g=new T.LatheGeometry(pts.map(q=>new T.Vector2(q[0],q[1])),7,-(Math.PI/2-a/2),Math.PI-a); g.scale(1,1,1.06); return __tram.facet(g); });
__tram.NAPE_SHORT=__tram.napeGeo("napeS",[[0.128,0.075],[0.158,0.07],[0.16,0.0],[0.15,-0.06],[0.118,-0.075]]);
__tram.NAPE_LONG=__tram.napeGeo("napeL",[[0.128,0.075],[0.158,0.07],[0.162,0.0],[0.165,-0.1],[0.17,-0.22],[0.1,-0.26]],1.35);
__tram.DOME=(key,r)=>__tram.flathe(key,[[0,r*1.02],[r*0.5,r*0.96],[r*0.85,r*0.6],[r,0],[r*0.85,0]],10,1,Math.PI/10);
__tram.HAIR_STYLES=["short","short","long","bun","pony","short","long"];
__tram.ELL=(key,x,y,z)=>__tram.cached("e"+key,()=>{ const g=new T.IcosahedronGeometry(1,1); g.scale(x,y,z); return g; });
__tram.HAND_G=__tram.fbox(0.065,0.05,0.085), __tram.HAND_P=__tram.fbox(0.06,0.09,0.04);
__tram.BAND=__tram.cached("band",()=>{ const g=new T.CylinderGeometry(0.205,0.205,0.045,10,1,true); g.rotateY(Math.PI/10); g.scale(1,1,0.66); return __tram.facet(g); });

});
