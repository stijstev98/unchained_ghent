/* Bikes, e-scooters and the rider. */
import { __tram, T, $ } from "../runtime.js";

// shared wheel: tyre, rim, spokes, hub; returns the spinning group
__tram.bikeWheel=function bikeWheel(parent,x,z,r,tt,o){
  const p=new T.Group(); p.position.set(x,r,z); p.userData.R=r; parent.add(p);
  const ty=new T.Mesh(__tram.cached("tyre"+r+"_"+tt,()=>new T.TorusGeometry(r-tt,tt,8,26)),__tram.AM.tyre); ty.rotation.y=Math.PI/2; ty.castShadow=true; p.add(ty);
  const rimW=o.deep?0.03:0.014, rimC=o.deep?__tram.AM.dark:__tram.AM.steel;
  const rim=new T.Mesh(__tram.cached("rim"+r+"_"+tt+"_"+rimW,()=>new T.TorusGeometry(r-tt*2-rimW*0.5,rimW,4,26)),rimC); rim.rotation.y=Math.PI/2; p.add(rim);
  const ns=o.spokes==null?8:o.spokes, sl=(r-tt*2)*2;
  for(let i=0;i<ns;i++){ const sp=__tram.BX(p,__tram.AM.steel,0.006,sl,0.006,0,0,0,false); sp.rotation.x=i*Math.PI/ns; }
  const hubR=o.hub||0.03; __tram.M(p,__tram.cyl(hubR,hubR,0.12,10),o.hub?__tram.AM.dark:__tram.AM.steel,0,0,0,null,null,null,false).rotation.z=Math.PI/2;
  if(o.pegs) for(const s of [-1,1]) __tram.M(p,__tram.cyl(0.025,0.025,0.1,8),__tram.AM.chrome,s*0.11,0,0,null,null,null,false).rotation.z=Math.PI/2;
  return p;
}

__tram.makeCyclist=function makeCyclist(o){
  const g=new T.Group(), inner=new T.Group(); g.add(inner);
  const fr=__tram.plain(o.frame), st=__tram.AM.steel, R=o.R||0.34, tt=o.tt||(o.ebike?0.055:0.032);
  const skin=__tram.plain(o.skin||__tram.pick(__tram.SKINS)), jacket=__tram.plain(o.jacket), pants=__tram.plain(o.pants);
  const wheels=[], crank=[];
  const mode=o.scooter?"scooter":"pedal";
  const hipY=o.scooter?1.0:(o.hipY||__tram.HIP_Y), hipZ=o.scooter?0.06:__tram.HIP_Z;
  const grip=o.grip||(o.scooter?[0.25,1.06,-0.5]:[0.27,1.08,-0.33]);
  if(mode==="scooter"){
    // e-step: deck with battery, rear fender with tail light, folding stem, bars with display and brake lever
    for(const z of [-0.44,0.44]){
      const p=new T.Group(); p.position.set(0,0.11,z); p.userData.R=0.11; inner.add(p);
      const ty=new T.Mesh(__tram.cached("stire",()=>new T.TorusGeometry(0.08,0.032,8,18)),__tram.AM.tyre); ty.rotation.y=Math.PI/2; ty.castShadow=true; p.add(ty);
      __tram.M(p,__tram.cyl(0.055,0.055,0.06,12),z>0?__tram.AM.dark:st,0,0,0,null,null,null,false).rotation.z=Math.PI/2;
      for(let i=0;i<5;i++){ const sp=__tram.BX(p,__tram.AM.dark,0.01,0.1,0.02,0,0,0,false); sp.rotation.x=i*Math.PI/5; }
      wheels.push(p);
    }
    __tram.BX(inner,__tram.plain(0x22262b),0.17,0.06,0.78,0,0.14,0.02); __tram.BX(inner,__tram.AM.dark,0.15,0.008,0.66,0,0.174,0.04,false);
    __tram.BX(inner,fr,0.172,0.02,0.6,0,0.12,0.02,false);
    const fd=__tram.M(inner,__tram.cached("sfend",()=>new T.TorusGeometry(0.13,0.02,4,12,Math.PI*0.6)),fr,0,0.11,0.44,null,null,null,false); fd.rotation.y=Math.PI/2; fd.rotation.x=Math.PI*0.25;
    __tram.BX(inner,__tram.AM.tail,0.06,0.03,0.02,0,0.21,0.57,false);
    __tram.tube(inner,fr,[0,0.13,-0.4],[0,1.04,-0.5],0.05); __tram.tube(inner,__tram.AM.dark,[0,0.13,-0.44],[0,0.32,-0.42],0.06);
    __tram.BX(inner,__tram.AM.dark,0.08,0.06,0.08,0,0.34,-0.41,false);
    __tram.BX(inner,st,0.54,0.03,0.03,0,1.06,-0.5,false); for(const x of [-0.24,0.24]) __tram.BX(inner,__tram.AM.dark,0.09,0.045,0.045,x,1.06,-0.5,false);
    __tram.BX(inner,__tram.AM.head,0.09,0.06,0.04,0,0.88,-0.53,false); __tram.BX(inner,__tram.plain(0x1d2a33),0.1,0.025,0.08,0,1.085,-0.49,false); __tram.BX(inner,__tram.basic(0x6fe0ff),0.07,0.004,0.05,0,1.099,-0.49,false);
    __tram.BX(inner,__tram.AM.dark,0.05,0.015,0.07,0.19,1.04,-0.55,false);
    __tram.M(inner,__tram.hemi(0.03),__tram.AM.chrome,-0.17,1.075,-0.5,null,null,null,false); // bell on the left of the bars
    __tram.tube(inner,__tram.AM.dark,[-0.08,0.13,0.1],[-0.12,0.02,0.2],0.015,false);
  } else {
    const zF=o.zF||-0.55, fR=o.fR||R, zR=0.55;
    const wopt={deep:o.deep,spokes:o.spokes,hub:o.ebike?0.075:null,pegs:o.pegs};
    wheels.push(__tram.bikeWheel(inner,0,zF,fR,tt,Object.assign({},wopt,{hub:o.hubF||null})),__tram.bikeWheel(inner,0,zR,R,tt,wopt));
    const SEAT=o.seat||[0,0.88,0.17], HT=o.ht||[0,0.95,-0.38], HB=[0,0.7,-0.44], BB=[0,__tram.BB_Y,__tram.BB_Z];
    const tw=o.thick||1;
    __tram.tube(inner,fr,SEAT,HT,0.045*tw); __tram.tube(inner,fr,BB,HB,(o.ebike?0.09:0.05)*tw); __tram.tube(inner,fr,BB,SEAT,0.045*tw); __tram.tube(inner,fr,HB,HT,0.065*tw);
    for(const x of [-0.06,0.06]){
      __tram.tube(inner,fr,[x,SEAT[1]-0.02,SEAT[2]+0.01],[x,R,zR],0.025*tw); __tram.tube(inner,fr,[x,__tram.BB_Y,0.04],[x,R,zR],0.028*tw);
      __tram.tube(inner,o.suspension?__tram.AM.dark:fr,[x*0.8,0.7,-0.44],[x*0.8,fR,zF],(o.suspension?0.045:0.03)*tw);
    }
    // drivetrain: chainring, rear sprocket and the chain between them
    __tram.M(inner,__tram.cyl(0.1,0.1,0.015,18),st,0.07,__tram.BB_Y,__tram.BB_Z,null,null,null,false).rotation.z=Math.PI/2;
    __tram.M(inner,__tram.cyl(0.045,0.045,0.015,12),st,0.07,R,zR,null,null,null,false).rotation.z=Math.PI/2;
    __tram.tube(inner,__tram.AM.dark,[0.075,__tram.BB_Y+0.1,__tram.BB_Z],[0.075,R+0.045,zR],0.012,false); __tram.tube(inner,__tram.AM.dark,[0.075,__tram.BB_Y-0.1,__tram.BB_Z],[0.075,R-0.045,zR],0.012,false);
    if(!o.noGuard){
      for(const [z,r] of [[zF,fR],[zR,R]]){
        if(o.rusty&&z<0) continue;
        const mg=__tram.M(inner,__tram.cached("guard"+r,()=>new T.TorusGeometry(r+0.03,0.03,3,10,Math.PI*0.7)),fr,0,r,z,null,null,null,false); mg.rotation.y=Math.PI/2; mg.rotation.x=z<0?-Math.PI*0.05:Math.PI*0.35;
      }
      __tram.BX(inner,o.rusty?__tram.plain(0x5e3220):__tram.AM.dark,0.03,0.08,0.6,0.08,__tram.BB_Y+0.02,0.29,false);
    }
    // seat: post and saddle (a long bench on the fatbike)
    __tram.tube(inner,st,SEAT,[SEAT[0],SEAT[1]+0.12,SEAT[2]+0.04],0.03);
    if(o.bench){ __tram.BX(inner,__tram.plain(0x16181b),0.2,0.09,0.62,0,SEAT[1]+0.15,SEAT[2]+0.18); __tram.BX(inner,__tram.plain(0x2b2f33),0.21,0.02,0.63,0,SEAT[1]+0.1,SEAT[2]+0.18,false); }
    else __tram.BX(inner,o.rusty?__tram.plain(0x3a2a20):__tram.AM.dark,o.racing?0.11:0.16,0.06,o.racing?0.27:0.28,0,SEAT[1]+0.16,SEAT[2]+0.03);
    // handlebars by type
    if(o.dropBar){
      __tram.tube(inner,st,HT,[0,1.0,-0.42],0.03); __tram.BX(inner,st,0.42,0.03,0.03,0,1.0,-0.42,false);
      for(const x of [-0.2,0.2]){ __tram.tube(inner,st,[x,1.0,-0.42],[x,0.95,-0.53],0.03,false); __tram.tube(inner,st,[x,0.95,-0.53],[x,0.87,-0.47],0.03,false); __tram.BX(inner,__tram.AM.dark,0.035,0.07,0.06,x,0.99,-0.47,false); }
    } else if(o.riser){
      __tram.tube(inner,st,HT,[0,1.0,-0.38],0.035);
      for(const x of [-0.12,0.12]) __tram.tube(inner,st,[x,1.0,-0.38],[x*2.4,1.14,-0.36],0.028,false);
      __tram.BX(inner,st,0.24,0.025,0.025,0,1.07,-0.37,false); __tram.BX(inner,st,0.66,0.028,0.028,0,1.14,-0.36,false);
      for(const x of [-0.3,0.3]) __tram.BX(inner,__tram.plain(0x16181b),0.1,0.05,0.05,x,1.14,-0.36,false);
    } else {
      __tram.tube(inner,st,HT,[0,1.06,-0.36],0.03);
      __tram.BX(inner,st,0.6,0.03,0.03,0,1.07,-0.33,false);
      for(const x of [-0.27,0.27]) __tram.BX(inner,__tram.AM.dark,0.11,0.05,0.05,x,1.07,-0.33,false);
      for(const x of [-0.2,0.2]) __tram.BX(inner,__tram.AM.dark,0.08,0.012,0.04,x,1.06,-0.39,false);
    }
    if(o.bell!==false&&!o.dropBar&&!o.riser) __tram.M(inner,__tram.hemi(0.03),__tram.AM.chrome,-0.17,1.09,-0.33,null,null,null,false);
    if(!o.racing&&!o.riser){ __tram.BX(inner,__tram.AM.head,0.07,0.06,0.05,0,0.98,-0.47,false); __tram.BX(inner,__tram.AM.tail,0.06,0.05,0.03,0,0.78,0.78,false); }
    if(o.kickstand) __tram.tube(inner,__tram.AM.dark,[0.06,__tram.BB_Y,0.1],[0.12,0.02,0.32],0.02,false);
    if(o.ebike){
      __tram.tube(inner,__tram.plain(0x30343a),[0,0.4,-0.08],[0,0.66,-0.4],0.11*tw); __tram.BX(inner,__tram.AM.chrome,0.01,0.18,0.06,0.06,0.53,-0.24,false);
      __tram.BX(inner,__tram.AM.head,0.12,0.08,0.06,0,1.0,-0.49,false); __tram.BX(inner,__tram.plain(0x111111),0.08,0.05,0.09,0.13,1.09,-0.3,false); __tram.BX(inner,__tram.basic(0x6fe0ff),0.06,0.004,0.06,0.13,1.117,-0.3,false);
    }
    if(o.rack||o.pannier){ __tram.BX(inner,__tram.AM.dark,0.16,0.02,0.36,0,0.78,0.5,false); for(const x of [-0.07,0.07]) __tram.tube(inner,__tram.AM.dark,[x,0.78,0.66],[x,R,zR],0.015,false); }
    if(o.pannier){ __tram.BX(inner,__tram.plain(o.pannier),0.12,0.3,0.32,0.15,0.66,0.52); __tram.BX(inner,__tram.AM.chrome,0.125,0.03,0.33,0.15,0.74,0.52,false); }
    if(o.mirror){ __tram.tube(inner,__tram.AM.dark,[-0.27,1.07,-0.33],[-0.36,1.26,-0.3],0.012,false); __tram.M(inner,__tram.cyl(0.06,0.06,0.015,12),__tram.AM.chrome,-0.37,1.28,-0.3,null,null,null,false).rotation.x=Math.PI/2; }
    if(o.plate){ __tram.BX(inner,__tram.plain(0xf6f2e8),0.2,0.12,0.012,0,0.66,0.84,false); __tram.BX(inner,__tram.plain(0x2f6aa0),0.04,0.1,0.014,-0.075,0.66,0.84,false); }
    if(o.ledbar){ __tram.BX(inner,__tram.AM.dark,0.32,0.05,0.04,0,0.9,-0.5,false); __tram.BX(inner,__tram.basic(0xeaf6ff),0.28,0.03,0.01,0,0.9,-0.523,false); __tram.BX(inner,__tram.plain(0x111111),0.08,0.13,0.015,-0.12,1.12,-0.36,false); }
    if(o.bottle){ __tram.BX(inner,__tram.AM.dark,0.06,0.04,0.12,0,0.55,-0.08,false); __tram.M(inner,__tram.cyl(0.035,0.035,0.2,10),__tram.plain(0x2f6aa0),0,0.6,-0.12,null,null,null,false).rotation.x=0.95; }
    if(o.box){
      const z0=-0.52, z1=zF+0.3, zc=(z0+z1)/2, len=Math.abs(z1-z0), wood=__tram.plain(0x9b6b3f), dark=__tram.plain(0x7a5230);
      __tram.tube(inner,fr,[0,__tram.BB_Y,0.02],[0,0.3,z1],0.06); __tram.tube(inner,__tram.AM.dark,[0,1.0,-0.38],[0,0.45,zF+0.1],0.018,false);
      __tram.BX(inner,wood,0.64,0.06,len,0,0.34,zc); __tram.BX(inner,wood,0.05,0.46,len,-0.3,0.56,zc); __tram.BX(inner,wood,0.05,0.46,len,0.3,0.56,zc);
      __tram.BX(inner,wood,0.64,0.5,0.05,0,0.58,z1); __tram.BX(inner,wood,0.64,0.46,0.05,0,0.56,z0);
      for(const y of [0.48,0.66]) __tram.BX(inner,dark,0.66,0.02,len+0.02,0,y,zc,false);
      __tram.BX(inner,__tram.plain(0x5e6a72),0.56,0.05,0.12,0,0.62,zc+0.05,false);
      // two kids along for the ride, one with a bobble hat
      for(const [kz,hc,hat] of [[zc-0.2,0xf0c8a0,0xc8202a],[zc+0.2,0xc68a5e,null]]){
        __tram.M(inner,__tram.fcyl(0.1,0.12,0.26,8),__tram.plain(hat?0x3d6fb0:0xf2c230),0,0.72,kz); const kh=__tram.M(inner,__tram.HEAD_G,__tram.plain(hc),0,0.92,kz); kh.scale.setScalar(0.72);
        __tram.addFace(inner,__tram.plain(hc),0,0.93,kz,0.09);
        if(hat){ __tram.M(inner,__tram.DOME("kidhat",0.11),__tram.plain(hat),0,0.93,kz); __tram.M(inner,__tram.fsph(0.035),__tram.plain(0xf4f1ea),0,1.06,kz); }
        else __tram.M(inner,__tram.DOME("kidhair",0.105),__tram.plain(0x2b1d14),0,0.92,kz+0.01);
      }
    }
    if(o.rusty){ for(const [a,b] of [[[0,0.6,-0.2],[0,0.66,-0.3]],[[0,0.5,0.1],[0,0.6,0.13]],[[0.06,0.4,0.35],[0.06,0.45,0.42]]]) __tram.tube(inner,__tram.plain(0x5e3220),a,b,0.06,false); }
    if(o.crate){ __tram.BX(inner,st,0.3,0.02,0.4,0,0.74,0.5,false); __tram.BX(inner,__tram.plain(0x8a5a35),0.38,0.26,0.36,0,0.88,0.5); }
    if(o.basket){ const bk=__tram.BX(inner,__tram.plain(o.rusty?0x7a6a4f:0x9b7a4f),0.38,0.24,0.3,0,1.0,-0.62); if(o.rusty) bk.rotation.z=0.18; }
    for(const side of [-1,1]){
      const p=new T.Group(); p.position.set(side*0.09,__tram.BB_Y,__tram.BB_Z); inner.add(p);
      __tram.BX(p,st,0.025,__tram.CRANK,0.035,0,-__tram.CRANK/2,0,false); __tram.BX(p,__tram.AM.dark,0.1,0.025,0.09,side*0.05,-__tram.CRANK,0,false);
      crank.push(p);
    }
  }
  // rider
  const lean=o.scooter?-0.12:(o.crouch?-0.85:-0.3);
  const torso=new T.Group(); torso.position.set(0,hipY,hipZ); torso.rotation.x=lean; inner.add(torso);
  const arms=[];
  __tram.M(torso,__tram.HIPS,pants,0,0.06,0);
  __tram.M(torso,__tram.TORSO,jacket,0,0.03,0);
  __tram.band(torso,__tram.AM.belt,0.1,0.98);
  __tram.M(torso,__tram.fcyl(0.1,0.115,0.05,10),jacket,0,0.66,0,null,null,null,false);
  __tram.BX(torso,__tram.plain(0x2a2d31),0.012,0.5,0.012,0,0.36,-0.12,false);
  if(o.stripe) __tram.band(torso,__tram.plain(o.stripe),0.42,1.04);
  if(o.hood) __tram.M(torso,__tram.ELL("hood",0.15,0.08,0.1),jacket,0,0.66,0.12,null,null,null,false);
  if(o.hivis){ __tram.band(torso,__tram.AM.chrome,0.31,1.0); __tram.band(torso,__tram.AM.chrome,0.46,1.07); }
  if(o.bag){ __tram.BX(torso,__tram.plain(o.bag),0.3,0.38,0.16,0,0.4,0.19); __tram.BX(torso,__tram.plain(o.bag),0.24,0.14,0.06,0,0.3,0.29,false); for(const x of [-0.11,0.11]) __tram.BX(torso,__tram.AM.dark,0.04,0.42,0.02,x,0.4,0.11,false); }
  if(o.bigbag){ __tram.BX(torso,__tram.plain(o.bigbag),0.46,0.46,0.42,0,0.48,0.34); __tram.BX(torso,__tram.AM.chrome,0.47,0.04,0.43,0,0.38,0.34,false); }
  __tram.M(torso,__tram.fcyl(0.055,0.062,0.12,6),skin,0,0.72,0);
  const head=new T.Group(); head.position.set(0,0.86,-0.02); head.rotation.x=-lean*0.75; torso.add(head);
  head.add(__tram.makeHead(skin,(o.helmet!=null||o.cap)?null:(o.hair!=null?o.hair:__tram.pick(__tram.HAIRS)),o.hairStyle||__tram.pick(__tram.HAIR_STYLES)));
  if(o.helmet!=null){ const h=__tram.M(head,__tram.DOME("helm",0.165),__tram.plain(o.helmet),0,0.02,0.01); h.scale.set(1,0.95,1.3); __tram.BX(head,__tram.plain(o.helmet),0.22,0.03,0.06,0,0.04,-0.19,false); __tram.BX(head,__tram.AM.dark,0.02,0.16,0.02,0.13,-0.06,0,false); }
  else if(o.cap){ const cc=__tram.plain(o.cap); __tram.M(head,__tram.DOME("cap",0.152),cc,0,0.02,0.01); __tram.BX(head,cc,0.17,0.012,0.1,0,0.035,-0.17,false); }
  if(o.shades) __tram.BX(head,__tram.plain(0x111418),0.22,0.045,0.03,0,0.03,-0.135,false);
  for(const side of [-1,1]){
    const Gp=[side*grip[0],grip[1],grip[2]];
    arms.push({side,up:__tram.limbT(inner,jacket,"up"),fo:__tram.limbT(inner,jacket,"fo"),sh:__tram.M(inner,__tram.fsph(0.058),jacket,0,0,0),el:__tram.M(inner,__tram.fsph(0.046),jacket,0,0,0),
      hand:__tram.M(inner,__tram.HAND_G,o.gloves?__tram.plain(o.gloves):skin,Gp[0],Gp[1],Gp[2])});
  }
  const legs=[];
  for(const side of [-1,1]){
    const th=new T.Group(); th.position.set(side*0.1,hipY,hipZ); inner.add(th);
    __tram.M(th,__tram.limbGeo("th",__tram.L1,"hang"),pants,0,0,0);
    if(o.shorts) __tram.M(th,__tram.limbGeo("th",__tram.L1*0.45,"hang"),skin,0,-__tram.L1*0.55,0).scale.set(0.97,1,0.97);
    const sh2=new T.Group(); sh2.position.y=-__tram.L1; th.add(sh2);
    __tram.M(sh2,__tram.fsph(0.06),o.shorts?skin:pants,0,0,0);
    __tram.M(sh2,__tram.limbGeo("sh",__tram.L2,"hang"),o.shorts?skin:pants,0,0,0);
    if(o.shorts&&o.socks) __tram.M(sh2,__tram.fcyl(0.042,0.04,0.1,6),__tram.plain(o.socks),0,-__tram.L2+0.06,0,null,null,null,false);
    const an=new T.Group(); an.position.y=-__tram.L2; sh2.add(an);
    __tram.addShoe(an,o.shoeW?__tram.AM.shoeW:__tram.AM.shoe,-0.07);
    legs.push({th,sh:sh2,an,side});
  }
  g.userData={inner,wheels,crank,legs,R,head,torso,arms,baseLean:lean,stand:0,standBase:o.standBase||0,hipY,hipZ,grip,mode,air:0,
    feet:o.scooter?[[0.19,-0.18],[0.19,0.26]]:null};
  // the arm pieces are re-aimed every frame; everything else in a group (bike frame, wheel parts, torso, head, shoes) is rigid
  __tram.bakeStatic(g,new Set(arms.flatMap(a=>[a.up,a.fo,a.sh,a.el,a.hand])));
  __tram.animCyclist(g,0,0);
  return g;
}

__tram.setTube=function setTube(m,a,b){
  __tram._tA.set(a[0],a[1],a[2]); __tram._tD.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
  const len=__tram._tD.length(); m.scale.y=len; m.position.copy(__tram._tA).addScaledVector(__tram._tD,0.5); m.quaternion.setFromUnitVectors(__tram.YAX,__tram._tD.normalize());
}

// two-bone leg: thigh from the hip, shin to the foot target (y,z in the bike's side plane)
__tram.legIK=function legIK(leg,hy,hz,fy,fz,foot){
  leg.th.position.y=hy; leg.th.position.z=hz;
  const dy=fy-hy, dz=fz-hz, D=Math.min(Math.hypot(dy,dz),__tram.L1+__tram.L2-0.002);
  const phi=Math.atan2(dz,-dy), al=Math.acos(__tram.clamp((__tram.L1*__tram.L1+D*D-__tram.L2*__tram.L2)/(2*__tram.L1*D),-1,1));
  const t1=phi-al, ky=hy-__tram.L1*Math.cos(t1), kz=hz+__tram.L1*Math.sin(t1);
  const t2=Math.atan2(fz-kz,-(fy-ky));
  leg.th.rotation.x=-t1; leg.sh.rotation.x=-(t2-t1);
  // the foot stays roughly level whatever the leg does, plus whatever pitch the caller wants
  if(leg.an) leg.an.rotation.x=t2+(foot||0);
}

// arms: shoulder from the torso pose, hand at its target, elbow bent outward and back
__tram.armPose=function armPose(u,a,Gp,out){
  __tram._tA.set(a.side*0.22,0.6,0).applyMatrix4(u.torso.matrix);
  const S=[__tram._tA.x,__tram._tA.y,__tram._tA.z];
  const E=[(S[0]+Gp[0])/2+a.side*(out==null?0.07:out),(S[1]+Gp[1])/2-0.07,(S[2]+Gp[2])/2+0.05];
  __tram.setTube(a.up,S,E); __tram.setTube(a.fo,E,Gp); a.sh.position.set(S[0],S[1],S[2]); a.el.position.set(E[0],E[1],E[2]); a.hand.position.set(Gp[0],Gp[1],Gp[2]);
}

// stand: 0 = seated, 1 = out of the saddle. air: 0..1 while jumping.
__tram.animCyclist=function animCyclist(c,phase,ds){
  const u=c.userData;
  for(const w of u.wheels) w.rotation.x-=ds/(w.userData.R||u.R);
  const air=u.air||0;
  const st=u.feet?0:Math.max(u.stand||0,u.standBase||0,air);
  if(air>0.05&&!u.feet) phase=-Math.PI/2*air+phase*(1-air);   // cranks level in the air
  const seated=(1-st)*(1-air), rock=u.feet?0:Math.sin(phase);
  const hy=u.hipY+st*(0.07+Math.abs(Math.sin(phase))*0.04*(1-air))-(u.feet?air*0.18:0)+seated*Math.abs(rock)*0.008, hz=u.hipZ-st*0.26, lean=u.baseLean-st*0.38-(u.feet?air*0.25:0);
  // seated: the hips rock a little with each stroke and the shoulders sway against it; standing: the whole body swings
  u.torso.position.set(0,hy,hz); u.torso.rotation.x=lean+seated*Math.abs(Math.cos(phase))*0.015; u.torso.rotation.y=seated*rock*0.05; u.torso.rotation.z=st*(1-air)*Math.sin(phase)*0.16+seated*rock*0.03;
  u.head.rotation.x=-lean*0.75; u.head.rotation.y=-seated*rock*0.05; u.head.rotation.z=-st*(1-air)*Math.sin(phase)*0.12-seated*rock*0.02;
  u.torso.updateMatrix();
  for(const a of u.arms) __tram.armPose(u,a,[a.side*u.grip[0],u.grip[1],u.grip[2]],seated*0.07+st*0.1);
  for(let i=0;i<2;i++){
    const a=phase+(i?Math.PI:0);
    if(u.crank[i]) u.crank[i].rotation.x=a;
    const fy=u.feet?u.feet[i][0]:__tram.BB_Y-__tram.CRANK*Math.cos(a), fz=u.feet?u.feet[i][1]:__tram.BB_Z-__tram.CRANK*Math.sin(a);
    // ankling: toes dip at the bottom of the stroke and lift at the top
    __tram.legIK(u.legs[i],hy,hz,fy,fz,u.feet?0:0.25*Math.sin(a)-0.1);
    u.legs[i].th.rotation.z=u.feet?u.legs[i].th.rotation.z:u.legs[i].side*(0.04+0.03*Math.max(0,-Math.cos(a)));
  }
}

__tram.emitSmoke=function emitSmoke(pos){ const p=__tram.smoke[__tram.smokeIdx++%__tram.smoke.length]; p.sp.position.copy(pos); p.life=0; p.max=__tram.rnd(0.45,0.85); p.s0=__tram.rnd(0.14,0.26); p.v.set(__tram.rnd(-0.5,0.5),__tram.rnd(0.3,0.9),__tram.rnd(-0.2,0.4)); p.sp.visible=true; }

