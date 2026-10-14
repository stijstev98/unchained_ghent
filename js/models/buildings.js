/* Street houses, modern blocks, villas, towers and industrial halls, assembled from the building kit in
   assets/models/buildings (see manifest.json for what each file is).

   The kit works on the bay grid: a wall is a stack of bay slabs (3.0 m wide, 3.2 m tall, 0.25 m thick, one window each) so
   windows and floor lines always line up. Houses are 6 or 9 m wide (2 or 3 bays) and 9 m deep (3 bays); roofs,
   shopfronts, doors and awnings are whole OBJ pieces placed on that grid. Everything is built facing +X and the
   finished building is merged into a few meshes per material (one draw call each) and turned to face the street. */
import { __tram, T, $ } from "../runtime.js";

// one kit piece, placed at x,y,z, turned ry about Y, with material slots (over) filled in
const put=(g,key,x,y,z,ry,over,sc)=>{
  const m=__tram.model("buildings/"+key,over?{over}:undefined); m.position.set(x,y,z);
  if(ry) m.rotation.y=ry; if(sc) m.scale.set(sc[0],sc[1],sc[2]); g.add(m); return m;
};

/* The four walls of a box: nb bays along the front (z), nd bays deep (x), floors high, centred on ox,oz with the
   bottom at oy. win / blank = the materials for the two kinds of bay. The back always has windows, the sides are blank,
   and the front ground floor is blank when a shopfront covers it (frontBlank). */
const walls=(g,nb,nd,floors,win,blank,frontBlank,ox,oy,oz)=>{
  const B=__tram.BAY, FL=__tram.FLOOR, w=nb*B, d=nd*B, ow={facade_win:win}, ob={facade_blank:blank};
  for(let f=0;f<floors;f++){
    const y=oy+f*FL, blankFront=f===0&&frontBlank;
    for(let k=0;k<nb;k++){
      const z=oz-w/2+B/2+k*B;
      put(g,blankFront?"bay-blank":"bay-window",ox+d/2,y,z,0,blankFront?ob:ow);
      put(g,"bay-window",ox-d/2,y,z,Math.PI,ow);
    }
    for(let k=0;k<nd;k++){
      const x=ox-d/2+B/2+k*B;
      put(g,"bay-blank",x,y,oz+w/2,-Math.PI/2,ob);
      put(g,"bay-blank",x,y,oz-w/2,Math.PI/2,ob);
    }
  }
};

// the group that holds a building while it is assembled: everything inside faces +X, a turns it to face the street
const shell=(face)=>{ const g=new T.Group(), a=new T.Group(); g.add(a); if(face<0) a.rotation.y=Math.PI; return [g,a]; };
const snapBays=(len)=>Math.max(1,Math.round(len/__tram.BAY));

__tram.makeHouse=function makeHouse(style,w,d,h,face,near,street){
  if(style!=="industrial"&&Math.random()<(style==="town"?0.18:0.07)&&street!=="student"){ const mh=__tram.pick([10,12,14,16]); return __tram.makeModern(w,d,Math.max(h,mh),face,near); }
  const B=__tram.BAY, FL=__tram.FLOOR, industrial=style==="industrial", student=street==="student";
  const fi=__tram.pick(__tram.STYLE_FACADES[style]), floors=Math.max(2,Math.round((h-0.8)/FL)), nb=snapBays(w), nd=snapBays(d);
  h=floors*FL; w=nb*B; d=nd*B;
  const shop=near&&!industrial&&Math.random()<(student?0.9:0.55); // a shopfront covers the front ground floor
  const set=__tram.facadeSet(fi,student), [g,a]=shell(face);
  walls(a,nb,nd,floors,set.win,set.blank,shop,0,0,0);

  const kind=industrial?"saw":(style==="gable"?__tram.pick(["step","step","step","bell","pitch","bell"]):__tram.pick(["flat","pitch","step","cornice","bell","flat"]));
  if(kind==="saw"){
    for(let i=0;i<nb;i++) for(let j=0;j<nd;j++) put(a,"roof-saw-bay",-d/2+B/2+j*B,h,-w/2+B/2+i*B);
  } else {
    const rw=w<7.5?6:9; // roof pieces exist for 6 and 9 m houses
    put(a,"roof-"+kind+"-"+rw,0,h,0,0,kind==="pitch"?{roof_main:__tram.roofMat(__tram.facadeStyle(fi))}:{facade_blank:set.blank});
    if(kind==="pitch"&&Math.random()<0.5) put(a,"roof-pitch-dormer",0,h,0,0,{facade_blank:set.blank});
    if(kind==="step"&&Math.random()<0.5) put(a,"hoist",0,h,0); // warehouse hoist beam and loading door (Graslei style)
  }
  if(Math.random()<0.45) put(a,"chimney",__tram.rnd(-d/3,d/3),h+2.6,__tram.rnd(-w/4,w/4));
  if(student&&near){ for(let i=0,n=__tram.ri(1,3);i<n;i++) put(a,"poster",d/2,3.6+__tram.rnd(-0.2,0.3),__tram.rnd(-w/2+0.4,w/2-0.4),0,{poster_face:__tram.pick(__tram.POSTERS)}); }
  const bayZ=(k)=>-w/2+B/2+k*B;
  if(!industrial) for(let k=0;k<nb;k++) put(a,"plinth-bay",d/2,0,bayZ(k)); // blue-grey hardstone plinth, typical for Ghent houses
  if(near&&!industrial){
    // a front door is centred in a bay, so it sits exactly over that bay's ground-floor window
    const door=(dz)=>put(a,"door",d/2,0,dz,0,{door_leaf:__tram.doorMat(fi)});
    if(shop){
      const si=student?__tram.pick([2,0,9,10,11,2,14,13]):__tram.pick(__tram.NORMAL_SHOPS), shut=student&&Math.random()<0.4;
      // the shop fills two bays; on a 9 m house the third bay is left for the front door
      const end=Math.random()<0.5?-1:1, shopBays=Math.min(2,nb), sc=nb>=3?-end*B/2:0, sw=shopBays*B-0.5;
      put(a,"shopfront",d/2,0,sc,0,{shop_face:shut?__tram.pick(__tram.SHUTTERS):__tram.shopMat(si)},[1,1,sw/5.5]);
      if(nb>=3) door(end*(w/2-B/2));
      // small double-sided blade sign on a bracket between the shop and the first-floor sills (max 60 x 60 cm in Ghent)
      if(!shut&&Math.random()<0.6){ const bs=__tram.makeBladeSign(si); bs.position.set(d/2,3.45,sc+__tram.rnd(-sw/2+0.7,sw/2-0.7)); a.add(bs); }
      if(Math.random()<0.5) put(a,"awning",d/2,0,sc,0,{awning:__tram.pick(__tram.awningMats)},[1,1,(sw-0.1)/5.4]);
    } else door(bayZ(__tram.ri(0,nb-1)));
  }
  return __tram.flatten(g);
}

/* Modern block: whole bays across, whole floors up, one window per bay and floor; flat roof, balconies and a glass front. */
__tram.makeModern=function makeModern(w,d,h,face,near){
  const B=__tram.BAY, FL=__tram.FLOOR, mi=__tram.ri(0,2), mat=__tram.MODERN[mi], [g,a]=shell(face);
  const floors=Math.max(3,Math.round(h/FL)), nb=snapBays(w), nd=snapBays(d); h=floors*FL; w=nb*B; d=nd*B;
  walls(a,nb,nd,floors,mat,mat,false,0,0,0);
  __tram.BX(a,__tram.plain(mi===1?0x2b2f33:0xd8d4cc),d+0.1,0.5,w+0.1,0,h+0.25,0,false);
  if(Math.random()<0.5){ // a set-back top floor
    const nb2=Math.max(1,nb-1), nd2=Math.max(1,Math.round(nd*0.6));
    walls(a,nb2,nd2,1,mat,mat,false,-d*0.15,h,0); __tram.BX(a,__tram.plain(0xd8d4cc),nd2*B+0.1,0.3,nb2*B+0.1,-d*0.15,h+FL-0.1,0,false);
  }
  const fx=d/2;
  if(mi!==1) for(let y=6.4;y<h-1;y+=FL*(Math.random()<0.5?1:2)){ __tram.BX(a,__tram.plain(0xe8e4dc),1.2,0.16,w*0.7,fx+0.6,y,0,false); __tram.BX(a,__tram.glassRail,0.04,0.95,w*0.7,fx+1.18,y+0.55,0,false); }
  if(near){ __tram.BX(a,__tram.AM.glass,0.12,2.8,w-0.6,fx+0.07,1.5,0,false); __tram.BX(a,__tram.plain(0x2b2f33),0.14,0.2,w-0.4,fx+0.08,3.0,0,false); }
  return __tram.flatten(g);
}

/* Miljoenenkwartier villa: windowed walls, a hip roof with dormers and chimneys, and a white porch. */
__tram.makeVilla=function makeVilla(w,d,h,face){
  const B=__tram.BAY, FL=__tram.FLOOR, fi=__tram.pick([6,3,7,6]), set=__tram.facadeSet(fi,false), [g,a]=shell(face);
  const floors=Math.max(2,Math.round((h-0.8)/FL)), nb=snapBays(w), nd=snapBays(d); h=floors*FL; w=nb*B; d=nd*B;
  walls(a,nb,nd,floors,set.win,set.blank,false,0,0,0);
  __tram.BX(a,__tram.ROOF.coping,d+0.3,0.35,w+0.3,0,h+0.1,0,false);
  const roof=put(a,"villa-roof",0,h+0.27+2.6,0); roof.rotation.y=Math.PI/4; roof.scale.set((d+0.6)/1.414,5.2,(w+0.6)/1.414);
  for(const z of [-w/3,w/3]) __tram.BX(a,__tram.ROOF.chimney,0.7,2.4,0.9,0,h+3.2,z);
  for(const z of [-w/4,w/4]) put(a,"villa-dormer",d/2,h,z,0,{facade_blank:set.blank});
  put(a,"villa-porch",d/2,0,0);
  return __tram.flatten(g);
}

/* Dok Noord tower: a shaft of whole floors above a dark 4.2 m base, so the slabs line up with the window rows. */
__tram.makeTower=function makeTower(w,d,h,face){
  const B=__tram.BAY, FL=__tram.FLOOR, BASE=4.2, T_=__tram.TOWER, glassy=Math.random()<0.55, mat=glassy?T_.glass:T_.resi, [g,a]=shell(face);
  const nb=snapBays(w), nd=snapBays(d); w=nb*B; d=nd*B;
  const floorsFor=(top)=>Math.max(2,Math.round((top-BASE)/FL));
  __tram.BX(a,T_.dark,d+0.2,BASE,w+0.2,0,2.1,0);
  const floors1=floorsFor(Math.random()<0.4?h*0.7:h), h1=BASE+floors1*FL;
  walls(a,nb,nd,floors1,mat,mat,false,0,BASE,0);
  if(h1<h-FL){
    const floors2=Math.max(1,Math.round((h-h1)/FL)); h=h1+floors2*FL;
    walls(a,Math.max(1,Math.round(nb*0.7)),Math.max(1,Math.round(nd*0.75)),floors2,mat,mat,false,0,h1,-w*0.1); __tram.BX(a,T_.slab,d+0.3,0.3,w+0.3,0,h1+0.15,0,false);
  } else h=h1;
  __tram.BX(a,T_.slab,d*0.8,0.5,w*0.7,0,h+0.25,0,false); __tram.BX(a,T_.dark,2,1.6,3,0,h+1.1,w*0.15);
  if(!glassy) for(let y=BASE+FL;y<h1-1;y+=FL) __tram.BX(a,T_.slab,1.3,0.18,w*0.85,d/2+0.6,y,0,false);
  else for(let y=BASE;y<h1;y+=FL) __tram.BX(a,T_.slab,d+0.08,0.25,w+0.08,0,y,0,false);
  return __tram.flatten(g);
}
