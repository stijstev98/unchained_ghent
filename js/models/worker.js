/* Worker model. */
import { __tram, T, $ } from "../runtime.js";

__tram.makeWorker=function makeWorker(){
  const g=new T.Group(), skin=__tram.plain(__tram.pick(__tram.SKINS)), lean=-0.32;
  for(const x of [-0.11,0.11]){ __tram.M(g,__tram.limbGeo("th",0.44,"hang"),__tram.RW.pants,x,0.92,0); __tram.M(g,__tram.limbGeo("sh",0.42,"hang"),__tram.RW.pants,x,0.48,0); __tram.M(g,__tram.SHOE_G,__tram.plain(0x3a2a1e),x,0,-0.05); __tram.BX(g,__tram.plain(0x1d1f22),0.112,0.03,0.3,x,0.01,-0.07,false); __tram.M(g,__tram.cyl(0.066,0.062,0.04,10),__tram.AM.chrome,x,0.55,0,null,null,null,false); }
  const torso=new T.Group(); torso.position.set(0,0.92,0); torso.rotation.x=lean; g.add(torso);
  __tram.M(torso,__tram.HIPS,__tram.RW.pants,0,0.06,0);
  __tram.M(torso,__tram.TORSO,__tram.RW.vest,0,0.03,0);
  __tram.band(torso,__tram.AM.chrome,0.26,1.0); __tram.band(torso,__tram.AM.chrome,0.43,1.06);
  __tram.M(torso,__tram.fcyl(0.055,0.062,0.12,6),skin,0,0.72,0);
  const head=new T.Group(); head.position.set(0,0.86,-0.02); head.rotation.x=-0.45; torso.add(head);
  head.add(__tram.makeHead(skin,null));
  __tram.BX(head,__tram.plain(0x6b4a2b),0.09,0.022,0.025,0,-0.05,-0.128,false);
  __tram.M(head,__tram.DOME("hard",0.17),__tram.RW.hat,0,0.05,0); __tram.M(head,__tram.fcyl(0.21,0.21,0.02,10),__tram.RW.hat,0,0.06,-0.02);
  const top=[0.05,1.22,-0.36], bot=[0.14,0.16,-0.86], at=t=>top.map((v,i)=>v+(bot[i]-v)*t);
  __tram.setTube(__tram.limb(g,__tram.RW.wood,0.022,0.022),top,bot); __tram.M(g,__tram.ELL("grip",0.08,0.025,0.025),__tram.AM.dark,top[0],top[1]+0.02,top[2]);
  const blade=__tram.tube(g,__tram.RW.grey,bot,[0.16,0.02,-0.98],0.03); blade.scale.x=0.26;
  torso.updateMatrix();
  const hands=[at(0.08),at(0.42)];
  [-0.24,0.24].forEach((x,i)=>{
    __tram._tA.set(x,0.6,0).applyMatrix4(torso.matrix);
    const S=[__tram._tA.x,__tram._tA.y,__tram._tA.z], H=hands[i], E=[(S[0]+H[0])/2+x*0.3,(S[1]+H[1])/2-0.06,(S[2]+H[2])/2+0.04];
    __tram.setTube(__tram.limbT(g,__tram.RW.vest,"up"),S,E); __tram.setTube(__tram.limbT(g,skin,"fo"),E,H);
    __tram.M(g,__tram.fsph(0.068),__tram.RW.vest,S[0],S[1],S[2]); __tram.M(g,__tram.fsph(0.05),__tram.RW.vest,E[0],E[1],E[2]); __tram.M(g,__tram.HAND_G,__tram.plain(0xd9a43a),H[0],H[1],H[2]);
  });
  g.userData.head=head;
  __tram.bakeStatic(g);   // the worker is posed once at build time, so its meshes are all rigid
  return g;
}

