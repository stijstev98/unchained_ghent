/* House facades, built at startup from separate layers. Every part is its own PNG in assets/textures/<kind>/<style>:
     walls/<style>/<wall>.png         neutral grey, tinted with the facade colour below
     details/<style>/...              transparent overlays: spek-bands (white stone bands), shutters-*, anchors, weather (stain under
                                      every floor), grime (student quarter)
     windows/<style>/<win>.png        transparent overlay with the window
     doors/<style>/<door>.png         the leaf of the front door (the door model is in assets/models/buildings/door.obj)
     roofs/<style>/...                roof materials, see roofMat in js/render/materials.js
   Styles: regular, modern, medieval, nouveau, specialty (see js/render/assets.js). A part that a style does not have is taken
   from regular, then specialty, so a style can be built up one PNG at a time. Name a part "specialty/factory-dark" to pin its style.
   One tile = one bay: 3.0 m wide x 3.2 m tall (a window column on one floor).

   Bumps: give any of these PNGs a greyscale twin, <name>-height.png (listed in manifest.json), and the facade gets bumps.
   The wall's height map covers the whole tile; a window, shutter, anchor or band height map only counts where its colour
   PNG is painted, so those can be plain greyscale images (grey = flush with the wall, lighter = sticks out, darker = sunk in).

   To restyle a facade edit its entry in FACADES; to repaint a part edit the PNG. */
import { __tram, T, $ } from "../runtime.js";

// Runtime size of a facade tile relative to the PNG. 0.5 = half the PNG size, 1 = full size (sharper, 4x the memory).
__tram.FACADE_QUALITY = 0.5;
// The grey walls average ~90% white, so the tint is lifted a little to land on the intended colour.
__tram.WALL_TINT_GAIN = 1.12;

__tram.__inits.push(() => {
// style: texture style of the parts below (default regular)   wall: walls/<style>/<name>.png   win: windows/<style>/<name>.png
// door: a doors/<style>/<name>.png to always use (default: a random one from the style's doors, or a painted colour while there are none)
// shut: details shutters-<name>   spek: stone bands   anch: iron wall anchors
__tram.FACADES=[
  {wall:"brick",base:"#8a5240",win:"cross-white",shut:"green",anch:true},{wall:"brick",base:"#6e4334",win:"arch-brick",spek:true,anch:true},{wall:"brick",base:"#9a6a4c",win:"cross-green",spek:true,shut:"red"},
  {wall:"plaster",base:"#d9cfba",win:"sash-green"},{wall:"plaster",base:"#b98f7e",win:"sash-white"},{wall:"plaster",base:"#9aa38a",win:"sash-white"},
  {wall:"plaster",base:"#e6e1d6",win:"sash-dark"},{wall:"stone",base:"#9c968a",win:"cross-white"},{wall:"plaster",base:"#7f93a3",win:"sash-white"},
  {wall:"plaster",base:"#c7a35a",win:"sash-white"},{wall:"brick",base:"#8d4636",win:"specialty/factory-dark"},{wall:"brick",base:"#6f3d31",win:"specialty/factory-green"},
  {wall:"stone",base:"#b5ad9c",win:"arch-stone"},{wall:"brick",base:"#5e5048",win:"arch-brick",anch:true},{wall:"plaster",base:"#8f8a82",win:"sash-white"},
  {wall:"plaster",base:"#7a3b33",win:"sash-white"},{wall:"brick",base:"#7d6a5a",win:"cross-green",spek:true}
];

// mostly brick, stone and grey render; ochre, sage, blue, rose and oxblood only now and then
__tram.STYLE_FACADES={gable:[0,1,2,7,12,13,16,0,1,2,7,13,16,4,9,15],town:[3,6,14,12,7,13,16,0,2,3,14,12,5,8,4,9],industrial:[10,11]};

__tram.facadeStyle=(i)=>__tram.FACADES[i].style||"regular";

const tint=(hex)=>{ const n=parseInt(hex.slice(1),16); return `rgb(${[n>>16,(n>>8)&255,n&255].map(c=>Math.min(255,Math.round(c*__tram.WALL_TINT_GAIN)))})`; };

// the PNGs a facade is made of, bottom to top: [wall, ...overlays]. Keys are manifest keys.
const layerKeys=(f,windows,grimy)=>{
  const style=f.style||"regular", res=(kind,name)=>__tram.texResolve(kind,name,style), keys=[res("walls",f.wall)];
  if(f.spek) keys.push(res("details","spek-bands"));
  if(windows){ if(f.shut) keys.push(res("details","shutters-"+f.shut)); keys.push(res("windows",f.win)); if(f.anch) keys.push(res("details","anchors")); }
  keys.push(res("details","weather")); if(grimy) keys.push(res("details","grime"));
  return keys;
};

// facade i painted from its layers: wall, tint, stone bands, [shutters, window, anchors], weather, [grime]
// returns { map, bump } (bump = the same layers' height maps in one greyscale texture, null if none of them has one)
const compose=(i,windows,grimy)=>{
  const f=__tram.FACADES[i], keys=layerKeys(f,windows,grimy), wall=__tram.img(keys[0]), q=__tram.FACADE_QUALITY, w=Math.round(wall.width*q), h=Math.round(wall.height*q);
  const map=__tram.canvasTex(w,h,(g)=>{
    g.drawImage(wall,0,0,w,h);
    g.globalCompositeOperation="multiply"; g.fillStyle=tint(f.base); g.fillRect(0,0,w,h); g.globalCompositeOperation="source-over";
    for(const k of keys.slice(1)) g.drawImage(__tram.img(k),0,0,w,h);
  });
  const heights=keys.map(__tram.heightKey);
  if(!heights.some(Boolean)) return {map,bump:null};
  const bump=__tram.canvasTex(w,h,(g)=>{
    g.fillStyle="#808080"; g.fillRect(0,0,w,h); // flat where no layer has a height map
    heights.forEach((hk,n)=>{
      if(!hk) return;
      if(n===0){ g.drawImage(__tram.img(hk),0,0,w,h); return; }
      // an overlay's height only counts where its colour layer is painted: keep the height pixels, take the alpha from the colour PNG
      const m=document.createElement("canvas"); m.width=w; m.height=h; const mg=m.getContext("2d");
      mg.drawImage(__tram.img(keys[n]),0,0,w,h); mg.globalCompositeOperation="source-in"; mg.drawImage(__tram.img(hk),0,0,w,h);
      g.drawImage(m,0,0);
    });
  });
  return {map,bump,scale:__tram.bumpScaleFor(keys[0])};
};

const material=(col,t)=>__tram.lam(col,t.bump?{map:t.map,bumpMap:t.bump,bumpScale:t.scale}:{map:t.map});

const sets={};
// { win: wall with windows, blank: the same wall without windows } for facade i; grimy = student-quarter dirt
__tram.facadeSet=function facadeSet(i,grimy){
  const key=(grimy?"g":"n")+i;
  if(!sets[key]){ const col=grimy?0xc2b9ac:0xffffff; sets[key]={ win:material(col,compose(i,true,grimy)), blank:material(col,compose(i,false,grimy)) }; }
  return sets[key];
};
__tram.facadeMat=(i)=>__tram.facadeSet(i,false).win;
__tram.wallMat=(i)=>__tram.facadeSet(i,false).blank;

// front door leaf for facade i: its own door texture, else a random one from the style's doors/ pool, else a painted colour
const doorMats={};
__tram.doorMat=function doorMat(i){
  const f=__tram.FACADES[i], style=f.style||"regular", names=f.door?[f.door]:__tram.texPool("doors",style,true);
  if(!names.length) return __tram.pick([__tram.ROOF.door,__tram.ROOF.doorG]);
  const key=__tram.texResolve("doors",__tram.pick(names),style);
  return doorMats[key]||(doorMats[key]=__tram.lamTex(__tram.fileTex(key,false)));
};
});
