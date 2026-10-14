/* Keyboard, touch, and the frame loop. Invincible and the €500 button only exist in dev mode. */
import { __tram, T, $ } from "../runtime.js";

__tram.releaseCtl=function releaseCtl(){ for(const b of __tram.ctlBtns){ b.classList.remove("down"); const k=b.dataset.k; if(k!=="bell") __tram.keys[k]=false; } }
__tram.setGod=function setGod(v){ __tram.god=v; if(!__tram.godBtn) return; __tram.godBtn.setAttribute("aria-pressed",String(v)); __tram.godBtn.textContent="Invincible: "+(v?"on":"off"); }

__tram.resize=function resize(){
  const r=__tram.frame.getBoundingClientRect(), w=Math.max(1,r.width), h=Math.max(1,r.height);
  __tram.renderer.setSize(w,h,false); __tram.camera.aspect=w/h; __tram.baseFov=w/h<0.8?78:66; __tram.camera.fov=__tram.baseFov; __tram.camera.updateProjectionMatrix();
}
__tram.loop=function loop(now){
  const frameMs=now-__tram.last, dt=Math.min(0.033,frameMs/1000); __tram.last=now;
  if(!__tram.paused) __tram.update(dt,__tram.state==="menu");
  if(!__tram.garageEl.hidden) __tram.renderPreview(dt);
  __tram.sync(__tram.paused?0:dt);
  __tram.audioUpdate(__tram.paused?0:dt);
  __tram.renderer.render(__tram.scene,__tram.camera);
  __tram.adaptQuality(frameMs);
  if(__tram.state==="play") __tram.updateHud();
  requestAnimationFrame(__tram.loop);
}

__tram.__inits.push(() => {

// on-screen controls: shown on touch devices, every button can be held at the same time
if(__tram.isTouch) document.body.classList.add("touch");
addEventListener("touchstart",()=>document.body.classList.add("touch"),{once:true,passive:true});
__tram.ctlBtns=[...document.querySelectorAll(".cbtn")];
for(const b of __tram.ctlBtns){
  const k=b.dataset.k;
  b.addEventListener("pointerdown",e=>{ e.preventDefault(); e.stopPropagation(); b.classList.add("down"); try{b.setPointerCapture(e.pointerId)}catch(_){}
    if(k==="bell"){ if(__tram.G.V.jump) __tram.jump(); else __tram.ringBell(); } else __tram.keys[k]=true; });
  const up=()=>{ b.classList.remove("down"); if(k!=="bell") __tram.keys[k]=false; };
  b.addEventListener("pointerup",up); b.addEventListener("pointercancel",up); b.addEventListener("lostpointercapture",up);
  b.addEventListener("contextmenu",e=>e.preventDefault());
}
__tram.isL=k=>k==="ArrowLeft"||k==="a"||k==="A"||k==="q"||k==="Q", __tram.isR=k=>k==="ArrowRight"||k==="d"||k==="D";
addEventListener("keydown",e=>{
  const k=e.key;
  if(!__tram.garageEl.hidden){
    if(k==="ArrowLeft"||k==="ArrowRight"){ e.preventDefault(); __tram.garageStep(k==="ArrowLeft"?-1:1); }
    else if(k==="Escape"){ e.preventDefault(); $("gClose").click(); }
    else if(k==="Enter"&&!(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(".gpanel button"))){ e.preventDefault(); __tram.garageAction(); }
    return;
  }
  if(["ArrowLeft","ArrowRight"," ","ArrowUp","ArrowDown"].includes(k)) e.preventDefault();
  if(__tram.isL(k)) __tram.keys.l=true; if(__tram.isR(k)) __tram.keys.r=true;
  if(k==="Shift") __tram.keys.sp=true;
  if(k==="ArrowDown"||k==="s"||k==="S") __tram.keys.br=true;
  if(k==="m"||k==="M") __tram.muted=!__tram.muted;
  if((k==="p"||k==="P"||k==="Escape")&&__tram.state==="play") __tram.setPaused(!__tram.paused);
  if(k===" "||k==="Enter"){
    if(!__tram.garageEl.hidden){ /* typing in the garage does not start a ride */ }
    else if((__tram.state==="menu"&&!$("startBtn").disabled)||__tram.state==="over"){ if(!e.repeat) __tram.start(); }
    else if(__tram.paused) __tram.setPaused(false);
    else if(k===" "){ if(__tram.G.V.jump) __tram.jump(); else __tram.ringBell(); }
  }
});
__tram.godBtn=$("godBtn");
__tram.cashBtn=$("cashBtn");
if(__tram.cashBtn){
  __tram.cashBtn.addEventListener("pointerdown",e=>e.stopPropagation());
  __tram.cashBtn.addEventListener("click",e=>{ e.stopPropagation(); __tram.addWallet(500); __tram.updateGarageLabels(); if(!__tram.garageEl.hidden) __tram.renderGarage(); if(__tram.state==="play") __tram.pop("+€500 (test)","#ffd54a"); __tram.snd.ui("cash"); __tram.cashBtn.blur(); });
}
if(__tram.godBtn){
  __tram.godBtn.addEventListener("pointerdown",e=>e.stopPropagation());
  __tram.godBtn.addEventListener("click",e=>{ e.stopPropagation(); __tram.setGod(!__tram.god); __tram.godBtn.blur(); });
  addEventListener("keydown",e=>{ if((e.key==="i"||e.key==="I")&&!e.repeat) __tram.setGod(!__tram.god); });
}
addEventListener("keyup",e=>{ if(__tram.isL(e.key)) __tram.keys.l=false; if(__tram.isR(e.key)) __tram.keys.r=false; if(e.key==="Shift") __tram.keys.sp=false; if(e.key==="ArrowDown"||e.key==="s"||e.key==="S") __tram.keys.br=false; });
__tram.ptrs=new Map();
__tram.syncPtrs=()=>{ const v=[...__tram.ptrs.values()]; __tram.keys.l=v.includes("l"); __tram.keys.r=v.includes("r"); };
__tram.cv.addEventListener("pointerdown",e=>{
  if(__tram.state!=="play") return; e.preventDefault();
  if(__tram.G.V.jump&&document.body.classList.contains("touch")){ __tram.jump(); return; }
  const r=__tram.frame.getBoundingClientRect(); __tram.ptrs.set(e.pointerId,(e.clientX-r.left)<r.width/2?"l":"r"); __tram.syncPtrs();
  try{__tram.cv.setPointerCapture(e.pointerId)}catch(_){}
});
__tram.up=e=>{__tram.ptrs.delete(e.pointerId);__tram.syncPtrs()};
__tram.cv.addEventListener("pointerup",__tram.up); __tram.cv.addEventListener("pointercancel",__tram.up);
document.addEventListener("visibilitychange",()=>{ if(document.hidden) __tram.setPaused(true); });
addEventListener("blur",()=>{__tram.keys.l=__tram.keys.r=__tram.keys.sp=__tram.keys.br=false; __tram.ptrs.clear(); __tram.releaseCtl();});
new ResizeObserver(__tram.resize).observe(__tram.frame); __tram.resize();

__tram.newGame();
__tram.setVehicle(__tram.curVeh); __tram.updateGarageLabels();
$("startBtn").disabled=false; $("startBtn").textContent="Ride";

__tram.last=performance.now();
requestAnimationFrame(__tram.loop);

});
