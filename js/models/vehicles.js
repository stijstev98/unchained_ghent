/* Tram, cars and the speeding BMW. The shapes are OBJ files in assets/models/vehicles:
     tram.obj, car-<kind>.obj, car-door-<kind>.obj, bmw-extras.obj
   Cars are loaded as separate pieces (opts.parts) because they break apart when launched and the door swings. */
import { __tram, T, $ } from "../runtime.js";

/* -- tram: three articulated sections with rounded cabs at both ends -- */
__tram.makeTram=function makeTram(){
  const g=__tram.model("vehicles/tram",{over:{dest:__tram.pick(__tram.destMats)}});
  // every tram gets its own copy of the materials so it can fade out when it is right next to the camera
  const fmats=[];
  // big flat white sides shadow themselves into fine stripes (shadow acne): the tram casts shadows but does not receive them
  g.traverse(ch=>{ if(ch.isMesh){ const cl=ch.material.clone(); ch.material=cl; fmats.push(cl); ch.receiveShadow=false; } });
  g.userData.fadeMats=fmats; g.userData.fade=1;
  return g;
}

__tram.setFade=function setFade(m,f){
  const ud=m.userData; if(Math.abs((ud.fade||1)-f)<0.01) return; ud.fade=f;
  for(const mt of ud.fadeMats){ mt.transparent=f<0.995; mt.opacity=f; mt.depthWrite=f>=0.995; }
}

/* -- cars: 'paint' and 'paint_side' in the OBJ take the colour of each car. Pieces named opt.* are optional extras. -- */
__tram.makeCar=function makeCar(color,doorSide,forceKind){
  const kind=forceKind||__tram.pick(["hatch","hatch","sedan","estate","suv","mini","van","hatch","sedan"]), K=__tram.CAR_KINDS[kind];
  const g=__tram.model("vehicles/car-"+kind,{parts:true,over:{paint:color,paint_side:color}});
  const extras={roofbox:(kind==="estate"||kind==="suv")&&Math.random()<0.2, spoiler:kind==="hatch"&&Math.random()<0.4, sunroof:kind!=="van"&&Math.random()<0.3};
  for(const m of [...g.children]) if(m.name.startsWith("opt.")&&!extras[m.name.slice(4)]) g.remove(m);
  g.userData.pad=g.getObjectByName("shadowpad");
  // The pieces only have to be separate when the car is blown up (gameplay.js blowUpCar), so until then the body is one mesh per material.
  // splitParts() puts the original pieces back; the door below is added afterwards and stays separate.
  const pieces=[...g.children];
  __tram.bakeStatic(g,new Set([g.userData.pad]));
  const kept=new Set(g.children), baked=[...g.children].filter(c=>!pieces.includes(c)), loose=pieces.filter(c=>!kept.has(c));
  g.userData.splitParts=()=>{ for(const m of baked){ g.remove(m); if(m.geometry.userData.own) m.geometry.dispose(); } for(const p of loose) g.add(p); g.userData.splitParts=null; };
  if(doorSide){
    // the front door on the kerb side, hinged at its front edge
    const piv=new T.Group(); piv.position.set(doorSide*(K.W/2),0.38,-K.doors[0]); g.add(piv);
    piv.scale.x=doorSide<0?-1:1; // the door is modelled for the right-hand side; mirror it for the left
    for(const c of [...__tram.model("vehicles/car-door-"+kind,{parts:true,over:{paint:color}}).children]) piv.add(c);
    g.userData.door=piv;
  }
  g.userData.hl=K.len;
  return g;
}

__tram.makeBMW=function makeBMW(){
  const g=__tram.makeCar(0x111418,0,"sedan"); g.scale.set(1.12,1.1,1.15);
  for(const c of [...__tram.model("vehicles/bmw-extras",{parts:true}).children]) g.add(c);
  g.userData.hl=2.3*1.15;
  return g;
}
