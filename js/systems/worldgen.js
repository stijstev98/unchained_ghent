/* Run state and what gets spawned along the street. */
import { __tram, T, $ } from "../runtime.js";

__tram.clearWorld=function clearWorld(){
  if(!__tram.G) return;
  for(const k in __tram.G.chunks) __tram.disposeChunk(__tram.G.chunks[k]);
  for(const o of __tram.G.objs) __tram.removeObj(o);
}
__tram.newGame=function newGame(){
  __tram.clearWorld();
  __tram.randomCurve();
  const startZ=__tram.pick(__tram.ZONES.map((z,i)=>i).filter(i=>__tram.ZONES[i].types.includes("normal")));
  __tram.G={zl:[{s0:0,z:startZ}],s:0,u:0,vu:0,lean:0,leanV:0,wasBr:false,stand:0,speed:9,chunks:{},next:-2,objs:[],cub:0,near:0,bonus:0,groove:0,shake:0,zone:0,crashT:0,reason:null,bellRing:0,t:0,pedal:0,camInit:false,ebT:__tram.rnd(16,26),segType:"normal",segLeft:__tram.ri(1,3),forkNext:null,lastFork:null,forkSide:0,pendF:null,uoff:[],uBase:0,lastSpecial:null,warned:{},slip:0,slipDir:0,
     V:__tram.VEH[__tram.curVeh],nbw:false,rain:0,rainOn:false,grey:0,wState:"clear",wT:__tram.rnd(40,80),rainShown:-1,jy:0,jv:0,jcd:0,
     helmet:false,inv:0,broke:0,bump:0,wasOn:false,helmets:0};
  __tram.ensureChunks();
}
__tram.makeDrunk=function makeDrunk(){
  const m=__tram.makeCyclist(__tram.npcOpts({helmet:null,jacket:__tram.pick([0xd23a6a,0x3a9ad2,0xf2c14e,0x6cc28a]),crate:Math.random()<0.5}));
  const ic=new T.Sprite(__tram.BEER); ic.scale.set(0.62,0.62,1); ic.position.set(0,2.45,0); m.add(ic); m.userData.icon=ic;
  return m;
}
/* An NPC cyclist: mesh plus the object properties that go with it. About one in six rides a bakfiets: same "cyclist"
   class, but longer, wider and a bit slower, and flagged heavy: only a fatbike or another bakfiets (VEH knockHeavy)
   can run it off the road. */
__tram.npcCyclist=function npcCyclist(){
  if(Math.random()>=0.17) return { mesh:__tram.makeCyclist(__tram.npcOpts()), props:{hw:0.3,hl:0.9,v:__tram.rnd(3.8,6)} };
  const B=__tram.VEH.bakfiets, look=Object.assign({},B.model,{frame:__tram.pick([0x2f5a4a,0x6a4a2f,0x3a4a5a,0x8e2f2f,0x3a6a8a]),crate:false,basket:false,kickstand:false});
  return { mesh:__tram.makeCyclist(__tram.npcOpts(look)), props:{heavy:true,hw:B.hw,hl:B.hl,v:__tram.rnd(3.8,6)*B.spd} };
}
// traffic inside one half of a fork: each branch spawns by its own street type
__tram.spawnFork=function spawnFork(F,k){
  const a=Math.max(k*__tram.CH,F.s0+__tram.OPEN+4), b=Math.min((k+1)*__tram.CH,F.s1-6); if(b-a<10) return;
  for(const [Bk,sg] of [[F.L,-1],[F.R,1]]){
    const lanes=[1.2,3.6,6.0], ty=Bk.type;
    // u measured from the inner kerb of the branch, turned into a road position at that point
    const fitB=(u,ss)=>{ const m=__tram.forkM(F,ss); return sg*__tram.clamp(m+u,m+0.55,m+2*F.hwB-0.55); };
    const put=(type,u,extra,mesh)=>{ const ss=__tram.rnd(a,b); return __tram.add(Object.assign({type,u:fitB(u,ss),s:ss},extra),mesh); };
    for(let i=0,n=__tram.ri(1,2)+Math.round(Math.min(1,a/10000)*2);i<n;i++) put("cub",__tram.pick(lanes)+__tram.rnd(-0.6,0.6),{hw:0.2,hl:0.2},__tram.makeCub());
    const ncar=ty==="rich"?__tram.ri(1,2):(ty==="normal"&&Math.random()<0.5?1:0);
    for(let i=0;i<ncar;i++){ const mesh=__tram.makeCar(__tram.pick(__tram.CAR_COLS)); put("car",__tram.pick(lanes),{hw:0.9,hl:mesh.userData.hl,v:__tram.rnd(2.5,5)},mesh); }
    const ncy={normal:__tram.ri(0,1),bike:__tram.ri(2,3),cobble:__tram.ri(0,2),park:__tram.ri(0,1),student:__tram.ri(0,1),rich:0}[ty];
    if(ty!=="rich"&&Math.random()<0.25&&b-a>24){ const ps=__tram.rnd(a+16,b), ln=__tram.pick(lanes)+__tram.rnd(-0.3,0.3); __tram.add({type:"pothole",u:fitB(ln,ps),s:ps,hw:0.42,hl:0.4},__tram.makePothole()); __tram.add({type:"cone",u:fitB(ln,ps-14),s:ps-14,hw:0.25,hl:0.25},__tram.makeWarnCone()); }
    for(let i=0;i<ncy;i++){ const c=__tram.npcCyclist(), o=put("cyclist",__tram.pick(lanes)+__tram.rnd(-0.4,0.4),Object.assign({ph:__tram.rnd(0,6),phase:__tram.rnd(0,6),minGap:99},c.props),c.mesh); o.u0=o.u; }
    const nw=ty==="park"?__tram.ri(1,3):(ty==="student"?__tram.ri(0,1):0);
    for(let i=0;i<nw;i++) put("walker",__tram.pick(lanes)+__tram.rnd(-0.5,0.5),{hw:0.3,hl:0.3,v:Math.random()<0.6?__tram.rnd(1,1.5):-__tram.rnd(1,1.5),step:__tram.rnd(0,6),dodge:0,dd:1},__tram.makePerson());
    if(ty==="student"){
      if(Math.random()<0.5){ const o=put("drunk",__tram.pick(lanes),{tu:0,t:0,hw:0.3,hl:0.9,v:__tram.rnd(3,4.5),ph:__tram.rnd(0,6),phase:0,minGap:99},__tram.makeDrunk()); o.tu=o.u; }
      for(let i=0,n=__tram.ri(1,2);i<n;i++) put("vomit",__tram.pick(lanes)+__tram.rnd(-0.4,0.4),{hw:0.5,hl:0.5},__tram.makeVomit());
    }
    if(Math.random()<(__tram.G.helmet?0.03:0.08)) put("helmet",__tram.pick(lanes),{hw:0.3,hl:0.3},__tram.makeHelmetPickup());
  }
}
__tram.genChunk=function genChunk(k){
  const d=Math.min(1,Math.max(0,k)/20), s=k*__tram.CH, prev=__tram.G.chunks[k-1];
  // street type schedule: normal stretches alternate with special streets
  let type="normal";
  // the chunk after a junction is the neighbourhood you chose, and the road shifts over to that branch
  if(__tram.G.pendF&&k===__tram.G.pendF.k0+2){
    const F=__tram.G.pendF; __tram.G.pendF=null; const Bc=F.side<0?F.L:F.R;
    __tram.G.segType=Bc.type; __tram.G.segLeft=__tram.ri(2,4);
    // the neighbourhood you picked begins where the junction ends
    __tram.G.zl=__tram.G.zl.filter(e=>e.s0<F.s1); __tram.G.zl.push({s0:F.s1,z:Bc.zone});
    __tram.G.uoff.push([F.s1,F.side*F.Uc]);
  }
  if(k>=3){
    // the neighbourhood picks the street: its main type most of the time, now and then one of its others
    const zt=__tram.zoneAt(s+__tram.CH/2).z.types;
    if(!zt.includes(__tram.G.segType)){ __tram.G.segType=zt[0]; __tram.G.segLeft=__tram.ri(2,4); }
    else if(__tram.G.segLeft<=0){
      if(zt.length>1&&__tram.G.segType===zt[0]){ __tram.G.segType=__tram.pick(zt.slice(1)); __tram.G.segLeft=__tram.ri(1,2); }
      else { __tram.G.segType=zt[0]; __tram.G.segLeft=__tram.ri(2,4); }
    }
    type=__tram.G.segType; __tram.G.segLeft--;
  }
  // junctions take two chunks: the split, then the branches swinging apart
  if(__tram.G.forkNext&&__tram.G.forkNext.k0===k-1){ const F=__tram.G.forkNext; __tram.G.forkNext=null; __tram.G.chunks[k]={type:"normal",fork:F,n:6,hw:F.endHw,LU:F.lanes,railU:[],group:null}; __tram.spawnFork(F,k); return; }
  if(k>=4&&prev&&!prev.fork&&(__tram.G.forceFork||(k-(__tram.G.lastFork||-99)>6&&Math.random()<0.16))){ __tram.G.forceFork=false;
    const here=__tram.zoneAt(k*__tram.CH).z, cand=__tram.ZONES.map((z,i)=>i).filter(i=>__tram.ZONES[i]!==here);
    const byType=t=>cand.filter(i=>__tram.ZONES[i].types[0]===t);
    let za=__tram.G.forceTypes?__tram.pick(byType(__tram.G.forceTypes[0])):__tram.pick(cand), zb;
    if(__tram.G.forceTypes) zb=__tram.pick(byType(__tram.G.forceTypes[1]).filter(i=>i!==za));
    else { const other=cand.filter(i=>i!==za&&__tram.ZONES[i].types[0]!==__tram.ZONES[za].types[0]); zb=__tram.pick(other.length?other:cand.filter(i=>i!==za)); }
    const br=i=>({type:__tram.ZONES[i].types[0],dest:__tram.ZONES[i].name,zone:i});
    const F={k0:k,s0:k*__tram.CH,s1:(k+2)*__tram.CH,M1:5,M2:20,hwB:3.6,hp:prev.hw,endHw:3.6,side:null,L:br(za),R:br(zb)};
    F.Uc=F.M2+F.hwB; F.lanes=[-(F.M1+6),-(F.M1+3.6),-(F.M1+1.2),F.M1+1.2,F.M1+3.6,F.M1+6];
    __tram.G.forkNext=F; __tram.G.lastFork=k; __tram.G.pendF=F;
    // the neighbourhood you are in runs through the whole junction: no third one may start halfway,
    // so the next one you see is the one on the sign you followed
    { const L=__tram.zoneList(F.s1+1); let i=L.length-1; while(i>0&&L[i].s0>F.s0) i--; L.length=i+1; L[i].len=Math.max(L[i].len||__tram.ZL,F.s1-L[i].s0+__tram.ZL); }
    __tram.G.chunks[k]={type:"normal",fork:F,n:6,hw:F.endHw,LU:F.lanes,railU:[],group:null}; __tram.spawnFork(F,k); return;
  }
  const R=__tram.TYPES[type].lanes;
  let n;
  if(k<1) n=5;
  else if(!prev||prev.type!==type) n=__tram.ri(R[0],R[1]);
  else { n=prev.n; if(Math.random()<0.35) n=__tram.clamp(n+__tram.pick([-1,1]),R[0],R[1]); }
  const hw=n*1.2, LUc=Array.from({length:n},(_,i)=>(i-(n-1)/2)*2.4);
  // a 3-lane road is the usual amount; each extra lane adds a little moving traffic (0 or 1 more on 4 lanes, up to 2 on 5)
  const extra=n>3?__tram.ri(0,n-3):0;
  let rails=[];
  if(k===0) rails=[2.4];
  else if(k>0&&(type==="normal"||type==="cobble")){
    const minHw=Math.min(hw,prev.hw);
    const cand=LUc.filter(u=>Math.abs(u)+1.2<=minHw+0.01);
    const cont=(prev.railU||[]).filter(u=>cand.some(c=>Math.abs(c-u)<0.01));
    if(cont.length&&Math.random()<0.5) rails=cont.slice();
    else if(cand.length&&Math.random()<(type==="cobble"?0.75:0.8)){ const a=__tram.pick(cand); rails=[a]; if(d>0.3&&n>=4&&Math.random()<0.4){ const b=__tram.pick(cand); if(Math.abs(b-a)>4.7) rails.push(b); } }
  }
  // now and then a canal crosses under the road: a short stone bridge with water on both sides
  const canal=(k>=3&&type!=="park"&&Math.random()<0.15)?s+__tram.rnd(30,62):null;
  __tram.G.chunks[k]={type,n,hw,LU:LUc,railU:rails,group:null,canal};
  if(k<0) return;
  const lim=ss=>__tram.hwAt(ss)-0.55, fit=(u,ss)=>__tram.clamp(u,-lim(ss),lim(ss));
  const far=Math.min(1,Math.max(0,s)/10000);
  const nc=k===0?3:__tram.ri(2,4)+Math.round(far*3);
  for(let i=0;i<nc;i++){ const ss=s+__tram.rnd(k===0?25:5,__tram.CH-5); __tram.add({type:"cub",u:fit(__tram.pick(LUc)+__tram.pick([0,0,-0.75,0.75,-1.15,1.15]),ss),s:ss,hw:0.2,hl:0.2},__tram.makeCub()); }
  if(k===0) return;
  const isRail=u=>rails.some(r=>Math.abs(r-u)<0.01);
  const free=LUc.filter(u=>!isRail(u)), used=new Set();
  // roadworks
  let rw=null;
  const rwP=type==="normal"?(k<2?0:0.08+0.14*d):{bike:0.3,cobble:0.22,student:0.22,park:0.3,rich:0}[type];
  if(free.length>1&&Math.random()<rwP){
    const u=__tram.pick(free); used.add(u); const rs=s+__tram.rnd(40,72);
    // half the time it is a pothole marked by a cone instead of full roadworks (park paths only get potholes)
    if(type==="park"||Math.random()<0.5){
      rw=__tram.add({type:"pothole",u:fit(u+__tram.rnd(-0.4,0.4),rs),s:rs,hw:0.42,hl:0.4},__tram.makePothole());
      __tram.add({type:"cone",u:rw.u,s:rs-14,hw:0.25,hl:0.25},__tram.makeWarnCone());
    } else {
      rw=__tram.add({type:"roadworks",u,s:rs,hw:1.2,hl:2.3},__tram.makeRoadworks());
      __tram.add({type:"rwsign",u,s:rs-22,hw:0.4,hl:0.3},__tram.makeRwSign());
    }
    for(const o of __tram.G.objs) if(o.type==="cub"&&Math.abs(o.u-u)<1.5&&o.s>rs-24&&o.s<rs+3.5) o.dead=true;
  }
  // now and then someone has piled up trash into a ramp: ride it for a big jump
  const rampLanes=free.filter(u=>!used.has(u));
  if(k>=3&&rampLanes.length&&Math.random()<{normal:0.12,cobble:0.12,student:0.2,bike:0.1}[type]){
    const u=__tram.pick(rampLanes); used.add(u); const rs=s+__tram.rnd(20,__tram.CH-30);
    __tram.add({type:"ramp",u:fit(u,rs),s:rs,hw:1.0,hl:__tram.RAMP_L/2},__tram.makeRamp());
    for(const o of __tram.G.objs) if(o.type==="cub"&&Math.abs(o.u-u)<1.3&&Math.abs(o.s-rs)<2.5) o.dead=true;
  }
  for(const u of rails) if(Math.random()<(type==="cobble"?0.4+0.3*d:0.45+0.35*d)){
    const onc=Math.random()<0.3+0.25*d;
    __tram.add({type:"tram",u,s:s+__tram.rnd(18,__tram.CH-18),hw:1.2,hl:14.8,v:onc?-__tram.rnd(4.5,6.5):__tram.rnd(1.5,3),onc,cs:s,minGap:99},__tram.makeTram());
  }
  if(type==="rich"){
    // villa street: parked cars along the kerbs and plenty of slow traffic
    if(n>=3) for(const [u,side] of [[LUc[0],1],[LUc[n-1],-1]]){
      if(Math.random()<0.75){ used.add(u); for(let i=0,cnt=__tram.ri(1,2);i<cnt;i++){ const mesh=__tram.makeCar(__tram.pick(__tram.CAR_COLS),side); __tram.add({type:"parked",u:u+(side>0?-0.25:0.25),s:s+18+i*36+__tram.rnd(0,18),hw:0.9,hl:mesh.userData.hl,side,doorer:Math.random()<0.3,door:0},mesh); } }
    }
    const lanesC=free.filter(u=>!used.has(u)); const lanesUse=lanesC.length?lanesC:free;
    for(let i=0,nm=__tram.ri(2,4)+extra;i<nm;i++){ const mesh=__tram.makeCar(__tram.pick(__tram.CAR_COLS.concat([0x111418,0xece8df,0x4b4f57]))); __tram.add({type:"car",u:__tram.pick(lanesUse),s:s+16+i*(66/Math.max(1,nm))+__tram.rnd(0,8),hw:0.9,hl:mesh.userData.hl,v:__tram.rnd(2.5,5.5)},mesh); }
  }
  if(type==="normal"){
    if(n>=3) for(const [u,side] of [[LUc[0],1],[LUc[n-1],-1]]){
      if(isRail(u)||used.has(u)) continue;
      if(Math.random()<(rw?0.7:1)*(0.35+0.35*d)){
        used.add(u);
        const cnt=__tram.ri(1,2);
        for(let i=0;i<cnt;i++){ const mesh=__tram.makeCar(__tram.pick(__tram.CAR_COLS),side); __tram.add({type:"parked",u:u+(side>0?-0.25:0.25),s:s+20+i*38+__tram.rnd(0,22),hw:0.9,hl:mesh.userData.hl,side,doorer:Math.random()<0.35+d*0.3,door:0},mesh); }
      }
    }
    const mid=free.filter(u=>!used.has(u)&&u!==LUc[0]&&u!==LUc[n-1]);
    let nm=mid.length?__tram.ri(0,1+Math.round(d*1.5))+extra:0;
    if(rw) nm=Math.max(0,nm-1);
    for(let i=0;i<nm;i++){ const u=__tram.pick(mid); used.add(u); const mesh=__tram.makeCar(__tram.pick(__tram.CAR_COLS)); __tram.add({type:"car",u,s:s+18+i*28+__tram.rnd(0,12),hw:0.9,hl:mesh.userData.hl,v:__tram.rnd(2.5,5)},mesh); }
  }
  // cyclists, plenty of them on a fietsstraat
  const bikeLanes=free.filter(u=>!used.has(u));
  const NCY={normal:[d>0.1?1:0,1+Math.round(d*1.5)],bike:[3,5],cobble:[1,3],park:[1,2],student:[1,2],rich:[0,0]}[type];
  let ncy=bikeLanes.length?__tram.ri(NCY[0],NCY[1])+extra:0;
  if(rw) ncy=Math.max(0,ncy-1);
  for(let i=0;i<ncy;i++){
    const ss=s+18+i*(62/Math.max(1,ncy))+__tram.rnd(0,8), u0=fit(__tram.pick(bikeLanes)+__tram.rnd(-0.5,0.5),ss);
    const c=__tram.npcCyclist(); __tram.add(Object.assign({type:"cyclist",u:u0,u0,s:ss,ph:__tram.rnd(0,6),phase:__tram.rnd(0,6),minGap:99},c.props),c.mesh);
  }
  if(type==="student"&&bikeLanes.length&&Math.random()<0.75){
    const u=__tram.pick(bikeLanes);
    __tram.add({type:"drunk",u,tu:u,t:0,s:s+__tram.rnd(30,70),hw:0.3,hl:0.9,v:__tram.rnd(3,4.5),ph:__tram.rnd(0,6),phase:0,minGap:99},__tram.makeDrunk());
  }
  // pedestrians walking along the road (park paths and the student quarter)
  const nw=type==="park"?__tram.ri(2,4):(type==="student"?__tram.ri(1,2):0);
  const walkLanes=bikeLanes.length?bikeLanes:free;
  for(let i=0;i<nw;i++){
    const ss=s+20+__tram.rnd(0,62), v=Math.random()<0.6?__tram.rnd(1.0,1.5):-__tram.rnd(1.0,1.5);
    __tram.add({type:"walker",u:fit(__tram.pick(walkLanes)+__tram.rnd(-0.6,0.6),ss),s:ss,hw:0.3,hl:0.3,v,step:__tram.rnd(0,6),dodge:0,dd:1},__tram.makePerson());
  }
  if(type==="student"){
    for(let i=0,nv=__tram.ri(2,3);i<nv;i++){ const ss=s+__tram.rnd(22,82); __tram.add({type:"vomit",u:fit(__tram.pick(LUc)+__tram.rnd(-0.5,0.5),ss),s:ss,hw:0.5,hl:0.5},__tram.makeVomit()); }
  }
  // helmet pickup: more likely while you ride without one
  if(k>=2&&bikeLanes.length&&Math.random()<(__tram.G.helmet?0.05:0.14)){
    const ss=s+__tram.rnd(18,__tram.CH-10);
    __tram.add({type:"helmet",u:fit(__tram.pick(bikeLanes)+__tram.rnd(-0.4,0.4),ss),s:ss,hw:0.3,hl:0.3},__tram.makeHelmetPickup());
  }
  // tourists crossing with a map
  const nt=type==="normal"?(k>=2&&Math.random()<(rw?0.55:1)*(0.3+0.35*d)?1:0):{bike:__tram.ri(2,3),cobble:__tram.ri(1,2),student:__tram.ri(0,1),park:0,rich:0}[type];
  for(let i=0;i<nt;i++){
    const ss=s+__tram.rnd(20,__tram.CH-12), left=Math.random()<0.5, h=__tram.hwAt(ss);
    __tram.add({type:"tourist",u:left?-(h+1.6):h+1.6,s:ss,hw:0.3,hl:0.3,vu:(left?1:-1)*__tram.rnd(1.1,1.9),step:0,lim:h+3.3},__tram.makeTourist());
  }
  // now and then a row of five coins: down a tram lane, past parked car doors or up to a hole in the road
  if(k>=2&&Math.random()<0.2){
    const risky=[];
    for(const r of rails) risky.push({u:r,s0:s+__tram.rnd(14,50)});
    for(const o of __tram.G.objs) if(o.type==="parked"&&o.s>s&&o.s<s+__tram.CH) risky.push({u:o.u+(o.side>0?1.3:-1.3),s0:__tram.clamp(o.s-9,s+6,s+__tram.CH-18)});
    if(rw) risky.push({u:rw.u,s0:rw.s-(rw.type==="roadworks"?19:12)-12.8});
    const pickR=risky.length&&Math.random()<0.85?__tram.pick(risky):{u:__tram.pick(LUc),s0:s+__tram.rnd(14,55)};
    const u=fit(pickR.u,pickR.s0);
    for(const o of __tram.G.objs) if(o.type==="cub"&&Math.abs(o.u-u)<1.2&&o.s>pickR.s0-2&&o.s<pickR.s0+15) o.dead=true;
    for(let i=0;i<5;i++) __tram.add({type:"cub",u,s:pickR.s0+i*3.2,hw:0.2,hl:0.2,row:true},__tram.makeCub());
  }
}

// where your lane is d metres behind you: undo the junction shift and the branch swing between here and there
__tram.uBehind=function uBehind(u,d,pad){ const o={u}, a=__tram.G.s, b=__tram.G.s-d; __tram.crossRebase(o,a,b); o.u+=__tram.forkCarry(o.u,a,b); return __tram.onRoad(o.u,b,pad); }
__tram.spawnEbike=function spawnEbike(){
  const mesh=__tram.makeCyclist({jacket:0xd4f03a,pants:0x1e2125,helmet:0x111111,frame:0x2a2d31,ebike:true,crouch:true,hivis:true,bigbag:0x2fa58f,gloves:0x111111});
  const o=__tram.add({type:"ebike",u:__tram.uBehind(__tram.G.u+__tram.rnd(-0.3,0.3),26,0.5),s:__tram.G.s-26,hw:0.3,hl:0.9,v:__tram.G.speed+9,phase:0,minGap:99,active:true,life:10},mesh);
  __tram.snd.ringRing(o);
}
__tram.spawnBMW=function spawnBMW(){
  const u=__tram.uBehind(__tram.G.u+__tram.rnd(-0.3,0.3),28,1.0);
  __tram.add({type:"bmw",u,s:__tram.G.s-28,hw:1.0,hl:2.65,v:__tram.G.speed+12,minGap:99,active:true,life:10},__tram.makeBMW());
}
__tram.ensureChunks=function ensureChunks(){
  while(__tram.G.next*__tram.CH<__tram.G.s+300){
    const F=__tram.G.pendF;
    if(F&&F.side==null&&__tram.G.next>=F.k0+2){ if(__tram.G.s>F.s0+12) F.side=__tram.G.u<0?-1:1; else break; }
    __tram.genChunk(__tram.G.next); __tram.G.next++;
  }
  // old shift lines fold into the base offset once they are well behind
  while(__tram.G.uoff.length&&__tram.G.uoff[0][0]+__tram.UR0+__tram.UR1<__tram.G.s-80) __tram.G.uoff.shift();
  for(const key in __tram.G.chunks){
    const k=+key, c=__tram.G.chunks[k];
    if(!c.group&&(k+1)*__tram.CH>__tram.G.s-40&&k*__tram.CH<__tram.G.s+__tram.VIEW.build&&(__tram.G.chunks[k+1]!==undefined||(c.fork&&c.fork.k0===k-1))) __tram.buildChunk(k);
    if(c.group&&(k+1)*__tram.CH<__tram.G.s-40) __tram.disposeChunk(c);
  }
}

__tram.__inits.push(() => {

/* ================= game state ================= */
__tram.state="menu",__tram.paused=false,__tram.G,__tram.muted=false,__tram.best=0;
try{__tram.best=+localStorage.getItem("tramspoor3d-best")||0}catch(e){}
__tram.keys={l:false,r:false,sp:false,br:false};
__tram.baseFov=62;
__tram.add=(o,mesh)=>{o.mesh=mesh; __tram.scene.add(mesh); __tram.G.objs.push(o); return o;};
__tram.NPC_JACKETS=[0x3d6fb0,0xc94f3d,0x2f7a63,0x7b4a8c,0xece8df,0x2a2d31,0xd98c3a];
// realistic Belgian car colours: lots of grey, black, white and silver, a few blues and reds
__tram.CAR_COLS=[0xd9d9d6,0x1c1f22,0x8e9399,0x55595e,0x22324a,0x7a2a26,0xd9d9d6,0x8e9399,0x3d6fb0,0xc9c3b4,0x2f4a3a,0x1c1f22,0xb02a2a];
__tram.npcOpts=extra=>Object.assign({jacket:__tram.pick(__tram.NPC_JACKETS),pants:__tram.pick([0x34465e,0x2a2d31,0x6b5a4a,0x8a8a8a]),helmet:Math.random()<0.45?__tram.pick([0x111111,0xece8df,0xc94f3d]):null,
  frame:__tram.pick([0x1f2a3a,0x8e2f2f,0xd8d1c3,0x2f5a4a,0x111111,0x6a8fb0]),crate:Math.random()<0.35,basket:Math.random()<0.3,bag:Math.random()<0.4?0x3b3f45:null,shorts:Math.random()<0.25},extra||{});

});
