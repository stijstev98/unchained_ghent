/* Street furniture, signs and hazards. The shapes are OBJ files in assets/models/props; this file only picks
   the file, fills in the material slots the game decides per copy (colours, sign pictures) and adds the random extras.
   Things that break apart when hit (cones, roadworks signs) are loaded as separate pieces (opts.parts). */
import { __tram, T, $ } from "../runtime.js";

// historic core: dark lanterns on a curved bracket; docks: tall double masts; newer streets: slim anthracite masts with an LED head
__tram.makeLamp=function makeLamp(style){ return __tram.model("props/lamp-"+(style==="gable"||style==="industrial"?style:"town")); }

__tram.makeBench=function makeBench(){ return __tram.model("props/bench"); }

// kinds: bags, crate, bin, pizza, can, paper (anything else is a flyer)
__tram.makeTrash=function makeTrash(kind){
  const over={};
  if(kind==="crate") over.crate=__tram.pick([0xc8202a,0xf2c230,0x2f5aa0]);
  else if(kind==="can") over.can=__tram.pick([0xc8202a,0x3d6fb0,0xd9d4c7,0x2f7a3a]);
  else if(kind==="paper") over.paper=__tram.pick([0xf4f1ea,0xffe14a,0xff4fa3]);
  const g=__tram.model("props/trash-"+(["bags","crate","bin","pizza","can"].includes(kind)?kind:"paper"),{over});
  if(kind!=="bags"&&kind!=="bin") g.rotation.y=__tram.rnd(0,3);
  return g;
}

// 'frame' = frame colour; some bikes carry a wooden box
__tram.makeParkedBike=function makeParkedBike(frameC){
  const g=__tram.model("props/parked-bike",{over:{frame:frameC}});
  if(Math.random()<0.4) g.add(__tram.model("props/bike-basket"));
  return g;
}

// n = 3..5 holders; the rack is the OBJ, the bikes in it are parked-bike copies
__tram.makeBikeRack=function makeBikeRack(n){
  const g=__tram.model("props/bike-rack-"+n), len=(n-1)*0.4+0.6;
  for(let i=0;i<n;i++){
    const z=-len/2+0.3+i*0.4, hi=i%2===0;
    if(Math.random()<0.75){ const b=__tram.makeParkedBike(__tram.pick([0x1f2a3a,0x8e2f2f,0xd8d1c3,0x2f5a4a,0x111111,0x6a8fb0,0x5e3220])); b.position.set(0.15,hi?0.12:0,z); b.rotation.y=Math.PI/2; if(hi) b.rotation.z=-0.08; g.add(b); }
  }
  return g;
}

// Belgian road signs: plate on a grey pole, the picture ('sign_face') comes from textures/signs/road-<kind>.png
__tram.makeRoadSign=function makeRoadSign(kind){
  const tall=kind==="lez"||kind==="zone30"||kind==="bikestreet30";
  return __tram.model(tall?"props/road-sign-tall":"props/road-sign",{over:{sign_face:__tram.roadSignMat(kind)}});
}

// street-type sign, picture from textures/signs/type-<type>.png
__tram.makeTypeSign=function makeTypeSign(type){
  const front=__tram.typeSignMats[type]||(__tram.typeSignMats[type]=__tram.lam(0xffffff,{map:__tram.typeSignTex(type)}));
  return __tram.model("props/type-sign",{over:{sign_face:front}});
}

__tram.stopFaces={};
__tram.makeTramStop=function makeTramStop(bus){
  const k=bus?"bus":"tram", face=__tram.stopFaces[k]||(__tram.stopFaces[k]=__tram.lam(0xffffff,{map:bus?__tram.busStopTex:__tram.stopTex}));
  return __tram.model("props/tram-stop",{over:{stop_sign:face}});
}

__tram.makeStopKerb=function makeStopKerb(){ return __tram.model("props/stop-kerb"); }

__tram.makeBladeSign=function makeBladeSign(i){ return __tram.model("props/blade-sign",{over:{blade_face:__tram.bladeMat(i)}}); }

// adds a cone to g at x,z; its pieces stay separate so they can scatter
__tram.makeTrafficCone=function makeTrafficCone(g,x,z){
  for(const m of [...__tram.model("props/traffic-cone",{parts:true}).children]){ m.position.x+=x; m.position.z+=z; g.add(m); }
}
__tram.makeWarnCone=function makeWarnCone(){ const g=new T.Group(), c=new T.Group(); __tram.makeTrafficCone(c,0,0); c.scale.setScalar(1.35); for(const ch of [...c.children]){ ch.position.multiplyScalar(1.35); ch.scale.multiplyScalar(1.35); g.add(ch); } return g; }

__tram.makePothole=function makePothole(){ return __tram.model("props/pothole"); }
__tram.makeVomit=function makeVomit(){ return __tram.model("props/vomit"); }
__tram.makeCub=function makeCub(){ return __tram.model("props/coin"); }
__tram.makeRwSign=function makeRwSign(){ return __tram.model("props/roadworks-sign",{parts:true}); }

// pit and barrier are OBJ ('lamp' is the flashing lamp the game animates); the worker is still built in code
__tram.makeRoadworks=function makeRoadworks(){
  const lampMat=new T.MeshBasicMaterial({color:0xffb21e}), g=__tram.model("props/roadworks",{over:{lamp:lampMat}});
  const w=__tram.makeWorker(); w.position.set(0.35,0,-1.65); w.rotation.y=Math.PI+0.25; g.add(w);
  g.userData={lamp:lampMat,head:w.userData.head};
  return g;
}

// a home-made kicker: trash bags and cardboard boxes piled up with boards laid across, low end towards the rider (+z).
// RAMP_L long, rising to RAMP_H at the far end (-z)
__tram.RAMP_L=3.2; __tram.RAMP_H=0.75;
__tram.rampMats=null;
__tram.makeRamp=function makeRamp(){
  const M=__tram.rampMats||(__tram.rampMats={bag:__tram.lam(0x1d1f22),bagB:__tram.lam(0x3a4048),box:__tram.lam(0xb3874f),boxD:__tram.lam(0x8f6a3c),tape:__tram.lam(0xd8c79a),
    wood:[__tram.lam(0x9c7448),__tram.lam(0x7d5a36),__tram.lam(0xb08a5c)]});
  const g=new T.Group(), L=__tram.RAMP_L, H=__tram.RAMP_H, hAt=z=>H*(L/2-z)/L;
  // trash bags under the low and middle part, squashed to fit under the boards
  for(const [x,z] of [[-0.55,-0.45],[0,-0.35],[0.55,-0.5],[-0.35,0.45],[0.35,0.4],[0,0.95]]){
    const h=hAt(z+0.3), b=new T.Mesh(__tram.sph(0.38,10,8),Math.random()<0.7?M.bag:M.bagB);
    b.scale.set(__tram.rnd(0.95,1.15),h/0.76,__tram.rnd(0.9,1.1)); b.position.set(x,h/2,z); b.rotation.y=__tram.rnd(0,3); b.castShadow=b.receiveShadow=true; g.add(b);
  }
  // cardboard boxes hold up the high end
  for(const x of [-0.45,0.45]){
    const bh=hAt(-1.2)-0.04, b=__tram.BX(g,Math.random()<0.5?M.box:M.boxD,0.7,bh,0.75,x,bh/2,-1.2); b.rotation.y=__tram.rnd(-0.12,0.12);
    __tram.BX(g,M.tape,0.12,0.012,0.76,x,bh+0.006,-1.2).rotation.y=b.rotation.y;
  }
  __tram.BX(g,M.boxD,0.45,0.4,0.45,0.95,0.2,-1.0).rotation.y=0.4;
  __tram.BX(g,M.box,0.4,0.32,0.4,-1.0,0.16,-0.15).rotation.y=-0.5;
  // more bags spilling out at the sides, so the pile shows from behind the boards too
  for(const [x,z,r] of [[-1.05,0.6,0.34],[1.05,-0.25,0.38],[0.95,0.75,0.28],[-1.0,-1.25,0.3]]){
    const b=new T.Mesh(__tram.sph(r,10,8),Math.random()<0.7?M.bag:M.bagB);
    b.scale.set(1,0.85,__tram.rnd(0.9,1.15)); b.position.set(x,r*0.8,z); b.rotation.y=__tram.rnd(0,3); b.castShadow=b.receiveShadow=true; g.add(b);
  }
  // the boards, laid side by side along the slope
  const ang=Math.atan2(H,L), len=Math.hypot(L,H)+0.1;
  [-0.62,-0.2,0.22,0.63].forEach((x,i)=>{
    const p=__tram.BX(g,M.wood[i%3],0.4,0.05,len,x+__tram.rnd(-0.03,0.03),H/2+0.03,__tram.rnd(-0.06,0.06));
    p.rotation.set(ang,__tram.rnd(-0.03,0.03),0,"YXZ");
  });
  // loose rubbish around the foot of the pile
  for(const [k,x,z] of [["can",-1.1,0.9],["pizza",1.05,0.3],["paper",-0.95,-0.9]]){ const t=__tram.makeTrash(k); t.position.set(x,0,z); g.add(t); }
  return g;
}

// villa garden hedge with gate pillars; w = 15, 18 or 21 m
__tram.makeHedge=function makeHedge(w){ return __tram.model("props/hedge-"+w); }
