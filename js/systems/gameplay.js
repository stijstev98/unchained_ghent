/* Steering, collisions, crashes and scoring. */
import { __tram, T, $ } from "../runtime.js";

__tram.pop=function pop(text,color){ const d=document.createElement("div"); d.className="pop"; d.textContent=text; d.style.color=color; __tram.popsEl.appendChild(d); setTimeout(()=>d.remove(),950); }
__tram.crash=function crash(r,o){
  if(__tram.god||__tram.G.reason||__tram.G.inv>0) return;
  if(o&&o.type) __tram.knockAnim(o);
  if(__tram.G.helmet){
    // the helmet takes the hit: knocked aside, slowed down, a moment of grace
    __tram.G.helmet=false; __tram.G.inv=1.6; __tram.G.broke=1.4; __tram.G.groove=0;
    __tram.G.speed*=0.5; __tram.G.shake=__tram.reduced?0:0.22;
    const dir=o?(__tram.G.u>=o.u?1:-1):(__tram.G.u<0?1:-1);
    __tram.G.vu=dir*5.5; __tram.G.lean=dir*0.15;
    __tram.pop("Helmet broke","#ffb21e"); __tram.snd.helmetBreak();
    return;
  }
  __tram.G.reason=r; __tram.G.crashT=0; __tram.G.shake=__tram.reduced?0:0.5; __tram.snd.crash(r);
}
// big, cartoony launches: high arcs, lots of spin, one bounce, then a skid with smoke
__tram.launch=function launch(o,h,power){
  const car=o.type==="car"||o.type==="parked", p=power||1;
  o.knocked=true; o.kt=0; o.kdir=(o.u>=h.u?1:-1); o.kyaw=(o.vu||0)>0?-Math.PI/2:Math.PI/2;
  o.fly=true; o.bounced=false; o.y=0; o.spin=0; o.slideV=0; o.slideU=0; o.smoke=true;
  o.vy=(car?__tram.rnd(3.8,4.8):__tram.rnd(4.4,5.4))*Math.sqrt(p);
  o.vu=o.kdir*(car?__tram.rnd(2.4,3.4):__tram.rnd(2.6,3.8))*p;
  const hv=h.v==null?10:h.v; o.vs=(hv<0?-1:1)*Math.max(4,Math.abs(hv))*(car?__tram.rnd(0.4,0.55):__tram.rnd(0.45,0.62));
  o.sr=o.kdir*(car?__tram.rnd(2.6,3.6):__tram.rnd(5,7));
  __tram.snd.launch(o,car);
  if(car) o.disint=__tram.rnd(0.55,0.8);
}
// after the player wrecks something, 1 time in 5 the rider glances back over his shoulder at the damage
__tram.LOOK_BACK_CHANCE=0.2;
__tram.maybeLookBack=function maybeLookBack(o){
  const u=__tram.bike&&__tram.bike.userData; if(!u||u.lookT>0||Math.random()>=__tram.LOOK_BACK_CHANCE) return;
  u.lookT=u.lookDur=1.6; u.lookSide=o&&o.u!=null&&o.u!==__tram.G.u?Math.sign(o.u-__tram.G.u):(Math.random()<0.5?-1:1);
};
// a launched car breaks into three or four big chunks (nose, tail, sides) that tumble away and shrink out of sight
__tram.blowUpCar=function blowUpCar(o){
  const m=o.mesh, [x,z]=__tram.P(o.u,o.s), y=(o.y||0)+0.8;
  if(m.userData.splitParts) m.userData.splitParts();   // the body is merged while the car drives; the pieces are needed to break it apart
  if(m.userData.pad) m.remove(m.userData.pad);
  const n=__tram.pick([3,4]), groups=[];
  for(let i=0;i<n;i++){ const g=new T.Group(); groups.push(g); }
  const which=c=>n===4?(c.position.x<0?0:1)+(c.position.z<0?0:2):(c.position.z<-0.5?0:(c.position.x<0?1:2));
  for(const c of [...m.children]) groups[which(c)].add(c);
  for(const g of groups){
    if(!g.children.length) continue;
    const ctr=new T.Vector3(); for(const c of g.children) ctr.add(c.position); ctr.multiplyScalar(1/g.children.length);
    for(const c of g.children) c.position.sub(ctr);
    g.position.copy(ctr); m.add(g);
  }
  __tram.shatter(o,m,0.25);
  for(const pt of o.parts){ pt.v.x+=__tram.rnd(-2.5,2.5); pt.v.y+=__tram.rnd(1,3); pt.v.z+=__tram.rnd(-2.5,2.5); pt.ttl=__tram.rnd(0.45,0.7); pt.sc=pt.m.scale.clone(); }
  for(let i=0;i<8;i++){ __tram._tA.set(x+__tram.rnd(-1,1),y+__tram.rnd(-0.3,0.6),z+__tram.rnd(-1.5,1.5)); __tram.emitSmoke(__tram._tA); }
  o.killT=0.9;
  __tram.snd.carBlast(o);
}
__tram.ram=function ram(h){
  for(const t of __tram.G.objs){
    if(t===h||t.knocked||t.dead) continue;
    if(Math.abs(t.u-h.u)>=(t.hw||0.3)+h.hw||Math.abs(t.s-h.s)>=(t.hl||0.3)+h.hl) continue;
    if(t.heavy) continue; // cargo bikes are too heavy for a car or courier to throw about
    if(__tram.RAMMABLE.includes(t.type)) __tram.launch(t,h);
    else if(t.type==="rwsign"&&!t.parts) __tram.shatter(t,t.mesh,1.4);
  }
}
// hit by the player: launched as hard as the ride you are on can manage
// (a cargo bike (o.heavy) only goes over for a fatbike or another bakfiets: rides with knockHeavy)
__tram.knockAnim=function knockAnim(o){
  if(o.knocked||!(__tram.BIKES.includes(o.type)||__tram.PEOPLE.includes(o.type))) return;
  if(o.heavy&&!__tram.G.V.knockHeavy) return;
  const p={fatbike:1.4,pedelec:1.35,ebike:1.15,bakfiets:1.0}[__tram.curVeh]||0.85;
  __tram.launch(o,{u:__tram.G.u,v:Math.max(__tram.G.speed,8)},p);
}
__tram.knockOver=function knockOver(o,quiet){
  __tram.knockAnim(o);
  if(!quiet) __tram.G.speed*=0.9;
  __tram.pop(__tram.pick(["Sorry!","Pardon!","Oeps!","Excuseer!"]),"#f1e8d4"); __tram.snd.thud(o);
}
// break an object's parts loose into tumbling debris (signs, car doors)
__tram.shatter=function shatter(o,root,boost){
  const f=__tram.frameAt(o.s);
  root.updateMatrixWorld(true);
  const parts=[...root.children].map(c=>{ __tram.scene.attach(c);
    const fwd=__tram.G.speed*__tram.rnd(0.35,0.75)*(boost||1);
    return {m:c,v:new T.Vector3(f.fx*fwd+f.rx*__tram.rnd(-1.6,1.6),__tram.rnd(1.8,3.8),f.fz*fwd+f.rz*__tram.rnd(-1.6,1.6)),av:new T.Vector3(__tram.rnd(-7,7),__tram.rnd(-7,7),__tram.rnd(-7,7)),rest:false}; });
  o.parts=(o.parts||[]).concat(parts);
}
__tram.removeObj=function removeObj(o){ __tram.scene.remove(o.mesh); __tram.disposeOwn(o.mesh); if(o.parts) for(const p of o.parts){ __tram.scene.remove(p.m); __tram.disposeOwn(p.m); } }
// the warning sign is only a warning: hitting it knocks it into pieces and costs a little speed
__tram.breakSign=function breakSign(o){
  __tram.shatter(o,o.mesh); __tram.maybeLookBack(o);
  __tram.G.speed*=0.85; __tram.pop("Sign down!","#ffb21e"); __tram.snd.signDown(o);
}
__tram.startSlip=function startSlip(){
  let dir=__tram.pick([-1,1]); const L=__tram.hwAt(__tram.G.s)-0.5;
  if(__tram.G.u+dir*2.4>L||__tram.G.u+dir*2.4<-L) dir=-dir;
  __tram.G.slip=0.55; __tram.G.slipDir=dir; __tram.G.vu+=dir*2.5; __tram.G.leanV+=dir*3;
  __tram.pop("Bleh! Slipped","#d6cf55"); __tram.snd.slip();
}
__tram.jump=function jump(){
  if(__tram.state!=="play"||__tram.G.reason||!__tram.G.V.jump||__tram.G.jy>0.02||__tram.G.jcd>0) return;
  __tram.G.jv=__tram.G.V.jumpV||4.6; __tram.G.jy=0.001; __tram.G.jcd=0.15; __tram.snd.jump();
}
// does the player's box (half width pw, half length ph) overlap this object's box, taking its heading into
// account and sweeping along the distance covered since the last frame
__tram.overlaps=function overlaps(o,pw,ph){
  const yaw=(o.knocked||o.type==="parked"||o.type==="tram")?0:(o.yaw||0), c=Math.cos(yaw), sn=Math.sin(yaw);
  const s0=__tram.G.sPrev==null?__tram.G.s:__tram.G.sPrev, n=Math.max(1,Math.ceil(Math.abs(__tram.G.s-s0)/0.4));
  for(let i=0;i<=n;i++){
    const ps=s0+(__tram.G.s-s0)*i/n, du=__tram.G.u-o.u, ds=ps-o.s;
    const lu=du*c-ds*sn, ls=du*sn+ds*c;
    if(Math.abs(lu)<o.hw+pw&&Math.abs(ls)<o.hl+ph) return true;
  }
  return false;
}
// shove the player sideways out of something solid instead of letting the bike pass through it
__tram.pushOut=function pushOut(o,pw){
  const dir=__tram.G.u>=o.u?1:-1, want=o.u+dir*(o.hw+pw+0.05), edge=__tram.hwAt(__tram.G.s)-0.4;
  __tram.G.u=__tram.clamp(want,-edge,edge); if(__tram.G.vu*dir<0) __tram.G.vu=-__tram.G.vu*0.2; __tram.G.lean*=0.5;
}
__tram.ringBell=function ringBell(){
  if(__tram.state!=="play"||__tram.G.reason||__tram.G.bellRing>0) return;
  if(__tram.G.V.noBell){ __tram.G.bellRing=0.6; __tram.pop("No bell!","#c3c9cd"); return; }
  __tram.G.bellRing=0.6; __tram.snd.bell();
  // a lane over into whichever side is free: on the road, same side of an island, nobody alongside.
  // If both sides are taken they stay where they are and tell you so.
  const BLOCKERS=["car","parked","bmw","tram","cyclist","drunk","walker","ebike","roadworks","cone","tourist"];
  const laneOver=(me,u,ss)=>{
    const free=[-1,1].map(d=>u+d*2.4).filter(t=>Math.abs(__tram.onRoad(t,ss,0.45)-t)<0.05&&Math.abs(__tram.onRoad(t,ss+6,0.45)-t)<0.05&&(__tram.medAt(ss)<0.05||Math.sign(t)===Math.sign(u))
      &&!__tram.G.objs.some(q=>q!==me&&!q.dead&&!q.knocked&&BLOCKERS.includes(q.type)&&Math.abs(q.u-t)<(q.hw||0.3)+0.9&&Math.abs(q.s-ss)<(q.hl||0.3)+5));
    return free.length?__tram.pick(free):null; };
  const complain=o=>{ if(o.yell>0) return; o.yell=2.2; const b=new T.Sprite(__tram.pick(__tram.YELL_MATS)); b.scale.set(1.9,0.95,1); b.position.set(0,2.6,0); o.mesh.add(b); o.mesh.userData.bubble=b; __tram.snd.yell(o); };
  for(const o of __tram.G.objs){
    const a=o.s-__tram.G.s, inLane=Math.abs(o.u-__tram.G.u)<1.3;
    if(o.type==="tourist"&&a>-2&&a<22){ o.vu=(o.u<0?-1:1)*6; o.fleeing=true; }
    if(o.knocked) continue;
    if(o.type==="walker"&&a>-2&&a<26&&inLane&&o.dodge<=0){ const t=laneOver(o,o.u,o.s); if(t!=null){ o.dodge=Math.abs(t-o.u); o.dd=Math.sign(t-o.u); } else complain(o); }
    if(o.type==="cyclist"&&a>-2&&a<28&&inLane&&o.lcT==null){ const t=laneOver(o,o.u0,o.s); if(t!=null) o.lcT=t; else complain(o); }
    // pedestrians who did not already shout at you let out a small yelp
    if((o.type==="walker"||o.type==="tourist")&&a>-2&&a<26&&!(o.yell>0)) __tram.snd.bellStartle(o);
  }
}

__tram.update=function update(dt,demo){
  __tram.G.t+=dt; const sPrev=__tram.G.s; __tram.G.sPrev=sPrev;
  if(demo){ __tram.G.speed=7; __tram.G.s+=__tram.G.speed*dt; __tram.G.u=Math.sin(__tram.G.t*0.4)*1.2-1.2; const md=__tram.medAt(__tram.G.s); if(md>0.05){ __tram.G.u=Math.min(__tram.G.u,-(md+0.6)); const cf=__tram.chunkAt(__tram.G.s); if(cf&&cf.fork&&cf.fork.side==null) cf.fork.side=-1; } }
  else if(__tram.G.reason){
    __tram.G.crashT+=dt; __tram.G.shake*=0.9; __tram.G.speed*=Math.pow(0.05,dt); __tram.G.s+=__tram.G.speed*dt;
    __tram.G.u=__tram.clamp(__tram.G.u+__tram.G.vu*dt,-5.8,5.8); __tram.G.vu*=Math.pow(0.04,dt);
    if(__tram.G.crashT>0.9&&__tram.state==="play") __tram.gameOver();
  }
  else{
    // speed: force-based. Pedalling pushes hard at low speed and fades near the target,
    // air drag grows with speed when you coast, and the brakes bite firmly.
    const V=__tram.G.V, br=__tram.keys.br&&V.brakes;
    if(__tram.keys.br&&!V.brakes&&!__tram.G.nbw){ __tram.G.nbw=true; __tram.pop("No brakes!","#ff8a6a"); } if(!__tram.keys.br) __tram.G.nbw=false;
    // cruising and sprint speeds both carry a flat +10 km/h on top of the vehicle's own pace
    const base0=(9+Math.min(8,__tram.G.s/220))*V.spd, base=base0+10/3.6;
    // sprint is the default pace for every vehicle; V.sprintTrim (m/s) shaves a bit off a fast vehicle's top end
    const sprintV=(Math.min(22,base0*1.6/V.spd)+5/3.6)*V.spd+10/3.6+(V.sprintTrim||0);
    const target=sprintV;
    __tram.G.cruiseV=base; __tram.G.sprintV=sprintV;   // the camera and the wind read these
    __tram.G.sprinting=!br;                             // true while riding at sprint pace (everything except braking)
    let acc;
    if(br) acc=__tram.G.speed>18/3.6?-9*(V.brakeF||1)*(1-0.4*__tram.clamp(__tram.G.rain*0.62/(V.grip||1),0,0.75)):(18/3.6-__tram.G.speed)*3;
    else if(__tram.G.speed<target) acc=5.5*Math.max(0.25,1-Math.pow(__tram.G.speed/target,2));
    else { acc=-(0.35+0.0045*__tram.G.speed*__tram.G.speed); if(__tram.G.speed+acc*dt<target) acc=(target-__tram.G.speed)/dt; }
    __tram.G.speed=Math.max(0,__tram.G.speed+acc*dt); __tram.G.accNow=acc;
    __tram.G.wasBr=br;
    // steering: the lean is a damped spring (quick to answer, settles with a little weight);
    // the lean pushes you sideways, and the bike rights itself when you let go
    let input=(__tram.keys.r?1:0)-(__tram.keys.l?1:0);
    if(__tram.G.slip>0){ __tram.G.slip-=dt; input=__tram.G.slipDir; }
    const spdF=__tram.clamp(__tram.G.speed/20,0.4,1.5);
    const leanT=input?input*0.46:__tram.clamp(-__tram.G.vu*0.08,-0.42,0.42);
    const kk=110*__tram.G.V.nim/(0.7+0.3*spdF), cc=2*Math.sqrt(kk)*0.8;
    __tram.G.leanV+=((leanT-__tram.G.lean)*kk-__tram.G.leanV*cc)*dt;
    __tram.G.lean+=__tram.G.leanV*dt;
    // wet roads: you keep more sideways momentum (you slide); bigger wheels grip better
    const slip=__tram.clamp(__tram.G.rain*0.62/(__tram.G.V.grip||1),0,0.75);
    __tram.G.vu+=24*__tram.G.V.nim*(1-0.25*slip)*__tram.G.lean*dt; __tram.G.vu-=__tram.G.vu*1.9*(1-0.6*slip)*dt;
    if(!input&&Math.abs(__tram.G.vu)<0.12) __tram.G.vu*=Math.pow(0.02,dt);
    __tram.G.speed=Math.max(0,__tram.G.speed-Math.abs(__tram.G.lean)*0.6*dt);
    __tram.G.u+=__tram.G.vu*dt;
    const edge=__tram.hwAt(__tram.G.s)-0.4;
    if(__tram.G.u<-edge){__tram.G.u=-edge;__tram.G.vu=Math.abs(__tram.G.vu)*0.3;__tram.G.lean=0;__tram.G.leanV=0} if(__tram.G.u>edge){__tram.G.u=edge;__tram.G.vu=-Math.abs(__tram.G.vu)*0.3;__tram.G.lean=0;__tram.G.leanV=0}
    // the island between fork branches: whichever side you are on when it appears is your route
    const med=__tram.medAt(__tram.G.s);
    if(med>0.05){
      if(!__tram.G.forkSide){ __tram.G.forkSide=__tram.G.u<0?-1:(__tram.G.u>0?1:__tram.pick([-1,1])); const cf=__tram.chunkAt(__tram.G.s); if(cf&&cf.fork&&cf.fork.side==null) cf.fork.side=__tram.G.forkSide; }
      const inner=med+0.4;
      if(__tram.G.forkSide*__tram.G.u<inner){ __tram.G.u=__tram.G.forkSide*inner; if(__tram.G.vu*__tram.G.forkSide<0){ __tram.G.vu=-__tram.G.vu*0.3; __tram.G.lean=0; __tram.G.leanV=0; } }
    } else __tram.G.forkSide=0;
    __tram.G.s+=__tram.G.speed*dt;
    __tram.G.u+=__tram.forkCarry(__tram.G.u,sPrev,__tram.G.s);
    __tram.G.bellRing=Math.max(0,__tram.G.bellRing-dt);
    __tram.G.wT-=dt;
    if(__tram.G.wT<=0){
      const toRain=()=>{ __tram.G.wState="rain"; __tram.G.wT=__tram.rnd(25,45); };
      const toClear=()=>{ __tram.G.wState="clear"; __tram.G.wT=__tram.rnd(45,100); };
      if(__tram.G.wState==="clear"){ if(Math.random()<0.5){ __tram.G.wState="grey"; __tram.G.wT=__tram.rnd(25,55); } else toRain(); }
      else if(__tram.G.wState==="grey"){ if(Math.random()<0.35) toRain(); else toClear(); }
      else toClear();
    }
    __tram.G.rainOn=__tram.G.wState==="rain";
    __tram.G.rain+=((__tram.G.rainOn?1:0)-__tram.G.rain)*Math.min(1,dt*0.4);
    __tram.G.grey+=((__tram.G.wState==="clear"?0:1)-__tram.G.grey)*Math.min(1,dt*0.35);
    if(__tram.G.jy>0){ __tram.G.jv-=11*dt; __tram.G.jy+=__tram.G.jv*dt; if(__tram.G.jy<=0){ __tram.G.jy=0; __tram.G.jv=0; __tram.G.rampAir=false; __tram.G.jcd=0.12; __tram.G.bump=1; __tram.snd.land(); } }
    else __tram.G.jcd=Math.max(0,(__tram.G.jcd||0)-dt);
    __tram.G.inv=Math.max(0,__tram.G.inv-dt); __tram.G.broke=Math.max(0,__tram.G.broke-dt); __tram.G.bump=Math.max(0,__tram.G.bump-dt*6);
    __tram.G.shake=__tram.G.shake>0.004?__tram.G.shake*Math.pow(0.002,dt):0;
    const zi=__tram.zoneAt(__tram.G.s).i;
    if(zi!==__tram.G.zone) __tram.G.zone=zi;
    // warn about a change of street type when its roadside sign comes up
    const kc=Math.floor(__tram.G.s/__tram.CH), kw=Math.floor((__tram.G.s+35)/__tram.CH), cw=__tram.G.chunks[kw], cnow=__tram.G.chunks[kc];
    const ck=__tram.G.chunks[Math.floor(__tram.G.s/__tram.CH)];
    let on=false;
    if(ck&&!__tram.airborne()) for(const ru of ck.railU) for(const o of [-__tram.GAUGE,__tram.GAUGE]) if(Math.abs(__tram.G.u-(ru+o))<0.1) on=true;
    if(on&&!__tram.G.wasOn){ __tram.G.bump=1; __tram.snd.clack(); __tram.railBuzz(); }
    __tram.G.wasOn=on;
    // the wheel only drops into the groove when you ride (nearly) along the rail:
    // any real sideways movement, roughly 5 degrees or more, gets you across safely
    const crossing=Math.abs(__tram.G.vu)>=Math.max(1.0,__tram.G.speed*0.09);
    if(__tram.G.V.rail==="never"&&on&&__tram.G.inv<=0&&!__tram.god) __tram.crash("rail");
    else if(__tram.G.V.rail!=="immune"&&on&&!crossing&&__tram.G.inv<=0&&!__tram.god){ __tram.G.groove+=dt; if(__tram.G.groove>0.25*__tram.clamp(10/__tram.G.speed,0.5,1)) __tram.crash("rail"); }
    else __tram.G.groove=0;
    // speed pedelec timer
    // in the Miljoenenkwartier a big BMW comes tearing up from behind now and then
    if(__tram.typeAt(__tram.G.s,__tram.G.u)==="rich"&&!__tram.G.objs.some(o=>o.type==="bmw"&&!o.knocked)){
      __tram.G.bmwT=(__tram.G.bmwT==null?__tram.rnd(3,6):__tram.G.bmwT)-dt;
      if(__tram.G.bmwT<=0){ __tram.spawnBMW(); __tram.G.bmwT=__tram.rnd(6,11); }
    } else if(__tram.typeAt(__tram.G.s,__tram.G.u)!=="rich") __tram.G.bmwT=null;
    if(__tram.G.s>300&&!__tram.G.objs.some(o=>o.type==="ebike")&&__tram.typeAt(__tram.G.s,__tram.G.u)!=="rich"){
      __tram.G.ebT-=dt;
      if(__tram.G.ebT<=0){ __tram.spawnEbike(); const d=Math.min(1,__tram.G.s/1300); __tram.G.ebT=__tram.rnd(12,24)*(1-0.3*d); }
    }
  }
  if(!(__tram.keys.br&&__tram.G.V.brakes)||demo) __tram.G.pedal+=Math.min(__tram.G.speed*1.7,15)*(1-0.45*__tram.G.stand)*dt;
  __tram.ensureChunks();
  if(__tram.G.uoff.length) __tram.crossRebase(__tram.G,sPrev,__tram.G.s);

  const live=!demo&&!__tram.G.reason;
  for(const o of __tram.G.objs){
    const ahead=o.s-__tram.G.s;
    if(!o.active&&ahead<70) o.active=true;
    const ps=o.s;
    if(o.killT!=null){ o.killT-=dt; if(o.killT<=0) o.dead=true; }
    if(o.yell>0){ o.yell-=dt; const b=o.mesh.userData.bubble; if(b){ b.position.y=2.6+Math.sin(__tram.G.t*9)*0.05; if(o.yell<=0||o.knocked){ o.mesh.remove(b); o.mesh.userData.bubble=null; o.yell=0; } } }
    if(o.life!=null){ o.life-=dt; if(o.life<=0) o.dead=true; }
    if(o.knocked){
      o.kt=Math.min(1,o.kt+dt*3.5);
      if(o.disint!=null&&!o.blown){ o.disint-=dt; if(o.disint<=0){ o.blown=true; __tram.blowUpCar(o); } }
      if(o.fly){
        // pedestrians: a short arc up and away, then a little skid on landing
        o.vy-=9.8*dt; o.y+=o.vy*dt; o.u+=o.vu*dt; o.s+=o.vs*dt; o.spin+=o.sr*dt;
        if(o.y<=0){
          o.y=0;
          if(!o.bounced&&o.vy<-3.5){ o.bounced=true; o.vy=-o.vy*0.25; o.vu*=0.6; o.vs*=0.6; o.sr*=0.5; }
          else { o.fly=false; o.slideV=o.vs*0.45; o.slideU=o.vu*0.45; }
        }
      } else {
        // bikes (and landed pedestrians) slide along the road and slow down
        o.s+=o.slideV*dt; o.u+=o.slideU*dt; const dk=Math.pow(0.22,dt); o.slideV*=dk; o.slideU*=dk;
        if(o.smoke&&(o.slideV>1.2||Math.abs(o.slideU)>0.7)) o.smokeAcc=(o.smokeAcc||0)+dt*28;
      }
      if(o.s!==ps) o.u+=__tram.forkCarry(o.u,ps,o.s);
      if(__tram.G.uoff.length&&o.s!==ps) __tram.crossRebase(o,ps,o.s);
      if(live&&!o.fly&&!o.rolled&&(__tram.BIKES.includes(o.type)||__tram.PEOPLE.includes(o.type))&&__tram.G.jy<=0.02&&__tram.overlaps(o,0.2,0.3)){ o.rolled=true; __tram.G.bump=1; __tram.G.speed*=0.97; __tram.snd.thud(o); }
      continue;
    }
    if(o.active){
      if(o.type==="tram"){ o.s+=o.v*dt; const lo=o.cs+15,hi=o.cs+__tram.CH-15; if(o.s<lo){o.s=lo;o.v=0} if(o.s>hi){o.s=hi;o.v=0} }
      else if(o.type==="car") o.s+=o.v*dt;
      else if(o.type==="parked"){ if(o.doorer&&ahead<13){ if(!o.doorHeard){ o.doorHeard=true; __tram.snd.doorOpen(o); } o.door=Math.min(1,o.door+dt*3.2); } }
      else if(o.type==="tourist"){ o.u+=o.vu*dt; o.step+=dt*Math.abs(o.vu)*4.2; if(Math.abs(o.u)>(o.lim||9.5)) o.dead=true; }
      else if(o.type==="cyclist"){
        if(o.lcT!=null){ const st=__tram.clamp(o.lcT-o.u0,-dt*2.4,dt*2.4); o.u0+=st; if(Math.abs(o.lcT-o.u0)<0.01) o.lcT=null; }
        o.s+=o.v*dt; o.u=o.u0+Math.sin(__tram.G.t*0.7+o.ph)*0.22; o.phase+=o.v*dt*1.7; }
      else if(o.type==="walker"){
        o.s+=o.v*dt; o.step+=dt*Math.abs(o.v)*4.2;
        if(o.dodge>0){ const st=Math.min(o.dodge,2.6*dt); o.u=__tram.onRoad(o.u+o.dd*st,o.s,0.35); o.dodge-=st; o.step+=st*3; }
      }
      else if(o.type==="drunk"){
        o.t-=dt; if(o.t<=0){ o.t=__tram.rnd(0.9,2.2); const c=__tram.chunkAt(o.s); const ln=c?(c.fork?c.LU.filter(x=>Math.sign(x)===Math.sign(o.u)).map(x=>x+Math.sign(x)*(__tram.forkM(c.fork,o.s)-c.fork.M1)):c.LU):[o.u]; o.tu=ln.length?__tram.pick(ln):o.u; }
        const L=__tram.hwAt(o.s)-0.5; o.vu2=__tram.clamp(o.tu-o.u,-1,1)*1.7+Math.sin(__tram.G.t*2.6+o.ph)*0.9;
        o.u=__tram.onRoad(__tram.clamp(o.u+o.vu2*dt,-L,L),o.s,0.5); o.s+=o.v*dt; o.phase+=o.v*dt*1.7;
      }
      else if(o.type==="bmw"){ if(o.s<__tram.G.s+8) o.v=Math.max(o.v,__tram.G.speed+12); if(!o.honk&&o.s>__tram.G.s-14){ o.honk=true; __tram.snd.horn(o); } o.s+=o.v*dt; if(o.s>__tram.G.s+280) o.dead=true; }
      else if(o.type==="ebike"){ if(o.s<__tram.G.s+6) o.v=Math.max(o.v,__tram.G.speed+9); if(!o.rang2&&o.s>__tram.G.s-11){ o.rang2=true; __tram.snd.ringRing(o); } o.s+=o.v*dt; o.phase+=o.v*dt*1.5; if(o.s>__tram.G.s+260) o.dead=true; }
      if(o.s!==ps){ const dm=__tram.forkCarry(o.u,ps,o.s); if(dm){ o.u+=dm; if(o.u0!=null) o.u0+=dm; if(o.tu!=null) o.tu+=dm; if(o.lcT!=null) o.lcT+=dm; } }
      if(o.type==="bmw"||o.type==="ebike") __tram.ram(o);
      // steer around the island at forks and stay on the road where it narrows; look a few metres ahead
      if(!o.knocked&&(o.type==="car"||o.type==="bmw"||o.type==="cyclist"||o.type==="ebike"||o.type==="walker")){
        const key=o.type==="cyclist"?"u0":"u", cur=o[key], ahead=o.s+(o.v>=0?5:-5);
        const tgt=__tram.onRoad(__tram.onRoad(cur,ahead,(o.hw||0.3)+0.25),o.s,(o.hw||0.3)+0.15);
        if(Math.abs(tgt-cur)>0.002){ const st=__tram.clamp(tgt-cur,-dt*3.4,dt*3.4); o[key]+=st; if(key==="u0") o.u+=st; }
        const lat=(o.u-(o.pu==null?o.u:o.pu))/Math.max(dt,0.001), fwd=Math.max(1,Math.abs(o.v||1));
        o.yaw=(o.yaw||0)+(__tram.clamp(Math.atan2(lat,fwd),-0.45,0.45)-(o.yaw||0))*Math.min(1,dt*4);
      }
      if(__tram.G.uoff.length&&o.s!==ps&&__tram.crossRebase(o,ps,o.s)){ if(o.u0!=null) o.u0=o.u; if(o.tu!=null) o.tu=o.u; o.lcT=null; }
      o.pu=o.u;
    }
    if(!live||o.dead) continue;
    const du=Math.abs(o.u-__tram.G.u), ds=Math.abs(o.s-__tram.G.s), PW=__tram.G.V.hw||0.24, PH=__tram.G.V.hl||0.85;
    if(o.type==="cub"){ if(__tram.overlaps(o,0.35,0.7)){ o.dead=true; __tram.G.cub++; __tram.addWallet(1); __tram.pop("+€1","#ffd54a"); __tram.snd.coin(); } continue; }
    if(o.type==="helmet"){
      if(__tram.overlaps(o,0.3,0.6)){ o.dead=true; if(__tram.G.helmet){ __tram.G.bonus+=10; __tram.pop("+10 spare helmet","#d4f03a"); } else { __tram.G.helmet=true; __tram.G.helmets++; __tram.pop("Helmet on","#d4f03a"); } __tram.snd.helmetOn(); }
      continue;
    }
    if(o.type==="ramp"){
      // ride up the boards, then get thrown off the top end (steering keeps working in the air)
      const p=(__tram.G.s-(o.s-o.hl))/(2*o.hl), h=__tram.RAMP_H*__tram.clamp(p,0,1);
      if(p>=0&&p<1&&du<o.hw+PW*0.5&&__tram.G.jy<=h+0.15){ __tram.G.jy=Math.max(0.03,h); __tram.G.jv=__tram.G.speed*__tram.RAMP_H/__tram.RAMP_L; __tram.G.onRamp=o; }
      else if(__tram.G.onRamp===o){
        __tram.G.onRamp=null;
        if(p>=1){ __tram.G.jy=__tram.RAMP_H; __tram.G.jv=__tram.RAMP_V; __tram.G.rampAir=true; __tram.snd.jump(); }
      }
      continue;
    }
    if(o.type==="vomit"){ if(!o.hit&&__tram.G.jy<=0.02&&__tram.overlaps(o,0.1,0.2)){ o.hit=true; if(!__tram.G.V.immune.includes("vomit")) __tram.startSlip(); } continue; }
    const t=o.type==="parked"?"car":o.type;
    // in the air you only pass over something if you are actually higher than it
    // in the air you pass over something only if you get higher than it before you reach it; once you are over,
    // it stays cleared until you are past it, even while you come down on the far side
    if(o.jumpedOver){ if(!__tram.overlaps(o,PW,PH)) o.jumpedOver=false; continue; }
    if(__tram.G.jy>0.02&&__tram.jumpClears(t)&&__tram.G.jy>__tram.clearH(t)){ if(__tram.overlaps(o,PW,PH)) o.jumpedOver=true; continue; }
    if(o.type==="cone"){ if(!o.parts&&__tram.overlaps(o,PW,PH)){ __tram.shatter(o,o.mesh,0.8); __tram.maybeLookBack(o); __tram.G.speed*=0.95; __tram.pop("Cone down!","#ff8a3a"); __tram.snd.coneDown(o); } continue; }
    if(o.type==="pothole"){
      if(!o.hit&&__tram.overlaps(o,PW*0.6,PH*0.5)){
        if(__tram.G.V.immune.includes("pothole")){ o.hit=true; __tram.G.bump=1; __tram.pop("Bonk!","#f1e8d4"); __tram.snd.pothole(); }
        else __tram.crash("pothole",o);
      }
      continue;
    }
    if(o.type==="rwsign"){ if(!o.parts&&__tram.overlaps(o,PW,PH)){ if(__tram.G.V.signBreak) __tram.breakSign(o); else { __tram.crash("roadworks",o); __tram.shatter(o,o.mesh,0.6); } } continue; }
    if(__tram.overlaps(o,PW,PH)){
      const movable=!o.heavy||__tram.G.V.knockHeavy; // a cargo bike is solid unless you are a fatbike or a bakfiets
      if(movable&&(__tram.G.V.knock.includes(t)||__tram.G.V.immune.includes(t))){ __tram.knockOver(o,__tram.G.V.immune.includes(t)); __tram.maybeLookBack(o); continue; }
      if(__tram.G.inv>0||__tram.god){
        // helmet grace (or the test toggle): people and bikes still get knocked aside, solid things shove you out
        if(movable&&(__tram.BIKES.includes(t)||__tram.PEOPLE.includes(t))) __tram.knockAnim(o); else __tram.pushOut(o,PW);
        continue;
      }
      __tram.crash(t,o); continue;
    }
    if(o.type==="parked"&&o.door>0.3){
      const reach=0.9+1.05*Math.sin(o.door*1.1), uMin=Math.min(o.u+o.side*0.9,o.u+o.side*reach), uMax=Math.max(o.u+o.side*0.9,o.u+o.side*reach);
      const dzc=o.s-o.mesh.userData.door.position.z-0.55;
      if(!(__tram.airborne()&&__tram.jumpClears("door"))&&__tram.G.u+0.28>uMin&&__tram.G.u-0.28<uMax&&Math.abs(dzc-__tram.G.s)<0.55+0.85){
        if(__tram.G.V.knock.includes("door")||__tram.G.V.immune.includes("door")){
          const d=o.mesh.userData.door; __tram.shatter(o,d,1.2); for(const pt of o.parts){ if(pt.ttl==null){ pt.ttl=__tram.rnd(0.7,1.0); pt.sc=pt.m.scale.clone(); } } o.mesh.userData.door=null; o.door=0; o.doorer=false; __tram.maybeLookBack(o);
          __tram.pop("Bang!","#f1e8d4"); __tram.snd.doorBang(o); if(!__tram.G.V.immune.includes("door")) __tram.G.speed*=0.93;
        }
        else __tram.crash("door",{u:o.u+o.side*reach});
      }
    }
    // a car you brush past has a 1 in 4 chance of honking
    if(o.type==="car"&&ds<o.hl+0.85&&!o.honkRolled&&du-(o.hw+0.28)<1.0){ o.honkRolled=true; if(Math.random()<0.25) __tram.snd.horn(o); }
    if(__tram.NEAR[o.type]){
      if(ds<o.hl+0.85){ o.minGap=Math.min(o.minGap,du-(o.hw+0.28)); o.over=true; }
      else if(o.over&&!o.scored){ o.scored=true; if(o.minGap<0.45){ const [pts,txt]=__tram.NEAR[o.type]; __tram.G.bonus+=pts; __tram.G.near++; __tram.pop(txt,o.type==="ebike"?"#d4f03a":"#f1e8d4"); __tram.snd.nearMiss(o); } }
    }
  }
  for(const w of __tram.G.objs){
    if(w.knocked||w.dead||!__tram.PEOPLE.includes(w.type)) continue;
    for(const v of __tram.G.objs){
      if(v.knocked||v.dead||!(v.type==="car"||v.type==="tram"||v.type==="bmw")) continue;
      if(Math.abs(w.u-v.u)<(v.hw||1)+0.28&&Math.abs(w.s-v.s)<(v.hl||2)+0.3){ __tram.launch(w,{u:v.u,v:v.v||0},1.0); if(Math.abs(w.s-__tram.G.s)<60) __tram.pop(__tram.pick(["Aïe!","Auw!","Hela!"]),"#f1e8d4"); break; }
    }
  }
  // debris from knocked-over signs: tumble, bounce and settle on the road
  for(const o of __tram.G.objs) if(o.parts) for(const p of o.parts){
    if(p.ttl!=null){
      if(p.gone) continue;
      p.ttl-=dt; const k=__tram.clamp(p.ttl/0.22,0,1); if(k<1) p.m.scale.copy(p.sc).multiplyScalar(Math.max(0.001,k));
      if(p.ttl<=0){ p.gone=true; p.m.visible=false; __tram.scene.remove(p.m); continue; }
    }
    if(p.rest) continue;
    p.v.y-=9.8*dt; p.m.position.addScaledVector(p.v,dt);
    p.m.rotation.x+=p.av.x*dt; p.m.rotation.y+=p.av.y*dt; p.m.rotation.z+=p.av.z*dt;
    if(p.m.position.y<0.06){ p.m.position.y=0.06; p.v.y*=-0.3; p.v.x*=0.55; p.v.z*=0.55; p.av.multiplyScalar(0.5); if(Math.abs(p.v.y)<0.4&&p.v.length()<0.5) p.rest=true; }
  }
  __tram.G.objs=__tram.G.objs.filter(o=>{ if(o.dead||o.s<__tram.G.s-30){ __tram.removeObj(o); return false; } return true; });
}

__tram.__inits.push(() => {

/* ================= logic ================= */
__tram.metres=()=>Math.floor(__tram.G.s);
__tram.score=()=>__tram.metres()+__tram.G.cub*25+__tram.G.bonus;
__tram.popsEl=$("pops");
__tram.god=false;
// something gets hit: bikes topple and skid forward trailing smoke, pedestrians are launched up and away
__tram.BIKES=["cyclist","drunk","ebike"], __tram.PEOPLE=["walker","tourist"];
// the BMW and the courier plough through traffic: whatever they hit goes flying
__tram.RAMMABLE=["car","parked","cyclist","drunk","walker","tourist","ebike"];
// in the air you clear low things: rails, potholes, cones, signs, roadworks, vomit and doors
__tram.JUMPABLE=["pothole","cone","rwsign","roadworks","vomit"];
__tram.jumpClears=t=>(__tram.G.V.clears||__tram.JUMPABLE).includes(t)||(__tram.G.rampAir&&__tram.VEH.bmx.clears.includes(t));
// take-off speed off the top of a ramp: a bit more than the BMX hop (VEH.bmx.jumpV), so you fly a little further
__tram.RAMP_V=6.8;
__tram.airborne=()=>__tram.G.jy>0.35;
// how high you have to be to really pass over something, so a jump never clips through it
__tram.CLEAR={car:1.25,parked:1.25,bmw:1.3,roadworks:0.85,rwsign:1.0,cone:0.55,pothole:0.02,vomit:0.02,door:0.95,cyclist:1.1,drunk:1.1,ebike:1.1,walker:1.25,tourist:1.25};
__tram.clearH=t=>__tram.CLEAR[t]!=null?__tram.CLEAR[t]:0.35;
__tram.NEAR={bmw:[20,"+20 dodged the BMW"],tram:[15,"+15 close call"],ebike:[15,"+15 dodged"],cyclist:[10,"+10 close pass"],drunk:[15,"+15 dodged the drunk"]};

});
