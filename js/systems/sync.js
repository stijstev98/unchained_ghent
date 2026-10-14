/* Per-frame placement of riders, traffic, rain and the camera. */
import { __tram, T, $ } from "../runtime.js";

__tram.sync=function sync(dt){
  for(const o of __tram.G.objs){
    const m=o.mesh;
    if(o.type==="cub"){ __tram.place(m,o.u,o.s,0.85+Math.sin(__tram.G.t*3+o.s)*0.1); m.rotation.y+=__tram.G.t*3; }
    else if(o.type==="helmet"){
      __tram.place(m,o.u,o.s,0.95+Math.sin(__tram.G.t*2.5+o.s)*0.12);
      m.userData.inner.rotation.y=__tram.G.t*1.8; const p=1+Math.sin(__tram.G.t*5)*0.08; m.userData.ring.scale.set(p,p,p);
    }
    else if(o.type==="tram"){
      __tram.place(m,o.u,o.s,0,o.onc?Math.PI:0);
      const near=Math.abs(o.u-__tram.G.u)<3.6&&Math.abs(o.s-__tram.G.s)<o.hl+8;
      o.fadeT=(o.fadeT==null?1:o.fadeT)+((near?0.3:1)-(o.fadeT==null?1:o.fadeT))*Math.min(1,dt*6); __tram.setFade(m,o.fadeT);
    }
    else if(o.type==="tourist"){
      __tram.place(m,o.u,o.s,0.13+(o.y||0),o.knocked?o.kyaw:(o.vu>0?-Math.PI/2:Math.PI/2));
      __tram.animPerson(m,o.knocked?o.step+o.kt*18:o.step); if(o.knocked){ const b=m.userData.body; if(o.fly){ b.rotation.z=o.spin; b.rotation.x=o.spin*0.5; } else { b.rotation.z=o.kdir*1.5; b.rotation.x=0; } }
    }
    else if(o.type==="cyclist"||o.type==="ebike"){
      __tram.place(m,o.u,o.s,o.y||0,o.knocked?0:-(o.yaw||0)); __tram.animCyclist(m,-o.phase,o.knocked?0:o.v*dt);
      if(o.knocked){ const n=m.userData.inner; if(o.fly){ n.rotation.z=o.spin*0.6; n.rotation.x=o.spin*0.35; } else { n.rotation.z=o.kdir*1.4; n.rotation.x=0; } }
    }
    else if(o.type==="roadworks"){
      __tram.place(m,o.u,o.s,0.005);
      m.userData.lamp.color.setHex((__tram.G.t*2.2)%1<0.5?0xffb21e:0x4a3208);
      m.userData.head.rotation.y=Math.sin(__tram.G.t*0.6+o.s)*0.35;
    }
    else if(o.type==="rwsign") __tram.place(m,o.u,o.s,0);
    else if(o.type==="vomit") __tram.place(m,o.u,o.s,0.02);
    else if(o.type==="pothole") __tram.place(m,o.u,o.s,0.0);
    else if(o.type==="cone") __tram.place(m,o.u,o.s,0);
    else if(o.type==="walker"){
      __tram.place(m,o.u,o.s,0.02+(o.y||0),(o.v>0?0:Math.PI)-(o.knocked?0:(o.yaw||0))*(o.v>0?1:-1));
      __tram.animPerson(m,o.knocked?o.step+o.kt*18:o.step); if(o.knocked){ const b=m.userData.body; if(o.fly){ b.rotation.z=o.spin; b.rotation.x=o.spin*0.5; } else { b.rotation.z=o.kdir*1.5; b.rotation.x=0; } }
    }
    else if(o.type==="drunk"){
      __tram.place(m,o.u,o.s,o.y||0); m.userData.inner.rotation.z=o.knocked?(o.fly?o.spin*0.6:o.kdir*1.4):-(o.vu2||0)*0.12; m.userData.inner.rotation.x=o.knocked&&o.fly?o.spin*0.35:0; __tram.animCyclist(m,-o.phase,o.knocked?0:o.v*dt);
      m.userData.icon.position.y=2.45+Math.sin(__tram.G.t*4+o.ph)*0.07;
    }
    else {
      __tram.place(m,o.u,o.s,o.y||0,o.knocked||o.type==="parked"?0:-(o.yaw||0)); if(m.userData.door) m.userData.door.rotation.y=o.side*o.door*1.1;
      if(o.knocked){
        // cars barrel-roll through the air and come down on their wheels or their roof
        if(o.fly){ m.rotation.z=o.spin*0.55; m.rotation.x=o.spin*0.18; }
        else { const turns=Math.round(m.rotation.z/Math.PI); m.rotation.z=turns*Math.PI; m.rotation.x=0; if(Math.abs(turns)%2===1) m.position.y+=1.5; }
      }
    }
  }
  for(const o of __tram.G.objs) if(o.knocked&&o.smokeAcc>1){
    while(o.smokeAcc>1){ o.smokeAcc--; const [x,z]=__tram.P(o.u+__tram.rnd(-0.3,0.3),o.s+__tram.rnd(-0.6,0.6)); __tram._tA.set(x,0.12,z); __tram.emitSmoke(__tram._tA); }
  }
  __tram.place(__tram.bike,__tram.G.u,__tram.G.s,__tram.G.jy||0);
  const sprintingNow=__tram.state==="play"&&!__tram.G.reason&&!!__tram.G.sprinting;
  const standing=__tram.G.V.model.scooter;
  __tram.G.stand+=((sprintingNow&&!standing?1:0)-__tram.G.stand)*Math.min(1,dt*6);
  __tram.bike.userData.stand=__tram.G.stand;
  __tram.bike.userData.air+=((__tram.G.jy>0.05?1:0)-__tram.bike.userData.air)*Math.min(1,dt*12);
  const sway=standing?0:Math.sin(__tram.G.pedal)*(0.02+__tram.G.stand*0.11);
  const lean=__tram.G.reason?Math.min(1.35,__tram.G.crashT*4)*(__tram.G.vu>=0?-1:1):(-__tram.G.lean*1.05+sway+(__tram.G.groove>0?Math.sin(__tram.G.t*55)*0.1:0));
  __tram.bike.userData.inner.rotation.z=lean;
  __tram.bike.userData.inner.rotation.x=(__tram.G.jy>0?-__tram.clamp(__tram.G.jv*0.06,-0.25,0.25):0)-__tram.G.bump*0.04;
  const curT=__tram.typeAt(__tram.G.s,__tram.G.u), rough=__tram.state!=="menu"&&!__tram.G.reason?(curT==="cobble"?1:(curT==="park"?0.35:0)):0;
  const bounce=rough?(Math.sin(__tram.G.s*5.1)*0.6+Math.sin(__tram.G.s*12.7)*0.4)*0.03*rough*__tram.clamp(__tram.G.speed/9,0.4,1.6):0;
  __tram.bike.userData.inner.position.y=Math.max(0,bounce)*0.8;
  if(rough===1) __tram.cobbleBuzz(__tram.G.s,__tram.G.speed);
  __tram.bike.visible=!(__tram.G.inv>0&&(__tram.G.t*12)%1<0.4);
  __tram.playerHelmet.visible=__tram.G.helmet;
  __tram.animCyclist(__tram.bike,-__tram.G.pedal,__tram.G.speed*dt);
  // camera
  const sk=__tram.clamp((__tram.G.speed-17)/12,0,1);
  // how far you are from cruising pace to full sprint pace (0..1): drives the FOV push and the wind
  const cv=__tram.G.cruiseV||9, sv=__tram.G.sprintV||cv;
  const sp=__tram.state==="play"&&!__tram.G.reason&&sv>cv+0.5?__tram.clamp((__tram.G.speed-cv-0.3)/(sv-cv-0.3),0,1):0;
  __tram.G.sprintK=sp*sp*(3-2*sp);
  const vc=__tram.laneCentre(__tram.G.s), du=__tram.G.u-vc;
  // faster: the camera eases in behind the rider instead of hanging back. The smoothing below only softens sideways and
  // vertical moves: along the road the camera travels with the rider, otherwise it would trail by speed/6 metres
  // (1.6 m at cruise, 3.5 m at a sprint) and pull away exactly when you accelerate.
  const back=__tram.G.s-(6.8+1.5*__tram.clamp(__tram.G.speed/10,0,1)-sk*1.05), [bx,bz]=__tram.P(__tram.laneCentre(back)+du*0.65,back), [lx,lz]=__tram.P(__tram.laneCentre(__tram.G.s+11)+du*0.8,__tram.G.s+11);
  __tram.tmpP.set(bx,2.95-sk*0.45+(__tram.G.jy||0)*0.4,bz); __tram.tmpL.set(lx,1.1+(__tram.G.jy||0)*0.5,lz);
  if(!__tram.G.camInit){ __tram.camPos.copy(__tram.tmpP); __tram.camLook.copy(__tram.tmpL); __tram.camPrevP.copy(__tram.tmpP); __tram.camPrevL.copy(__tram.tmpL); __tram.G.camInit=true; }
  else {
    const f=__tram.frameAt(__tram.G.s), D=__tram.camD;
    for(const [pos,tgt,prev] of [[__tram.camPos,__tram.tmpP,__tram.camPrevP],[__tram.camLook,__tram.tmpL,__tram.camPrevL]]){
      D.subVectors(tgt,prev); const along=D.x*f.fx+D.z*f.fz;
      if(Math.abs(along)<6){ pos.x+=f.fx*along; pos.z+=f.fz*along; }
      prev.copy(tgt);
    }
  }
  const k=1-Math.exp(-dt*6);
  __tram.camPos.lerp(__tram.tmpP,k); __tram.camLook.lerp(__tram.tmpL,k);
  __tram.camera.position.copy(__tram.camPos);
  if(__tram.G.shake>0.01) __tram.camera.position.add(new T.Vector3(__tram.rnd(-__tram.G.shake,__tram.G.shake),__tram.rnd(-__tram.G.shake,__tram.G.shake),__tram.rnd(-__tram.G.shake,__tram.G.shake)));
  if(!__tram.reduced) __tram.camera.position.y-=__tram.G.bump*0.05-bounce;
  __tram.camera.lookAt(__tram.camLook);
  if(!__tram.reduced) __tram.camera.rotateZ(-__tram.G.lean*0.12);
  // a small widening with raw speed, and a clear push as a sprint builds up (follows the speed, so it ramps in and out)
  const wantFov=__tram.baseFov+sk*3+__tram.G.sprintK*13;
  // brake smoke off both rims
  if(dt>0&&__tram.state==="play"&&!__tram.G.reason&&__tram.keys.br&&__tram.G.V.brakes&&__tram.G.speed>5.4){
    __tram.bike.updateMatrixWorld();
    __tram.smokeAcc+=dt*45*__tram.clamp((__tram.G.speed-4.2)/10,0.3,1);
    while(__tram.smokeAcc>1){ __tram.smokeAcc--; __tram._tA.set(__tram.rnd(-0.06,0.06),0.62,__tram.pick([-0.55,0.55])); __tram.bike.userData.inner.localToWorld(__tram._tA); __tram.emitSmoke(__tram._tA); }
  }
  for(const p of __tram.smoke){
    if(!p.sp.visible) continue;
    p.life+=dt; const t=p.life/p.max;
    if(t>=1){ p.sp.visible=false; continue; }
    p.sp.position.addScaledVector(p.v,dt); const sc=p.s0+t*1.1; p.sp.scale.set(sc,sc,1); p.sp.material.opacity=0.8*(1-t);
  }
  if(Math.abs(__tram.camera.fov-wantFov)>0.05){ __tram.camera.fov+=(wantFov-__tram.camera.fov)*Math.min(1,dt*3); __tram.camera.updateProjectionMatrix(); }
  const [sx,sz]=__tram.P(0,__tram.G.s+18);
  __tram.sun.target.position.set(sx,0,sz); __tram.sun.position.set(sx-28,48,sz+22);
  __tram.groundPlane.position.x=sx; __tram.groundPlane.position.z=sz;
  for(const c of __tram.clouds){
    const o=c.userData.off; let rx=o[0]-__tram.camPos.x*0.15, rz=o[2]-__tram.camPos.z*0.15;
    rx=((rx+320)%640+640)%640-320; rz=((rz+420)%300+300)%300-420;
    const k=__tram.cloudK; c.position.set(__tram.camPos.x+rx*k,o[1]*k,__tram.camPos.z+rz*k);
  }
  __tram.rippleTex.offset.y+=dt*0.04; __tram.rippleTex.offset.x+=dt*0.01;
  // weather
  const r=__tram.G.rain||0, wsk=Math.max((__tram.G.grey||0)*0.72,r), wkey=wsk*10+r;
  if(Math.abs(wkey-(__tram.G.rainShown||0))>0.01||(wkey===0&&__tram.G.rainShown)){
    __tram.G.rainShown=wkey; __tram.paintSky(wsk);
    __tram.scene.fog.color.setHex(0xcfdadd).lerp(new T.Color(0x8e979c),wsk); __tram.scene.fog.near=__tram.VIEW.fogNear*(1-wsk*45/80); __tram.scene.fog.far=__tram.VIEW.fogFar*(1-wsk*130/310);
    __tram.hemiL.intensity=0.62-0.14*wsk; __tram.sun.intensity=0.95-0.65*wsk;
    __tram.cloudMat.color.setHex(0xffffff).lerp(new T.Color(0x6e767c),wsk); __tram.cloudMat.opacity=0.95;
    if(!__tram.WET.length) for(const k of ["asph","bikeRoad","setts","dirt","cob","kerb"]) if(__tram.MAT[k]) __tram.WET.push([__tram.MAT[k],__tram.MAT[k].color.clone()]);
    for(const [m,c0] of __tram.WET) m.color.copy(c0).multiplyScalar(1-0.28*r);
  }
  __tram.rainLines.visible=r>0.02; __tram.rainMat.opacity=0.55*r;
  if(__tram.rainLines.visible){
    __tram.rainLines.position.set(__tram.camPos.x,0,__tram.camPos.z); __tram.rainLines.rotation.y=Math.atan2(-__tram.frameAt(__tram.G.s).fx,-__tram.frameAt(__tram.G.s).fz);
    const a=__tram.rainGeo.attributes.position.array, fall=26*dt;
    for(let i=0;i<__tram.RAIN_N;i++){ const o=i*6; a[o+1]-=fall; a[o+4]-=fall; if(a[o+4]<0){ const y=__tram.rnd(22,27); a[o+1]=y; a[o+4]=y-0.9; } }
    __tram.rainGeo.attributes.position.needsUpdate=true;
  }
  // blurred screen edges: a hint while riding, stronger and creeping further in as you speed up
  const eb=__tram.edgeBlurEl||(__tram.edgeBlurEl=$("edgeBlur"));
  const bk=__tram.reduced||__tram.state==="menu"?0:__tram.clamp(__tram.G.speed/22,0,1), bkS=Math.round(bk*50)/50;
  if(bkS!==__tram.edgeBlurK){
    __tram.edgeBlurK=bkS;
    eb.style.setProperty("--eb",(bkS>0?1.5+bkS*bkS*8:0).toFixed(2)+"px");
    eb.style.setProperty("--er",(80-bkS*28).toFixed(1)+"%");
  }
  // wind wisps: only while sprinting and most of the way up to sprint pace. Each wisp is a thin streak that flicks in,
  // rushes back past the rider and fades out within half a second; a new one appears every so often, never a steady stream.
  const sprintHeld=__tram.G.sprinting;
  const wind=__tram.reduced||!sprintHeld?0:__tram.clamp(((__tram.G.sprintK||0)-0.55)/0.45,0,1);
  const W=__tram.wisps, a=__tram.windGeo.attributes.position.array, col=__tram.windGeo.attributes.color.array;
  let live=false;
  if(dt>0){
    W.acc+=dt*wind*__tram.rnd(4,8);
    while(W.acc>1){ W.acc--; const i=W.life.findIndex((l,j)=>l>=W.max[j]); if(i<0) break;
      const x=(Math.random()<0.5?-1:1)*__tram.rnd(0.9,2.7), y=__tram.rnd(0.35,2.5), z=__tram.rnd(-20,-9), h=__tram.rnd(0.22,0.42), len=__tram.rnd(3,5.5);
      a.set([x,y,z, x,y+h,z, x,y+h*0.2,z+len, x,y+h*1.1,z+len], i*12);
      W.life[i]=0; W.max[i]=__tram.rnd(0.28,0.55); W.peak[i]=__tram.rnd(0.3,0.55);
    }
    const rush=(26+wind*16)*dt;   // starts ahead of the rider and sweeps back to the camera within its life
    for(let i=0;i<__tram.WIND_N;i++){
      const o=i*12, c=i*12;
      if(W.life[i]>=W.max[i]){ col.fill(0,c,c+12); continue; }
      W.life[i]+=dt; live=true;
      const t=Math.min(1,W.life[i]/W.max[i]), b=Math.sin(Math.PI*Math.pow(t,1.5))*W.peak[i];   // brightest late, as it sweeps past the camera
      for(let k=2;k<12;k+=3) a[o+k]+=rush;
      col.fill(b,c,c+12);
    }
    __tram.windGeo.attributes.position.needsUpdate=true; __tram.windGeo.attributes.color.needsUpdate=true;
  }
  __tram.windLines.visible=live;
  if(live){ __tram.windLines.position.set(__tram.camPos.x,0,__tram.camPos.z); __tram.windLines.rotation.y=Math.atan2(-__tram.frameAt(__tram.G.s).fx,-__tram.frameAt(__tram.G.s).fz); }
}

__tram.__inits.push(() => {

/* ================= render sync ================= */
__tram.camPrevP=new T.Vector3(),__tram.camPrevL=new T.Vector3(),__tram.camD=new T.Vector3();
__tram.camPos=new T.Vector3(),__tram.camLook=new T.Vector3(),__tram.tmpP=new T.Vector3(),__tram.tmpL=new T.Vector3();

});
