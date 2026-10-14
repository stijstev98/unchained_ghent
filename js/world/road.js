/* Street types, junctions and the road chunks. */
import { __tram, T, $ } from "../runtime.js";

__tram.quad=function quad(B,key,ua,ub,y,sa,sb,uvs){
  if(ua>ub){const t=ua;ua=ub;ub=t;}
  const b=B[key]||(B[key]=__tram.builder()), base=b.p.length/3, sc=uvs||1;
  for(const s of [sa,sb]) for(const u of [ua,ub]){ const [x,z]=__tram.P(u,s); b.p.push(x,y,z); b.n.push(0,1,0); b.uv.push(u/sc,s/sc); }
  b.i.push(base,base+1,base+2,base+1,base+3,base+2);
}
__tram.wall=function wall(B,key,u,ya,yb,sa,sb){
  const b=B[key]||(B[key]=__tram.builder()), base=b.p.length/3;
  for(const s of [sa,sb]){ const f=__tram.frameAt(s),[x,z]=__tram.P(u,s); for(const y of [ya,yb]){ b.p.push(x,y,z); b.n.push(f.rx,0,f.rz); b.uv.push(s/2,y/2); } }
  b.i.push(base,base+2,base+1,base+1,base+2,base+3);
}
__tram.toMeshes=function toMeshes(B,group){
  for(const k in B){
    const b=B[k], g=new T.BufferGeometry();
    g.setAttribute("position",new T.Float32BufferAttribute(b.p,3));
    g.setAttribute("normal",new T.Float32BufferAttribute(b.n,3));
    g.setAttribute("uv",new T.Float32BufferAttribute(b.uv,2));
    g.setIndex(b.i); g.userData.own=true;
    const m=new T.Mesh(g,__tram.MAT[k]); m.receiveShadow=k!=="wire"; group.add(m);
  }
}
__tram.forkM=function forkM(F,s){ const a=F.s0+__tram.OPEN; if(s<=F.s0) return 0; if(s<a) return F.M1*__tram.smoothstep((s-F.s0)/__tram.OPEN); if(s>=F.s1) return F.M2; return F.M1+(F.M2-F.M1)*__tram.smoothstep((s-a)/(F.s1-a)); }
__tram.medAt=function medAt(s){ const c=__tram.chunkAt(s); return c&&c.fork?__tram.forkM(c.fork,s):0; }
// centre of the branch being ridden, for the camera; eases in from the road centre as the island appears
__tram.laneCentre=function laneCentre(s){ const c=__tram.chunkAt(s); if(!c||!c.fork) return 0; const F=c.fork, sd=F.side||__tram.G.forkSide; if(!sd) return 0; const m=__tram.forkM(F,s); return sd*(m+__tram.hwAt(s))/2*Math.min(1,m/F.M1); }
// as a branch swings outward, whatever is on it moves out with it, keeping its place across the branch
__tram.forkCarry=function forkCarry(u,a,b){
  const ca=__tram.chunkAt(a), cb=__tram.chunkAt(b), F=(ca&&ca.fork)||(cb&&cb.fork); if(!F) return 0;
  const ma=__tram.forkM(F,a), mb=__tram.forkM(F,b); if(ma<0.01&&mb<0.01) return 0;
  return (u<0?-1:1)*(mb-ma);
}
__tram.typeAt=function typeAt(s,u){ const c=__tram.chunkAt(s); if(!c) return "normal"; return c.fork?(u<0?c.fork.L.type:c.fork.R.type):c.type; }
// keep a point on the road surface and out of the island
__tram.onRoad=function onRoad(u,s,pad){
  const h=__tram.hwAt(s)-pad, m=__tram.medAt(s); u=__tram.clamp(u,-h,h);
  if(m>0.02&&Math.abs(u)<m+pad) u=(u<0?-1:1)*(m+pad);
  return u;
}
__tram.hwAt=function hwAt(s){
  const k=Math.floor(s/__tram.CH), c=__tram.G.chunks[k]; if(!c) return 6;
  if(c.fork){ const F=c.fork; if(s<F.s0+__tram.OPEN){ const t=__tram.smoothstep(__tram.clamp((s-F.s0)/__tram.OPEN,0,1)); return F.hp+(F.M1+2*F.hwB-F.hp)*t; } return __tram.forkM(F,s)+2*F.hwB; }
  const p=__tram.G.chunks[k-1], t=s-k*__tram.CH;
  if(p&&p.hw!==c.hw&&t<__tram.TAPER) return p.hw+(c.hw-p.hw)*__tram.smoothstep(t/__tram.TAPER);
  return c.hw;
}
// quads and walls whose edges can differ at the two ends (for widening and narrowing)
__tram.q4=function q4(B,key,ua1,ub1,ua2,ub2,y,sa,sb,uvs){
  if(ua1>ub1){ let t=ua1;ua1=ub1;ub1=t; t=ua2;ua2=ub2;ub2=t; }
  const b=B[key]||(B[key]=__tram.builder()), base=b.p.length/3, sc=uvs||1;
  for(const [s,ua,ub] of [[sa,ua1,ub1],[sb,ua2,ub2]]) for(const u of [ua,ub]){ const [x,z]=__tram.P(u,s); b.p.push(x,y,z); b.n.push(0,1,0); b.uv.push(u/sc,s/sc); }
  b.i.push(base,base+1,base+2,base+1,base+3,base+2);
}
__tram.w4=function w4(B,key,u1,u2,ya,yb,sa,sb){
  const b=B[key]||(B[key]=__tram.builder()), base=b.p.length/3;
  for(const [s,u] of [[sa,u1],[sb,u2]]){ const f=__tram.frameAt(s),[x,z]=__tram.P(u,s); for(const y of [ya,yb]){ b.p.push(x,y,z); b.n.push(f.rx,0,f.rz); b.uv.push(s/2,y/2); } }
  b.i.push(base,base+2,base+1,base+1,base+2,base+3);
}
__tram.buildChunk=function buildChunk(k){
  const c=__tram.G.chunks[k], s0=k*__tram.CH,s1=s0+__tram.CH,grp=new T.Group(),B={}, prev=__tram.G.chunks[k-1], next=__tram.G.chunks[k+1];
  const roadKey=__tram.ROADKEY[c.type];
  // the closing half of a junction stops a hair short of the shift line, so nothing is built across it
  const sEnd=c.fork&&c.fork.k0===k-1?s1-0.002:s1;
  for(let s=s0;s<s1;s+=__tram.STEP){
    const sa=s,sb=Math.min(sEnd,s+__tram.STEP),sm=(sa+sb)/2;
    const hA=__tram.hwAt(sa),hB=__tram.hwAt(sb),wA=hA+3.2,wB=hB+3.2;
    if(c.fork){
      const mA=__tram.medAt(sa), mB=__tram.medAt(sb), F=c.fork;
      for(const [Bk,sg] of [[F.L,-1],[F.R,1]]){ const rk=__tram.ROADKEY[Bk.type]; __tram.q4(B,rk,sg*mA,sg*hA,sg*mB,sg*hB,0,sa,sb,rk==="setts"?2.5:(rk==="dirt"?4:8)); }
      if(mA>0.02||mB>0.02){
        const iA=Math.max(0,mA-0.25), iB=Math.max(0,mB-0.25), wide=mA>3.6, pA=wide?Math.max(0.2,mA-3.2):iA, pB=wide?Math.max(0.2,mB-3.2):iB;
        for(const sg of [-1,1]){ __tram.w4(B,"kerb",sg*mA,sg*mB,0,0.14,sa,sb); __tram.q4(B,"kerb",sg*iA,sg*mA,sg*iB,sg*mB,0.14,sa,sb); if(wide) __tram.q4(B,"cob",sg*pA,sg*iA,sg*pB,sg*iB,0.13,sa,sb,2); }
        __tram.q4(B,"grass",-pA,pA,-pB,pB,0.14,sa,sb,4);
      }
    } else __tram.q4(B,roadKey,-hA,hA,-hB,hB,0,sa,sb,roadKey==="setts"?2.5:(roadKey==="dirt"?4:8));
    for(const side of [-1,1]){
      const t=__tram.sideType(side,sm);
      if(t==="park"){ __tram.q4(B,"grass",side*hA,side*(hA+46),side*hB,side*(hB+46),0.04,sa,sb,4); continue; }
      __tram.q4(B,"kerb",side*hA,side*(hA+0.3),side*hB,side*(hB+0.3),0.14,sa,sb);
      __tram.w4(B,"kerb",side*hA,side*hB,0,0.14,sa,sb);
      __tram.q4(B,"cob",side*(hA+0.3),side*wA,side*(hB+0.3),side*wB,0.13,sa,sb,2);
      if(t==="houses") __tram.q4(B,"ground",side*wA,side*(wA+21),side*wB,side*(wB+21),0.1,sa,sb);
      else if(t==="villa") __tram.q4(B,"grass",side*wA,side*(wA+40),side*wB,side*(wB+40),0.12,sa,sb,4);
      else if(t==="canal"){
        __tram.w4(B,"stone",side*wA,side*wB,-1,0.13,sa,sb);
        __tram.q4(B,"water",side*wA,side*(wA+60),side*wB,side*(wB+60),-0.85,sa,sb,6);
        __tram.w4(B,"stone",side*(wA-0.05),side*(wB-0.05),0.13,1.05,sa,sb);
        __tram.w4(B,"stone",side*(wA-0.4),side*(wB-0.4),0.13,1.05,sa,sb);
        __tram.q4(B,"kerb",side*(wA-0.45),side*wA,side*(wB-0.45),side*wB,1.05,sa,sb);
      }
      else if(t==="open") __tram.q4(B,"cob",side*wA,side*(wA+35),side*wB,side*(wB+35),0.1,sa,sb,2);
      else{
        const bA=wA+24.8,bB=wB+24.8;
        __tram.w4(B,"stone",side*wA,side*wB,-1,0.13,sa,sb);
        __tram.q4(B,"water",side*wA,side*bA,side*wB,side*bB,-0.85,sa,sb,6);
        __tram.w4(B,"stone",side*bA,side*bB,-1,0.13,sa,sb);
        __tram.q4(B,"ground",side*bA,side*(bA+36),side*bB,side*(bB+36),0.12,sa,sb);
        __tram.w4(B,"stone",side*(wA-0.05),side*(wB-0.05),0.13,1.0,sa,sb);
        __tram.w4(B,"stone",side*(wA-0.35),side*(wB-0.35),0.13,1.0,sa,sb);
        __tram.q4(B,"kerb",side*(wA-0.4),side*wA,side*(wB-0.4),side*wB,1.0,sa,sb);
      }
    }
    for(const u of c.railU){
      if(c.type!=="cobble") __tram.quad(B,"bed",u-1.15,u+1.15,0.006,sa,sb,2);
      for(const o of [-__tram.GAUGE,__tram.GAUGE]){ __tram.quad(B,"rail",u+o-0.055,u+o+0.055,0.02,sa,sb); __tram.quad(B,"groove",u+o-0.018,u+o+0.018,0.024,sa,sb); }
      __tram.quad(B,"wire",u-0.015,u+0.015,5.9,sa,sb);
    }
  }
  if(c.fork){
    const F=c.fork, a=Math.max(s0,F.s0+__tram.OPEN), b=Math.min(s1,F.s1-2);
    for(const [Bk,sg] of [[F.L,-1],[F.R,1]]){
      if(Bk.type==="normal"||Bk.type==="student"||Bk.type==="rich"){
        // dashes split each branch into three lanes; drawn in short pieces so they bend with the branch
        const at=(ss,f)=>{ const m=__tram.forkM(F,ss), h=__tram.hwAt(ss); return sg*(m+(h-m)*f); };
        for(let s=Math.max(s0,Math.ceil((F.s0+10)/9)*9);s<Math.min(s1,F.s1-1);s+=9) for(const f of [1/3,2/3]) for(let q=0;q<3;q++){
          const qa=s+q, qb=Math.min(s+q+1,F.s1-0.01,sEnd); if(qb<=qa) continue;
          const u1=at(qa,f), u2=at(qb,f); __tram.q4(B,"dash",u1-0.07,u1+0.07,u2-0.07,u2+0.07,0.012,qa,qb);
        }
      }
      if(Bk.type==="bike") for(let s=a+6;s<b;s+=20){ const dm=new T.Mesh(__tram.decalGeo,__tram.DECAL); __tram.place(dm,sg*(__tram.forkM(F,s)+(Math.floor(s/20)%2?1.2:6)),s,0.016); dm.receiveShadow=true; grp.add(dm); }
    }
    // the wedge between the branches: trees while it is narrow, a block of houses once it is wide enough
    const style=__tram.zoneAt(s0+45).z.style;
    for(let s=Math.ceil(a/12)*12;s<b;s+=12){ if(__tram.forkM(F,s)>9) continue; const tr=__tram.makeTree(); __tram.place(tr,0,s,0.14); tr.scale.setScalar(0.8); grp.add(tr); }
    for(const sg of [-1,1]){
      let s=s0+2;
      while(s<s1-4){ const w=__tram.pick([6,6,9]), mid=s+w/2, m=__tram.forkM(F,mid); if(m<11){ s+=w; continue; } const d=9; const o=__tram.makeHouse(style,w,d,__tram.pick([8,10,12]),sg,true,sg<0?F.L.type:F.R.type); __tram.place(o,sg*(m-3.5-d/2),mid,0.1); grp.add(o); s+=w; }
    }
    for(let s=s0+6;s<s1;s+=24){ const m=__tram.forkM(F,s); if(m<5) continue; for(const sg of [-1,1]){ const l=__tram.makeLamp(style); __tram.place(l,sg*(m-0.9),s,0.13,sg>0?Math.PI:0); grp.add(l); } }
  }
  // just past a junction: the branch you did not take ends in a row of houses, out of the way of the new road
  if(prev&&prev.fork&&prev.fork.k0===k-2&&prev.fork.side){
    const F=prev.fork, uc=-F.side*2*F.Uc, style=__tram.zoneAt(s0).z.style;
    for(const dz of [-3.2,3.2]){ const o=__tram.makeHouse(style,6,9,__tram.pick([9,11,13]),1,false,c.type); __tram.place(o,uc+dz,s0+8,0.1,-Math.PI/2); grp.add(o); }
    for(const dz of [-7.5,7.5]){ const tr=__tram.makeTree(); __tram.place(tr,uc+dz,s0+5,0.1); grp.add(tr); }
  }
  if(!c.fork&&(c.type==="normal"||c.type==="student")){
    const sStart=prev&&prev.hw!==c.hw?s0+__tram.TAPER:s0;
    for(let s=Math.ceil(sStart/9)*9;s<s1;s+=9) for(let i=1;i<c.n;i++){ const u=c.LU[i]-1.2; __tram.quad(B,"dash",u-0.07,u+0.07,0.012,s,Math.min(s1,s+3)); }
  }
  const has=(arr,u)=>arr&&arr.some(r=>Math.abs(r-u)<0.01);
  for(const u of c.railU){
    if(!prev||!has(prev.railU,u)) __tram.quad(B,"cap",u-1.2,u+1.2,0.03,s0,s0+0.8);
    if(!next||!has(next.railU,u)) __tram.quad(B,"cap",u-1.2,u+1.2,0.03,s1-0.8,s1);
  }
  if(c.railU.length){
    for(let s=Math.ceil(s0/30)*30;s<s1;s+=30){
      const hs=__tram.hwAt(s)+0.7;
      __tram.quad(B,"wire",-hs,hs,6.6,s,s+0.04);
      for(const u of c.railU) __tram.wall(B,"wire",u,5.9,6.6,s,s+0.03);
      for(const side of [-1,1]){ const p=new T.Group(); __tram.M(p,__tram.cyl(0.1,0.14,7,8),__tram.plain(0x5f6b66),0,3.5,0); __tram.M(p,__tram.sph(0.14,8,6),__tram.plain(0x5f6b66),0,7.05,0); __tram.place(p,side*hs,s,0.13); grp.add(p); }
    }
  }
  // canal: quay walls along the water, pillars at the bridge ends, a moored boat
  if(c.canal!=null){
    for(const side of [-1,1]) for(const e of [c.canal-9,c.canal+9]){
      const w=__tram.walkAt(e), b=__tram.builder(); B.stone=B.stone||b;
      const st=B.stone, base=st.p.length/3;
      for(const u of [side*w,side*(w+60)]){ const [x,z]=__tram.P(u,e); st.p.push(x,-1,z, x,0.13,z); st.n.push(0,0,1, 0,0,1); st.uv.push(u/2,0, u/2,0.6); }
      st.i.push(base,base+1,base+2,base+1,base+3,base+2);
    }
  }
  // zebra crossing now and then, with the blue crossing signs on both sides
  if(!c.fork&&(c.type==="normal"||c.type==="rich"||c.type==="student"||c.type==="cobble")&&Math.random()<0.25){
    const zs=s0+__tram.rnd(__tram.TAPER+6,70), zh=__tram.hwAt(zs);
    for(let u=-zh+0.25;u<zh-0.5;u+=1.0) __tram.quad(B,"dash",u,u+0.5,0.013,zs,zs+3.2);
    for(const sd of [-1,1]){ const sg=__tram.makeRoadSign("crossing"); __tram.place(sg,sd*(zh+0.5),zs-0.6,0.13); grp.add(sg); }
  }
  // traffic signs at the kerb
  for(const sd of [-1,1]) for(let i=0,n=__tram.ri(0,2);i<n;i++){
    const ss=s0+__tram.rnd(8,84), t=__tram.sideType(sd,ss);
    if(t!=="houses"&&t!=="villa"&&t!=="open") continue;
    const kinds=c.type==="rich"?["zone30","noparking","parking","lez"]:c.type==="bike"?["bikestreet30","noentry_bike","zone30"]:c.type==="park"?["bikepath"]:["zone30","noparking","oneway","noentry_bike","parking","lez","bikepath","zone30"];
    const sg=__tram.makeRoadSign(__tram.pick(kinds)); __tram.place(sg,sd*(__tram.hwAt(ss)+0.45),ss,0.13); grp.add(sg);
  }
  __tram.toMeshes(B,grp);
  // De Lijn tram stop: a glass shelter and the yellow-and-white stop pole on the pavement beside a tram lane
  if(c.railU.length&&!c.fork&&Math.random()<0.3){
    const ru=__tram.pick(c.railU), side=ru<0?-1:1, ss=s0+__tram.rnd(25,65);
    if(__tram.sideType(side,ss)==="houses"){ const st=__tram.makeTramStop(); __tram.place(st,side*(__tram.hwAt(ss)+1.6),ss,0.13,side>0?0:Math.PI); grp.add(st); const kb=__tram.makeStopKerb(6); __tram.place(kb,side*(__tram.hwAt(ss)+0.18),ss,0.0,side>0?0:Math.PI); grp.add(kb); }
  }
  // De Lijn bus stop on ordinary streets
  else if((c.type==="normal"||c.type==="rich"||c.type==="student")&&!c.fork&&Math.random()<0.22){
    const side=__tram.pick([-1,1]), ss=s0+__tram.rnd(25,65);
    if(__tram.sideType(side,ss)==="houses"||__tram.sideType(side,ss)==="villa"){ const st=__tram.makeTramStop(true); __tram.place(st,side*(__tram.hwAt(ss)+1.6),ss,0.13,side>0?0:Math.PI); grp.add(st); const kb=__tram.makeStopKerb(6); __tram.place(kb,side*(__tram.hwAt(ss)+0.18),ss,0.0,side>0?0:Math.PI); grp.add(kb); }
  }
  // benches: along park paths, on squares and quays, and now and then against a facade
  for(const side of [-1,1]) for(let ss=s0+8;ss<s1-4;ss+=__tram.rnd(16,30)){
    const t=__tram.sideType(side,ss); let u=null, ry=side>0?Math.PI/2:-Math.PI/2;
    if(t==="park"&&Math.random()<0.55) u=side*(__tram.hwAt(ss)+0.9);
    else if((t==="open")&&Math.random()<0.6) u=side*(__tram.walkAt(ss)+__tram.rnd(1.5,3));
    else if((t==="water"||t==="canal")&&Math.random()<0.35){ u=side*(__tram.walkAt(ss)-1.2); ry=-ry; }
    else if(t==="houses"&&c.type!=="student"&&Math.random()<0.08)u=side*(__tram.walkAt(ss)-0.55);
    if(u!==null){ const b=__tram.makeBench(); __tram.place(b,u,ss,t==="park"?0.04:0.13,ry); grp.add(b); }
  }
  if(c.canal!=null) for(const side of [-1,1]){
    for(const e of [c.canal-9,c.canal+9]){ const pl=new T.Group(); __tram.BX(pl,__tram.MAT.stone,0.6,1.5,0.6,0,0.75,0); __tram.BX(pl,__tram.MAT.kerb,0.7,0.12,0.7,0,1.55,0,false); __tram.place(pl,side*(__tram.walkAt(e)-0.25),e,0.13); grp.add(pl); }
    const bt=__tram.makeBoat(); __tram.place(bt,side*(__tram.walkAt(c.canal)+__tram.rnd(9,20)),c.canal+__tram.rnd(-3,3),-0.85,Math.PI/2); grp.add(bt);
  }
  // landmarks
  const marks=[];
  { const ZLs=__tram.zoneList(s1+60);
    for(let i=0;i<ZLs.length;i++){ const e=ZLs[i], end=i+1<ZLs.length?ZLs[i+1].s0:e.s0+(e.len||__tram.ZL); if(end<s0-60||e.s0>s1+60) continue;
      for(const m of __tram.ZONES[e.z].marks) if(e.s0+m.at<end-(m.half||0)-6) marks.push(Object.assign({},m,{abs:e.s0+m.at})); } }
  for(const m of marks) if(m.abs>=s0&&m.abs<s1){ const o=__tram.LANDMARK[m.fn](); __tram.place(o,m.side*(__tram.walkAt(m.abs)+m.off),m.abs,0,m.side>0?Math.PI:0); grp.add(o); }
  const reserved=(side,s)=>marks.some(m=>m.side===side&&Math.abs(s-m.abs)<m.half+3);
  const bollards=[];
  for(const side of [-1,1]){
    let s=s0;
    while(s<s1){
      const t=__tram.sideType(side,s), style=__tram.zoneAt(s).z.style;
      if(t==="park"){
        if(reserved(side,s)){ s+=5; continue; }
        const tr=__tram.makeTree(); __tram.place(tr,side*(__tram.hwAt(s)+__tram.rnd(1.4,2.2)),s,0.04); grp.add(tr);
        for(let i=0,n=__tram.ri(1,3);i<n;i++){ const t2=__tram.makeTree(); t2.scale.setScalar(__tram.rnd(0.85,1.3)); __tram.place(t2,side*(__tram.hwAt(s)+__tram.rnd(5,30)),s+__tram.rnd(0,5),0.04); grp.add(t2); }
        if(Math.random()<0.35){ const bu=new T.Group(); __tram.M(bu,__tram.cached("ico",()=>new T.IcosahedronGeometry(2.3,1)),__tram.plain(0x5f8048),0,0.5,0).scale.set(0.45,0.3,0.45); __tram.place(bu,side*(__tram.hwAt(s)+__tram.rnd(2.5,4)),s+2.5,0.04); grp.add(bu); }
        s+=5; continue;
      }
      if(t==="canal"){ s+=__tram.STEP; continue; }
      if(t==="villa"){
        const w=__tram.pick([15,18,21]), mid=s+w/2; if(mid>=s1) break;
        if(!reserved(side,mid)&&!(c.canal!=null&&Math.abs(mid-c.canal)<9+w/2)){
          const d=__tram.pick([12,15]), v=__tram.makeVilla(w,d,__tram.pick([8,9.5,11]),-side);
          __tram.place(v,side*(__tram.walkAt(mid)+6+d/2),mid,0.12); grp.add(v);
          const hg=__tram.makeHedge(w,-side); __tram.place(hg,side*(__tram.walkAt(mid)+0.45),mid,0.12); grp.add(hg);
          for(let i=0,n=__tram.ri(2,3);i<n;i++){ const tr=__tram.makeTree(); __tram.place(tr,side*(__tram.walkAt(mid)+__tram.rnd(1.8,4.6)),s+__tram.rnd(1,w-1),0.12); grp.add(tr); }
          for(let i=0,n=__tram.ri(1,3);i<n;i++){ const tr=__tram.makeTree(); tr.scale.setScalar(__tram.rnd(1.1,1.5)); __tram.place(tr,side*(__tram.walkAt(mid)+6+d+__tram.rnd(3,10)),s+__tram.rnd(0,w),0.12); grp.add(tr); }
        }
        s+=w; continue;
      }
      if(c.canal!=null&&Math.abs(s+3.5-c.canal)<13){ s+=__tram.STEP; continue; }
      if(t==="open"){
        if(style!=="industrial"&&Math.floor(s)%9<__tram.STEP&&__tram.hash(Math.floor(s)*side)<0.85){
          for(const u of [3.8,12.8,21.8]){ const tr=__tram.makeTree(); __tram.place(tr,side*(__tram.walkAt(s)+u+__tram.rnd(-1,1)),s,0.1); grp.add(tr); }
        }
        s+=__tram.STEP; continue;
      }
      const w=style==="industrial"?__tram.pick([12,15,18]):__tram.pick([6,6,6,9]), mid=s+w/2; // whole bays of 3 m
      if(mid>=s1) break;
      if(!reserved(side,mid)){
        const d=style==="industrial"?15:9, h=style==="industrial"?__tram.pick([8,10]):__tram.pick([8,10,12,14]);
        const far=(t==="water"||t==="bridge");
        if(style==="industrial"&&Math.random()<0.35){
          const td=15, th=__tram.pick([24,30,36,42,48]), o=__tram.makeTower(w,td,th,-side);
          __tram.place(o,side*((far?__tram.walkAt(mid)+25.4:__tram.walkAt(mid)+1.2)+td/2),mid,far?0.12:0.1); grp.add(o);
        } else {
          const o=__tram.makeHouse(style,w,d,h,-side,!far,c.type);
          __tram.place(o,side*((far?__tram.walkAt(mid)+25.4:__tram.walkAt(mid)+0.3)+d/2),mid,far?0.12:0.1); grp.add(o);
        }
      }
      s+=w;
    }
    for(let s=Math.ceil(s0/24)*24;s<s1;s+=24){
      const pk=__tram.sideType(side,s)==="park";
      const l=__tram.makeLamp(__tram.zoneAt(s).z.style); __tram.place(l,side*(pk?__tram.hwAt(s)+0.9:__tram.walkAt(s)-0.7),s,pk?0.04:0.13,side<0?Math.PI:0); grp.add(l);
    }
    const mt=__tram.sideType(side,s0+45);
    if((mt==="water"||mt==="bridge")&&Math.random()<0.6){ const b=__tram.makeBoat(); __tram.place(b,side*(__tram.walkAt(s0+45)+__tram.rnd(7,19)),s0+__tram.rnd(10,80),-0.85); grp.add(b); }
    if(mt==="water"&&Math.random()<0.6){ for(let i=0,n=__tram.ri(1,2);i<n;i++){ const ws=s0+__tram.rnd(12,78), tr=__tram.makeTree("willow"); __tram.place(tr,side*(__tram.walkAt(ws)+24.8+__tram.rnd(1.8,3)),ws,0.12); grp.add(tr); } }
    for(let s=s0+1.2;s<s1;s+=2.4){
      if(__tram.sideType(side,s)!=="houses"||__tram.zoneAt(s).z.style==="industrial"||Math.abs((s%30+30)%30)<1.5||Math.abs((s%24+24)%24)<1.5) continue;
      bollards.push(__tram.P(side*(__tram.hwAt(s)+0.45),s));
    }
  }
  if(bollards.length){
    const a=new T.InstancedMesh(__tram.BOLL.geo,__tram.BOLL.mat,bollards.length), b=new T.InstancedMesh(__tram.BOLL.cap,__tram.BOLL.band,bollards.length), d=new T.InstancedMesh(__tram.BOLL.dome,__tram.BOLL.mat,bollards.length), m4=new T.Matrix4();
    bollards.forEach(([x,z],i)=>{ m4.makeTranslation(x,0.13+0.4,z); a.setMatrixAt(i,m4); m4.makeTranslation(x,0.13+0.66,z); b.setMatrixAt(i,m4); m4.makeTranslation(x,0.13+0.8,z); d.setMatrixAt(i,m4); });
    a.castShadow=true; grp.add(a); grp.add(b); grp.add(d);
  }
  if(Math.random()<(c.type==="student"?0.9:0.6)){
    const side=__tram.pick([-1,1]), rs=s0+__tram.rnd(12,78);
    if(__tram.sideType(side,rs)==="houses"){ const r=__tram.makeBikeRack(__tram.ri(3,5)); __tram.place(r,side*(__tram.walkAt(rs)-1.6),rs,0.13); grp.add(r); }
  }
  const plainLanes=c.LU.filter(u=>!has(c.railU,u));
  if(c.type!=="park"&&c.type!=="cobble"&&!c.fork) for(let i=0;i<2;i++){ if(!plainLanes.length) break; const ss=s0+__tram.rnd(__tram.TAPER,85), mh=new T.Mesh(__tram.cyl(0.38,0.38,0.03,18),__tram.MANHOLE); __tram.place(mh,__tram.pick(plainLanes)+__tram.rnd(-0.6,0.6),ss,0.005); mh.receiveShadow=true; grp.add(mh); }
  if(c.type==="bike"&&!c.fork){ for(let s=s0+__tram.TAPER;s<s1;s+=22){ const dm=new T.Mesh(__tram.decalGeo,__tram.DECAL); __tram.place(dm,c.LU[Math.floor(s/22)%c.n],s,0.016); dm.receiveShadow=true; grp.add(dm); } }
  else if(c.type==="normal"&&!c.fork){ for(const u of [c.LU[0],c.LU[c.n-1]]) if(!has(c.railU,u)&&Math.random()<0.5){ const dm=new T.Mesh(__tram.decalGeo,__tram.DECAL); __tram.place(dm,u,s0+__tram.rnd(__tram.TAPER,80),0.016); dm.receiveShadow=true; grp.add(dm); } }
  // Dok Noord: tower cranes over the building sites behind the street
  if(__tram.zoneAt(s0+45).z.style==="industrial"&&Math.random()<0.5){ const sd=__tram.pick([-1,1]), cs=s0+__tram.rnd(15,75); const cr=__tram.makeTowerCrane(); __tram.place(cr,sd*(__tram.walkAt(cs)+__tram.rnd(22,34)),cs,0.1); grp.add(cr); }
  // tree-lined streets: some ordinary stretches get trees in iron grates along the kerb
  if(!c.fork&&(c.type==="normal"||c.type==="cobble"||c.type==="bike")&&__tram.zoneAt(s0+45).z.style!=="industrial"&&__tram.hash(k*7.31+__tram.G.zl[0].z)<0.4){
    for(const sd of [-1,1]) for(let ss=Math.ceil(s0/11)*11+5;ss<s1;ss+=11){
      if(__tram.sideType(sd,ss)!=="houses"||Math.abs((ss%24+24)%24)<2||Math.abs((ss%30+30)%30)<2) continue;
      const tr=__tram.makeStreetTree(); __tram.place(tr,sd*(__tram.hwAt(ss)+1.15),ss,0.13); grp.add(tr);
    }
  }
  // Miljoenenkwartier: a line of big trees along both kerbs
  if(c.type==="rich"&&!c.fork) for(const sd of [-1,1]) for(let ss=Math.ceil(s0/9)*9+4;ss<s1;ss+=9){
    if(__tram.sideType(sd,ss)!=="villa") continue;
    const tr=__tram.makeTree(); tr.scale.setScalar(1.25); __tram.place(tr,sd*(__tram.hwAt(ss)+1.0),ss,0.13); grp.add(tr);
  }
  // park: now and then the path runs under a rocky grotto arch, like in the Citadelpark
  if(c.type==="park"&&!c.fork&&Math.random()<0.4){ const ss=s0+__tram.rnd(30,70), ga=__tram.makeCave(__tram.hwAt(ss)); __tram.place(ga,0,ss,0.04); grp.add(ga); c.cave=ss;
    for(const o of __tram.G.objs) if((o.type==="walker"||o.type==="pothole"||o.type==="cone"||o.type==="roadworks"||o.type==="rwsign")&&Math.abs(o.s-ss)<12) o.dead=true; }
  // student quarter: trash on the pavement and in the gutter
  const trashSides=[-1,1].filter(sd=>(c.fork?(sd<0?c.fork.L.type:c.fork.R.type):c.type)==="student");
  for(const sd of trashSides){
    for(let i=0;i<9;i++){
      const ss=s0+__tram.rnd(4,86); if(__tram.sideType(sd,ss)!=="houses") continue;
      const kind=__tram.pick(["bags","bags","crate","bin","pizza","can","can","paper","paper"]);
      const onRoad=kind==="can"||kind==="paper"||(kind==="pizza"&&Math.random()<0.5);
      const t=__tram.makeTrash(kind); __tram.place(t,sd*(onRoad?__tram.hwAt(ss)-__tram.rnd(0.15,0.6):__tram.walkAt(ss)-__tram.rnd(0.5,1.4)),ss,onRoad?0.005:0.13); grp.add(t);
    }
  }
  // street-type sign 35 m before the change, on the right-hand side
  if(next&&next.fork&&next.fork.k0===k+1){ const sg=s1-28, gt=__tram.makeGantry(next.fork,__tram.hwAt(sg)); __tram.place(gt,0,sg,0.13); grp.add(gt); }
  else if(next&&next.type!==c.type){ const ss=s1-35, sg=__tram.makeTypeSign(next.type); __tram.place(sg,(__tram.sideType(1,ss)==="park"?__tram.hwAt(ss)+1:__tram.walkAt(ss)-1.1),ss,0.13); grp.add(sg); }
  __tram.bakeChunk(grp);
  __tram.scene.add(grp);
  c.group=grp;
}

__tram.disposeChunk=function disposeChunk(c){
  if(!c.group) return;
  __tram.scene.remove(c.group);
  __tram.disposeOwn(c.group);
  c.group=null;
}

__tram.__inits.push(() => {

/* ================= road chunks ================= */
__tram.builder=()=>({p:[],n:[],uv:[],i:[]});
__tram.BOLL={geo:__tram.cyl(0.06,0.065,0.8,12),cap:__tram.cyl(0.063,0.063,0.07,12),dome:__tram.hemi(0.06),mat:__tram.plain(0x33373b),band:__tram.plain(0xf2ede0)};
__tram.decalGeo=new T.PlaneGeometry(1.1,1.4); __tram.decalGeo.rotateX(-Math.PI/2);
__tram.DECAL=__tram.lam(0xffffff,{map:__tram.bikeMarkTex,transparent:true,alphaTest:0.4});
__tram.MANHOLE=[__tram.plain(0x2a2d31),__tram.lam(0xffffff,{map:__tram.manholeTex}),__tram.plain(0x2a2d31)];
/* ================= street types & variable road width ================= */
__tram.TAPER=16;
__tram.TYPES={
  normal:{label:"Normal traffic",tag:"",lanes:[3,5]},
  bike:{label:"Fietsstraat",tag:"Fietsstraat · bikes only",lanes:[3,4]},
  cobble:{label:"Kasseistraat",tag:"Kasseien · bumpy ride",lanes:[3,4]},
  park:{label:"Parkweg",tag:"Parkweg · walkers on the path",lanes:[3,3]},
  student:{label:"Toverpoort",tag:"Toverpoort · mind the drunks",lanes:[3,3]},
  rich:{label:"Miljardenkwartier",tag:"Miljardenkwartier · cars only",lanes:[3,4]}
};
__tram.SPECIALS=["bike","cobble","park","student","rich"];
__tram.smoothstep=t=>t*t*(3-2*t);
__tram.chunkAt=s=>__tram.G.chunks[Math.floor(s/__tram.CH)];
/* junctions: the road splits around a small island, then the two branches curve apart around a wedge of
   houses; the branch you pick becomes the road, leading into that neighbourhood */
__tram.OPEN=34;
__tram.walkAt=s=>__tram.hwAt(s)+3.2;
__tram.typeSignMats={};
Object.assign(__tram.MAT,{
  bikeRoad:__tram.lam(0xffffff,{map:__tram.bikeRoadTex}), setts:__tram.lam(0xffffff,{map:__tram.settsTex}),
  dirt:__tram.lam(0xffffff,{map:__tram.dirtTex}), grass:__tram.lam(0xffffff,{map:__tram.grassTex})
});
__tram.BEER=new T.SpriteMaterial({map:__tram.beerTex});

__tram.DESTS={normal:["Centrum","Zuid","Dampoort","Sint-Pieters"],bike:["Cupoure","Visserij"],cobble:["Paterslol","Prinsenhof"],park:["Cicadepark","Blaarmeersen"],student:["Toverpoort"],rich:["Miljardenkwartier"]};
__tram.ROUTE_TAG={normal:"Cars and trams",bike:"Fietsstraat",cobble:"Kasseien",park:"Park path",student:"Student quarter",rich:"Villas and cars"};
__tram.ROADKEY={normal:"asph",student:"asph",bike:"bikeRoad",cobble:"setts",park:"dirt",rich:"asph"};

});
