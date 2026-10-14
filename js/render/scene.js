/* Renderer, lights, sky and the ground plane. */
import { __tram, T, $ } from "../runtime.js";

/* Phones and tablets get a lighter profile. Set at load time because the texture and model loaders run before startup.
   VIEW: fog, how far ahead chunks are built and the camera's far plane (metres). PIXEL: the highest and lowest pixel ratio
   the adaptive scaler may use. SHADOW: shadow map size and the half-width of the area around the rider that casts
   shadows; both shrink together so a shadow texel stays about 8 cm. */
__tram.isTouch=matchMedia("(pointer:coarse)").matches||("ontouchstart" in window)||navigator.maxTouchPoints>0;
__tram.VIEW=__tram.isTouch?{fogNear:50,fogFar:185,build:200,far:285}:{fogNear:80,fogFar:310,build:300,far:460};
__tram.PIXEL=__tram.isTouch?{max:2,min:1.25}:{max:1.75,min:0.75};
__tram.SHADOW=__tram.isTouch?{size:768,half:30}:{size:1024,half:38};
__tram.ANISO=__tram.isTouch?2:4;

__tram.paintSky=function paintSky(r){
  const g=__tram.skyCv.getContext("2d"), gr=g.createLinearGradient(0,0,0,256);
  gr.addColorStop(0,__tram.mixHex(0x5f93c9,0x5d666e,r)); gr.addColorStop(0.5,__tram.mixHex(0x9fc0db,0x7d878e,r)); gr.addColorStop(1,__tram.mixHex(0xcfdadd,0x99a1a6,r));
  g.fillStyle=gr; g.fillRect(0,0,4,256); __tram.skyTex.needsUpdate=true;
}

__tram.__inits.push(() => {

/* ================= renderer & scene ================= */
__tram.cv=$("cv"),__tram.frame=$("frame");
// MSAA costs a lot of fill rate, and on a dense screen (pixel ratio 1.5+) the pixels are small enough that it barely shows
__tram.renderer=new T.WebGLRenderer({canvas:__tram.cv,antialias:(devicePixelRatio||1)<1.5,powerPreference:"high-performance"});
// a phone screen is small and held close, so it gets a sharper cap than a monitor; render/quality.js lowers this when the frame rate suffers
__tram.renderer.setPixelRatio(Math.min(__tram.PIXEL.max,devicePixelRatio||1));
__tram.renderer.shadowMap.enabled=true; __tram.renderer.shadowMap.type=T.PCFShadowMap;
__tram.scene=new T.Scene();
__tram.scene.fog=new T.Fog(0xcfdadd,__tram.VIEW.fogNear,__tram.VIEW.fogFar);
// sky gradient, repainted as the weather changes
__tram.skyCv=document.createElement("canvas"); __tram.skyCv.width=4; __tram.skyCv.height=256;
__tram.skyTex=new T.CanvasTexture(__tram.skyCv); __tram.scene.background=__tram.skyTex;
__tram.mixHex=(a,b,t)=>{ const A=new T.Color(a),B=new T.Color(b); return "#"+A.lerp(B,t).getHexString(); };
__tram.paintSky(0);
__tram.camera=new T.PerspectiveCamera(64,1,0.1,__tram.VIEW.far);
__tram.hemiL=new T.HemisphereLight(0xe8eff5,0x7a6a58,0.62); __tram.scene.add(__tram.hemiL);
__tram.sun=new T.DirectionalLight(0xfff0d6,0.95);
__tram.sun.castShadow=true; __tram.sun.shadow.mapSize.set(__tram.SHADOW.size,__tram.SHADOW.size);
const sh=__tram.SHADOW.half; Object.assign(__tram.sun.shadow.camera,{left:-sh,right:sh,top:sh,bottom:-sh,near:1,far:140});
__tram.sun.shadow.bias=-0.0006; __tram.sun.shadow.normalBias=0.03;
__tram.scene.add(__tram.sun); __tram.scene.add(__tram.sun.target);
__tram.groundPlane=new T.Mesh(new T.PlaneGeometry(900,900),new T.MeshLambertMaterial({color:0x5d6152}));
__tram.groundPlane.rotation.x=-Math.PI/2; __tram.groundPlane.position.y=-1.2; __tram.scene.add(__tram.groundPlane);

});
