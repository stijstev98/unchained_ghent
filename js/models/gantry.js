/* Gantry model. */
import { __tram, T, $ } from "../runtime.js";

__tram.makeGantry=function makeGantry(F,h){
  const g=new T.Group(), grey=__tram.plain(0x8e9399), blue=__tram.plain(0x1d4f9c);
  for(const x of [-(h+0.6),h+0.6]) __tram.M(g,__tram.cyl(0.14,0.18,6.8,10),grey,x,3.4,0);
  __tram.BX(g,grey,2*h+1.6,0.32,0.32,0,6.45,0); __tram.BX(g,grey,2*h+1.6,0.12,0.12,0,5.9,-0.25,false);
  for(const [B,x,left] of [[F.L,-h/2-0.2,true],[F.R,h/2+0.2,false]]){
    const front=__tram.lam(0xffffff,{map:__tram.dirPanelTex(B,left)});
    __tram.M(g,__tram.UNIT,[blue,blue,blue,blue,front,blue],x,5.5,0.12,Math.min(3.8,h-0.2),2.0,0.08);
  }
  return g;
}

