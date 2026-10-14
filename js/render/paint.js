/* Canvas helper for the few textures still drawn in code, and the toon material helpers.
   Image textures come from files: see js/render/assets.js. */
import { __tram, T, $ } from "../runtime.js";

/* ================= textures & materials ================= */
__tram.canvasTex=function canvasTex(w,h,draw,repeat){ const c=document.createElement("canvas"); c.width=w; c.height=h; draw(c.getContext("2d"),w,h); const t=new T.CanvasTexture(c); if(repeat!==false){t.wrapS=t.wrapT=T.RepeatWrapping;} t.anisotropy=__tram.ANISO; return t; }

__tram.__inits.push(() => {
__tram.rr=(g,x,y,w,h,r)=>{ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); };

// cartoon shading: four flat light bands
__tram.TOON=new T.DataTexture(new Uint8Array([105,165,218,255]),4,1,T.LuminanceFormat);
__tram.TOON.minFilter=__tram.TOON.magFilter=T.NearestFilter; __tram.TOON.generateMipmaps=false; __tram.TOON.needsUpdate=true;

__tram.lam=(c,o)=>{ const p=Object.assign({color:c,gradientMap:__tram.TOON},o||{}); delete p.flatShading; return new T.MeshToonMaterial(p); };

__tram.texMatCache={};

__tram.texMat=(tex,c)=>__tram.texMatCache[tex.uuid+c]||(__tram.texMatCache[tex.uuid+c]=__tram.lam(c,{map:tex}));

__tram.plainCache={};

__tram.plain=c=>__tram.plainCache[c]||(__tram.plainCache[c]=__tram.lam(c));

__tram.basic=c=>__tram.plainCache["b"+c]||(__tram.plainCache["b"+c]=new T.MeshBasicMaterial({color:c}));

__tram.phong=c=>__tram.plain(c);
});
