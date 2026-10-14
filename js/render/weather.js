/* Rain streaks and the clouds that follow the rider. */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

/* -- rain: streaks in a box that travels with the camera -- */
__tram.RAIN_N=1400, __tram.rainPos=new Float32Array(__tram.RAIN_N*6);
for(let i=0;i<__tram.RAIN_N;i++){ const x=__tram.rnd(-30,30),y=__tram.rnd(0,26),z=__tram.rnd(-45,12); __tram.rainPos.set([x,y,z,x+0.05,y-0.9,z+0.12],i*6); }
__tram.rainGeo=new T.BufferGeometry(); __tram.rainGeo.setAttribute("position",new T.BufferAttribute(__tram.rainPos,3));
__tram.rainMat=new T.LineBasicMaterial({color:0xc2d0da,transparent:true,opacity:0,depthWrite:false});
__tram.rainLines=new T.LineSegments(__tram.rainGeo,__tram.rainMat); __tram.rainLines.frustumCulled=false; __tram.rainLines.visible=false; __tram.scene.add(__tram.rainLines);
/* wind wisps (sprint only, see sync.js): thin feathery streaks beside the rider, in the same road-aligned box as the rain.
   Each one is a narrow ribbon along the road with a few faint strands painted on it, blended additively, so it only
   ever lightens the picture a little. Its vertex colour is its brightness: black = not there. */
__tram.WIND_N=14;
const wCv=document.createElement("canvas"); wCv.width=256; wCv.height=32;
{ const g=wCv.getContext("2d");
  for(let s=0;s<4;s++){
    const y0=8+s*5+__tram.rnd(-1.5,1.5), amp=__tram.rnd(0.8,2.4), ph=__tram.rnd(0,6), x0=__tram.rnd(10,60), x1=__tram.rnd(170,250);
    const gr=g.createLinearGradient(x0,0,x1,0), a=s===1?0.9:__tram.rnd(0.3,0.6);
    gr.addColorStop(0,"rgba(255,255,255,0)"); gr.addColorStop(0.55,`rgba(255,255,255,${a})`); gr.addColorStop(0.85,`rgba(255,255,255,${a*0.6})`); gr.addColorStop(1,"rgba(255,255,255,0)");
    g.strokeStyle=gr; g.lineWidth=s===1?2.2:__tram.rnd(0.8,1.5); g.lineCap="round"; g.beginPath();
    for(let x=x0;x<=x1;x+=6){ const y=y0+Math.sin(x*0.035+ph)*amp; if(x===x0) g.moveTo(x,y); else g.lineTo(x,y); }
    g.stroke();
  }
}
__tram.windTex=new T.CanvasTexture(wCv);
__tram.windPos=new Float32Array(__tram.WIND_N*12); __tram.windCol=new Float32Array(__tram.WIND_N*12); __tram.windUV=new Float32Array(__tram.WIND_N*8); __tram.windIdx=new Uint16Array(__tram.WIND_N*6);
for(let i=0;i<__tram.WIND_N;i++){
  __tram.windUV.set([0,0, 0,1, 1,0, 1,1], i*8);
  __tram.windIdx.set([0,2,1, 1,2,3].map(k=>i*4+k), i*6);
}
__tram.windGeo=new T.BufferGeometry();
__tram.windGeo.setAttribute("position",new T.BufferAttribute(__tram.windPos,3));
__tram.windGeo.setAttribute("color",new T.BufferAttribute(__tram.windCol,3));
__tram.windGeo.setAttribute("uv",new T.BufferAttribute(__tram.windUV,2));
__tram.windGeo.setIndex(new T.BufferAttribute(__tram.windIdx,1));
__tram.windMat=new T.MeshBasicMaterial({map:__tram.windTex,vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,side:T.DoubleSide});
__tram.windLines=new T.Mesh(__tram.windGeo,__tram.windMat); __tram.windLines.frustumCulled=false; __tram.windLines.visible=false; __tram.scene.add(__tram.windLines);
__tram.wisps={acc:0,life:new Float32Array(__tram.WIND_N).fill(1),max:new Float32Array(__tram.WIND_N).fill(1),peak:new Float32Array(__tram.WIND_N)};
__tram.WET=[]; // road surfaces darken when wet
/* -- clouds drift with the rider, far above the rooftops -- */
__tram.clouds=[];
__tram.cloudMat=new T.SpriteMaterial({map:__tram.cloudTex,fog:false,transparent:true,depthWrite:false,opacity:0.95});   // one material for all of them: the weather tints them all alike
// a shorter far plane (mobile) pulls the clouds in and shrinks them by the same factor, so they look the same from the saddle
__tram.cloudK=__tram.VIEW.far/460;
for(let i=0;i<14;i++){
  const sp=new T.Sprite(__tram.cloudMat);
  const sc=__tram.rnd(60,130)*__tram.cloudK; sp.scale.set(sc,sc*0.5,1);
  sp.userData.off=[__tram.rnd(-320,320),__tram.rnd(70,130),__tram.rnd(-420,-150)]; __tram.scene.add(sp); __tram.clouds.push(sp);
}

});
