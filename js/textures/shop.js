/* Shopfronts and hanging blade signs. Each shop has two PNGs in assets/textures/shops:
   shopfront-<n>-<name>.png (256x128, shown on the ground floor) and blade-<n>-<name>.png (128x128, hangs from a bracket).
   <n> is the position in SHOPS below; the part after it is only a label, so renaming a shop's files is fine. */
import { __tram, T, $ } from "../runtime.js";

__tram.shopMat=function shopMat(i){
  return __tram.shopMats[i]||(__tram.shopMats[i]=__tram.lam(0xffffff,{map:__tram.fileTex(__tram.texKey("shops/shopfront-"+i+"-"),false)}));
}

__tram.bladeMat=function bladeMat(i){
  return __tram.bladeMats[i]||(__tram.bladeMats[i]=__tram.lam(0xffffff,{map:__tram.fileTex(__tram.texKey("shops/blade-"+i+"-"),false)}));
}

__tram.__inits.push(() => {
// fictional shops in a Ghent idiom: painted shopfront joinery, loose (not backlit) lettering, Flemish names
// [name, band colour, text colour, kind]. The pictures themselves are the PNGs.
__tram.SHOPS=[
  ["Frituur 't Hoekske","#1d2a33","#ffd54a","fries"],["Bakkerij De Graanzolder","#e8dcc2","#6b3e1f","bread"],["Café 't Klokske","#1f3a2e","#e6c06a","cafe"],
  ["Apotheek","#f4f2ec","#1f7a3a","pharm"],["Boekhandel De Kaft","#1f2f4a","#efe4cc","books"],["Chocolatier Verhoeven","#3a2218","#e6c06a","choc"],
  ["Bloemen Mira","#4f6a46","#ffffff","flowers"],["Fietsherstel","#1c1c1c","#f2c230","bikes"],["Kapsalon Jolien","#5a1f2a","#efe4cc","hair"],["Frietkot","#2a5aa0","#ffffff","fries"],
  ["Pita De Bosporus","#a8382c","#ffffff","fries"],["Dancing","#2a1a4a","#ff5ad0","cafe"],
  ["Slagerij Pieters","#6e1d1d","#ffffff","meat"],["Dagbladhandel","#2b2f33","#ffd200","news"],["Nachtwinkel","#16181b","#7cf05a","night"],
  ["Koffiebar Bonne","#e3dccd","#3b2a20","cafe"],["Kaashandel","#efe3b6","#5a3d1a","cheese"],["Wafelhuis","#6b3e1f","#ffe7b0","bread"],["Neuzekes","#5a2a6a","#f6d8f0","choc"]
];

__tram.NORMAL_SHOPS=[0,1,2,3,4,5,6,7,8,9,12,13,15,16,17,18,0,2,3,1];

__tram.shopMats=[];

__tram.bladeMats={};
});
