/* Road and water materials, and the roof/door materials the building assembler swaps into the OBJ kit.
   The image textures live in assets/textures (see js/textures/textures.js). */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

__tram.ROOF={tile:__tram.lamTex(__tram.tileTex),slate:__tram.lamTex(__tram.slateTex),
  coping:__tram.lam(0xe8e2d4),chimney:__tram.lam(0x8a4a3a),door:__tram.lam(0x3b2a20),doorG:__tram.lam(0x2f4a3a)};

// How often each roof comes up among its style's pool (default 1). Regular: 3 tile to 2 slate, as before the pools existed.
__tram.ROOF_ODDS={"roofs/regular/tile":3,"roofs/regular/slate":2};
const roofMats={};
// a roof material for a house style: a weighted pick from the style's roofs/ pool (regular roofs while the style has none)
__tram.roofMat=function roofMat(style){
  const keys=__tram.texPool("roofs",style,true).map(n=>__tram.texResolve("roofs",n,style));
  const odds=keys.map(k=>__tram.ROOF_ODDS[k]||1); let r=Math.random()*odds.reduce((a,b)=>a+b,0), i=0;
  while(i<keys.length-1&&(r-=odds[i])>=0) i++;
  return roofMats[keys[i]]||(roofMats[keys[i]]=__tram.lamTex(__tram.fileTex(keys[i])));
};

__tram.MAT={
  asph:__tram.lamTex(__tram.asphaltTex), cob:__tram.lamTex(__tram.cobbleTex), kerb:__tram.lam(0xa9a397,{side:T.DoubleSide}),
  ground:__tram.lam(0x55534b), dash:__tram.lam(0xf2ede0), bed:__tram.lam(0x96948c),
  rail:new T.MeshPhongMaterial({color:0xc7ced4,shininess:90,specular:0xffffff}), groove:__tram.lam(0x14171a), cap:__tram.lam(0xe8a33c),
  water:new T.MeshPhongMaterial({color:0xffffff,map:__tram.rippleTex,shininess:80,specular:0x9fbfc5}), stone:__tram.lam(0x9e998d,{side:T.DoubleSide}),
  wire:new T.MeshBasicMaterial({color:0x2a2d31,side:T.DoubleSide}),
};

});
