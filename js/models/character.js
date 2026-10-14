/* Shared low-poly head and body. */
import { __tram, T, $ } from "../runtime.js";

// cartoon face: two dot eyes and a little nose, on a head facing -z
__tram.addFace=function addFace(g,skin,x,y,z,r){
  for(const s of [-1,1]) __tram.M(g,__tram.sph(0.022,8,6),__tram.AM.eye,x+s*r*0.36,y+r*0.12,z-r*0.88,null,null,null,false);
  __tram.M(g,__tram.sph(0.028,8,6),skin,x,y-r*0.12,z-r*1.0,null,null,null,false);
}

__tram.limbGeo=function limbGeo(which,len,mode){
  return __tram.cached("lg"+which+"_"+len+"_"+mode,()=>{
    const arr=__tram.PROF[which].map(([f,r])=>[r,mode==="tube"?(-0.5+f):(-f*len)]).sort((a,b)=>a[1]-b[1]);
    const P=[[0,arr[0][1]],...arr,[0,arr[arr.length-1][1]]].map(q=>new T.Vector2(q[0],q[1]));
    const g=new T.LatheGeometry(P,6); g.scale(1,1,0.9); return __tram.facet(g);
  });
}

__tram.limbT=function limbT(g,mat,which){ const m=new T.Mesh(__tram.limbGeo(which,1,"tube"),mat); m.castShadow=true; m.receiveShadow=true; g.add(m); return m; }

__tram.addShoe=function addShoe(g,mat,y){ __tram.M(g,__tram.SHOE_G,mat,0,y,-0.05); __tram.BX(g,__tram.SOLE,0.112,0.022,0.3,0,y+0.008,-0.07,false); }

__tram.addHair=function addHair(h,mat,style){
  __tram.M(h,__tram.HAIRCAP,mat,0,0,0.005);
  const fr=__tram.BX(h,mat,0.21,0.05,0.03,0,0.088,-0.128,false); fr.rotation.x=0.12;
  const nm=__tram.M(h,style==="long"?__tram.NAPE_LONG:__tram.NAPE_SHORT,mat,0,0,0.005); nm.material.side=T.DoubleSide;
  if(style==="bun") __tram.M(h,__tram.fsph(0.055),mat,0,0.15,0.1);
  else if(style==="pony"){ const pt=__tram.BX(h,mat,0.06,0.2,0.06,0,-0.08,0.2); pt.rotation.x=0.3; __tram.M(h,__tram.fsph(0.04),mat,0,0.03,0.165); }
}

__tram.makeHead=function makeHead(skin,hairHex,style){
  const h=new T.Group();
  __tram.M(h,__tram.HEAD_G,skin,0,0,0);
  const browMat=__tram.plain(hairHex!=null?hairHex:0x3a2a20);
  for(const s of [-1,1]){
    __tram.BX(h,skin,0.02,0.046,0.03,s*0.134,0.0,0.012,false);
    __tram.BX(h,__tram.EYEW,0.046,0.034,0.012,s*0.046,0.03,-0.124,false);
    __tram.BX(h,__tram.AM.eye,0.02,0.022,0.008,s*0.044,0.028,-0.131,false);
    const br=__tram.BX(h,browMat,0.05,0.011,0.012,s*0.047,0.064,-0.126,false); br.rotation.z=-s*0.12;
  }
  __tram.M(h,__tram.NOSE_G,skin,0,-0.012,-0.14,null,null,null,false);
  __tram.BX(h,__tram.LIPS,0.05,0.009,0.01,0,-0.072,-0.12,false);
  if(hairHex!=null) __tram.addHair(h,__tram.plain(hairHex),style||"short");
  return h;
}

// cartoon face for the small ones: two dot eyes and a nose
__tram.addFace=function addFace(g,skin,x,y,z,r){
  for(const s of [-1,1]) __tram.BX(g,__tram.AM.eye,0.028,0.028,0.012,x+s*r*0.36,y+r*0.12,z-r*0.9,false);
  __tram.BX(g,skin,0.03,0.03,0.03,x,y-r*0.12,z-r*0.98,false);
}

__tram.limb=function limb(g,mat,r1,r2){ const m=new T.Mesh(__tram.fcyl(r1,r2,1,6),mat); m.castShadow=true; m.receiveShadow=true; g.add(m); return m; }

__tram.band=function band(g,mat,y,sc){ const m=__tram.M(g,__tram.BAND,mat,0,y,0,null,null,null,false); m.material.side=T.DoubleSide; m.scale.set(sc,1,sc); return m; }

