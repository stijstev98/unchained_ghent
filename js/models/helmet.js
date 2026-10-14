/* Helmet pickup and the shell the rider wears. */
import { __tram, T, $ } from "../runtime.js";

__tram.helmetShell=function helmetShell(g,y){
  const h=__tram.M(g,__tram.DOME("helm2",0.2),__tram.HELM.shell,0,y,0); h.scale.set(1,0.9,1.3);
  __tram.BX(g,__tram.HELM.stripe,0.05,0.04,0.48,0,y+0.18,0,false);
  for(const x of [-0.09,0.09]) __tram.BX(g,__tram.HELM.vent,0.04,0.03,0.2,x,y+0.165,-0.02,false);
  __tram.BX(g,__tram.HELM.shell,0.26,0.03,0.08,0,y+0.03,-0.24,false);
  return h;
}

__tram.makeHelmetPickup=function makeHelmetPickup(){
  const g=new T.Group(), inner=new T.Group(); g.add(inner);
  __tram.helmetShell(inner,0); inner.scale.setScalar(1.7);
  const ring=new T.Mesh(__tram.cached("halo",()=>new T.TorusGeometry(0.42,0.03,6,28)),__tram.HELM.halo); ring.rotation.x=Math.PI/2; g.add(ring);
  g.userData={inner,ring};
  return g;
}

