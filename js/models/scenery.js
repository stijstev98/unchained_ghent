/* Trees, boats, cranes, the park grotto and the named landmarks. The shapes are OBJ files:
     assets/models/props/tree-*.obj, boat-*.obj, tower-crane*.obj, cave.obj
     assets/models/landmarks/<name>.obj
   This file picks a file, applies the random variation (turn, size, colour) and adds what an OBJ cannot hold (lights). */
import { __tram, T, $ } from "../runtime.js";

/* -- trees: ten variants, each one mesh with vertex colours -- */
__tram.TREE_COUNTS={broad:6,pine:2,poplar:2,willow:2};
__tram.makeTree=function makeTree(kind){
  const k=kind||(Math.random()<0.72?"broad":(Math.random()<0.5?"pine":"poplar"));
  const g=__tram.model("props/tree-"+k+"-"+__tram.ri(0,__tram.TREE_COUNTS[k]-1)), m=g.children[0];
  m.rotation.y=__tram.rnd(0,Math.PI*2); const sc=__tram.rnd(0.85,1.15); m.scale.set(sc,sc*__tram.rnd(0.92,1.1),sc);
  return g;
}

// a street tree in a square iron grate, for tree-lined streets
__tram.makeStreetTree=function makeStreetTree(){ const g=__tram.makeTree("broad"); g.add(__tram.model("props/tree-grate")); return g; }

/* -- quay boats: 'hull' (and 'cabin' on the houseboat) take a colour per boat -- */
__tram.makeBoat=function makeBoat(){
  const kind=__tram.pick(["tour","tour","barge","house"]);
  const hulls={tour:[0xf0ece2,0x2f4a6b,0x274c30],barge:[0x1f2a33,0x3a2a24,0x2b3f2f],house:[0x2b2f33,0x3a4a5a]}[kind], over={hull:__tram.pick(hulls)};
  if(kind==="house") over.cabin=__tram.pick([0xece8df,0x6b7a4a,0x9a4a3a]);
  const g=__tram.model("props/boat-"+kind,{over}); g.userData.kind=kind;
  return g;
}

// construction crane: mast and base are one OBJ, the jib another that turns on top of the mast
__tram.CRANE_TOP=36.22;
__tram.makeTowerCrane=function makeTowerCrane(){
  const g=__tram.model("props/tower-crane"), top=__tram.model("props/tower-crane-jib");
  top.position.y=__tram.CRANE_TOP; top.rotation.y=__tram.rnd(0,Math.PI*2); g.add(top);
  return g;
}

// the park path runs through a rock tunnel (exported for a 3-lane, 7.2 m path); the lanterns inside are lit by real lights
__tram.makeCave=function makeCave(){
  const g=__tram.model("props/cave"), R=3.6+1.3, L=16;
  for(const z of [-L/4,L/4]) for(const sg of [-1,1]){ const pl=new T.PointLight(0xffc37a,0.7,9); pl.position.set(sg*(R-0.6),2.5,z); g.add(pl); }
  return g;
}

/* -- landmarks: one OBJ each, placed by js/world/zones.js (the 'fn' there is the file name, e.g. "belfort" = landmarks/belfort.obj) -- */
__tram.__inits.push(() => {
__tram.LANDMARK={};
for(const key of __tram.modelKeys) if(key.startsWith("landmarks/")) __tram.LANDMARK[key.slice(10)]=()=>__tram.model(key);
});
