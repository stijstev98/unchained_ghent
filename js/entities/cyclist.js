/* Bikes and the rider animation. */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

/* -- cyclists (player, NPCs and the speed pedelec) -- */
__tram.L1=0.47,__tram.L2=0.5, __tram.HIP_Y=1.1, __tram.HIP_Z=0.2, __tram.BB_Y=0.32, __tram.BB_Z=0.02, __tram.CRANK=0.17;
__tram._tA=new T.Vector3(),__tram._tD=new T.Vector3();
__tram.smoke=[]; __tram.smokeIdx=0, __tram.smokeAcc=0;
for(let i=0;i<60;i++){ const sp=new T.Sprite(new T.SpriteMaterial({map:__tram.smokeTex,color:0xe2ded6,transparent:true,depthWrite:false,opacity:0})); sp.visible=false; __tram.scene.add(sp); __tram.smoke.push({sp,life:0,max:1,s0:0.2,v:new T.Vector3()}); }

});
