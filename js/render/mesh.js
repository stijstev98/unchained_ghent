/* Cached geometry and the box, tube and mesh helpers (used by the characters, the road and the building assembler). */
import { __tram, T, $ } from "../runtime.js";

// The building grid: walls are built from bays of 3.0 m (one window column) and floors of 3.2 m (one window row).
// Texture tiles in assets/textures/facades and the bay pieces in assets/models/buildings are made for these sizes.
__tram.BAY=3.0;
__tram.FLOOR=3.2;

__tram.M=function M(g,geo,mat,x,y,z,sx,sy,sz,cast){
  const m=new T.Mesh(geo,mat); m.position.set(x,y,z); if(sx!=null) m.scale.set(sx,sy,sz);
  m.castShadow=cast!==false; m.receiveShadow=true; g.add(m); return m;
}
__tram.tube=function tube(g,mat,a,b,t,cast){
  const A=new T.Vector3(a[0],a[1],a[2]), d=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]), len=d.length();
  const m=new T.Mesh(__tram.UNIT,mat); m.scale.set(t,len,t); m.position.copy(A).addScaledVector(d,0.5);
  m.quaternion.setFromUnitVectors(__tram.YAX,d.normalize()); m.castShadow=cast!==false; g.add(m); return m;
}

__tram.__inits.push(() => {

__tram.UNIT=new T.BoxGeometry(1,1,1);
__tram.geoCache={};
__tram.cached=(key,make)=>__tram.geoCache[key]||(__tram.geoCache[key]=make());
__tram.cyl=(rt,rb,h,seg)=>__tram.cached(`c${rt}_${rb}_${h}_${seg}`,()=>new T.CylinderGeometry(rt,rb,h,seg));
__tram.sph=(r,w,h)=>__tram.cached(`s${r}_${w}_${h}`,()=>new T.SphereGeometry(r,w||14,h||10));
__tram.hemi=r=>__tram.cached(`hm${r}`,()=>new T.SphereGeometry(r,14,7,0,Math.PI*2,0,Math.PI/2));
__tram.BX=(g,mat,w,h,d,x,y,z,cast)=>__tram.M(g,__tram.UNIT,mat,x,y,z,w,h,d,cast);
__tram.YAX=new T.Vector3(0,1,0);

});
