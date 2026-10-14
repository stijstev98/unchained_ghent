/* Walkers and tourists. */
import { __tram, T, $ } from "../runtime.js";

/* -- pedestrians: tourists with a map and people out for a walk -- */
__tram.makePerson=function makePerson(o){
  o=o||{};
  const g=new T.Group(), body=new T.Group(); g.add(body);
  const shirt=__tram.plain(__tram.pick([0xe05a4f,0x4fa3e0,0xf2c14e,0x6cc28a,0xf08bb4,0xffffff,0x6d5bd0])), pants=__tram.plain(__tram.pick([0x34465e,0xc9b38a,0x3b3b3b,0x7a8a5a]));
  const skin=__tram.plain(__tram.pick(__tram.SKINS)), shorts=Math.random()<0.5, shoe=__tram.pick([__tram.AM.shoeW,__tram.AM.shoe]);
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const hip=new T.Group(); hip.position.set(side*0.1,0.92,0); body.add(hip);
    __tram.M(hip,__tram.limbGeo("th",0.44,"hang"),pants,0,0,0);
    const knee=new T.Group(); knee.position.y=-0.44; hip.add(knee);
    __tram.M(knee,__tram.fsph(0.06),shorts?skin:pants,0,0,0);
    __tram.M(knee,__tram.limbGeo("sh",0.42,"hang"),shorts?skin:pants,0,0,0);
    if(shorts) __tram.M(knee,__tram.fcyl(0.042,0.04,0.08,6),__tram.plain(0xf4f1ea),0,-0.36,0,null,null,null,false);
    const ankle=new T.Group(); ankle.position.y=-0.42; knee.add(ankle);
    __tram.addShoe(ankle,shoe,-0.06);
    legs.push({hip,knee,ankle});
  }
  __tram.M(body,__tram.HIPS,pants,0,0.95,0);
  __tram.M(body,__tram.TORSO,shirt,0,0.92,0);
  __tram.band(body,__tram.AM.belt,0.99,0.98);
  __tram.M(body,__tram.fcyl(0.1,0.115,0.05,10),shirt,0,1.55,0,null,null,null,false);
  __tram.M(body,__tram.fcyl(0.055,0.062,0.12,6),skin,0,1.61,0);
  const hat=Math.random(), hc=__tram.pick(__tram.HAIRS);
  const head=__tram.makeHead(skin,hc,hat<0.6?"short":__tram.pick(__tram.HAIR_STYLES)); head.position.set(0,1.76,0); body.add(head);
  if(hat<0.33){ __tram.M(body,__tram.fcyl(0.14,0.165,0.13,10),__tram.plain(0xd8cfb8),0,1.91,0); __tram.M(body,__tram.fcyl(0.27,0.27,0.02,10),__tram.plain(0xd8cfb8),0,1.86,0); }
  else if(hat<0.6){ const cc=__tram.plain(__tram.pick([0x1f5c4a,0xc94f3d,0x222222])); __tram.M(body,__tram.DOME("cap",0.152),cc,0,1.78,0.01); __tram.BX(body,cc,0.17,0.012,0.1,0,1.8,-0.17,false); }
  for(const side of [-1,1]){
    const sh=new T.Group(); sh.position.set(side*0.235,1.49,0); body.add(sh);
    __tram.M(sh,__tram.fsph(0.058),shirt,0,0.005,0); __tram.M(sh,__tram.limbGeo("up",0.28,"hang"),shirt,0,0,0);
    const el=new T.Group(); el.position.y=-0.28; sh.add(el);
    __tram.M(el,__tram.fsph(0.046),skin,0,0,0); __tram.M(el,__tram.limbGeo("fo",0.26,"hang"),skin,0,0,0);
    __tram.M(el,__tram.HAND_P,skin,0,-0.3,0); __tram.BX(el,skin,0.022,0.04,0.022,-side*0.035,-0.28,-0.01,false);
    arms.push({sh,el});
  }
  let held=-1;
  if(o.map){
    // the right hand holds the map up in front, the camera hangs on the chest
    held=1; arms[1].sh.rotation.x=0.95; arms[1].el.rotation.x=0.75;
    const map=__tram.BX(body,__tram.AM.map,0.5,0.36,0.02,0.05,1.3,-0.5,false); map.rotation.x=-0.7;
    for(const c of [0xc94f3d,0x3d6fb0]){ const m=__tram.BX(body,__tram.plain(c),0.12,0.08,0.025,__tram.rnd(-0.1,0.15),1.3+__tram.rnd(-0.05,0.05),-0.505,false); m.rotation.x=-0.7; }
    __tram.M(body,__tram.ELL("cam",0.07,0.05,0.04),__tram.AM.dark,-0.06,1.33,-0.155); __tram.M(body,__tram.cyl(0.03,0.03,0.04,8),__tram.AM.glass,-0.06,1.33,-0.2,null,null,null,false).rotation.x=Math.PI/2;
    __tram.tube(body,__tram.AM.dark,[-0.12,1.34,-0.14],[-0.13,1.53,-0.07],0.015,false);
  }
  if(Math.random()<0.6){ const bp=__tram.plain(__tram.pick([0x5b4a3a,0x2f4a6b,0xc94f3d])); __tram.BX(body,bp,0.3,0.38,0.16,0,1.28,0.2); __tram.BX(body,bp,0.24,0.14,0.06,0,1.18,0.3,false); }
  g.userData={legs,arms,body,head,held};
  __tram.bakeStatic(g);   // every posed limb is a group: the meshes inside each one are rigid
  __tram.animPerson(g,__tram.rnd(0,6));
  return g;
}

// walk cycle: legs swing from the hip, the knee folds while the leg swings forward, arms counter-swing
__tram.animPerson=function animPerson(m,step){
  const u=m.userData;
  for(let i=0;i<2;i++){
    const ph=step+(i?Math.PI:0), sw=Math.sin(ph), fold=Math.max(0,Math.cos(ph));
    u.legs[i].hip.rotation.x=sw*0.45;
    u.legs[i].knee.rotation.x=-0.06-0.7*fold;
    // heel strike in front, toes pushing off behind
    if(u.legs[i].ankle) u.legs[i].ankle.rotation.x=0.06+0.5*fold-0.35*Math.max(0,-sw);
    if(i!==u.held){ u.arms[i].sh.rotation.x=-sw*0.4; u.arms[i].sh.rotation.z=(i?1:-1)*0.08; u.arms[i].el.rotation.x=0.25+0.25*Math.max(0,-sw); }
  }
  // the body bobs twice a stride, the shoulders twist against the hips, the head stays level
  u.body.position.y=Math.abs(Math.cos(step))*0.03-0.02;
  u.body.rotation.y=Math.sin(step)*0.07; u.body.rotation.z=Math.sin(step)*0.02; u.body.rotation.x=0.04;
  if(u.head){ u.head.rotation.y=-Math.sin(step)*0.05; u.head.rotation.x=-0.04; }
}

__tram.makeTourist=()=>__tram.makePerson({map:true});

