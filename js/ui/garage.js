/* Garage preview, buying and equipping a ride. */
import { __tram, T, $ } from "../runtime.js";

__tram.updateGarageLabels=function updateGarageLabels(){ for(const el of document.querySelectorAll(".gw")) el.textContent="€ "+__tram.wallet; $("gWallet").textContent="€ "+__tram.wallet; $("vehMenu").textContent="Riding: "+__tram.VEH[__tram.curVeh].name; }
__tram.statRow=function statRow(label,val,base){
  const r=document.createElement("div"); r.className="gstat";
  const l=document.createElement("span"); l.textContent=label;
  const seg=document.createElement("div"); seg.className="seg";
  const n=Math.round(__tram.clamp(val,0,1)*10), b=Math.round(__tram.clamp(base,0,1)*10);
  for(let i=0;i<10;i++){ const c=document.createElement("i"); if(i<n) c.className=(i>=b?"on up":"on"); else if(i<b) c.className="dn"; seg.append(c); }
  r.append(l,seg); return r;
}
__tram.initPreview=function initPreview(){
  if(__tram.gR) return;
  try{ __tram.gR=new T.WebGLRenderer({canvas:$("gCanvas"),antialias:true,alpha:true}); }catch(e){ __tram.gR=null; return; }
  __tram.gR.setPixelRatio(Math.min(2,devicePixelRatio||1));
  __tram.gScene=new T.Scene();
  __tram.gScene.add(new T.HemisphereLight(0xfffaf0,0x9a8a70,0.85));
  const d=new T.DirectionalLight(0xfff2dc,0.75); d.position.set(3,6,4); __tram.gScene.add(d);
  __tram.gCam=new T.PerspectiveCamera(30,4/3,0.1,60);
  const disc=new T.Mesh(__tram.cyl(1.45,1.5,0.08,48),__tram.plain(0x9c8a66)); disc.position.y=-0.04; __tram.gScene.add(disc);
  const ring=new T.Mesh(__tram.cached("gring",()=>new T.TorusGeometry(1.47,0.025,6,64)),__tram.plain(0x1f1c18)); ring.rotation.x=Math.PI/2; __tram.gScene.add(ring);
}
__tram.showPreview=function showPreview(id){
  if(!__tram.gR||__tram.gModelId===id) return;
  if(__tram.gModel){ __tram.gScene.remove(__tram.gModel); __tram.disposeOwn(__tram.gModel); }
  __tram.gModel=__tram.makeCyclist(Object.assign({},__tram.VEH[id].model,__tram.PLAYER_LOOK));
  const pivot=new T.Group(); pivot.add(__tram.gModel); __tram.gModel.position.z=__tram.VEH[id].model.box?0.5:0; __tram.gModel=pivot;
  __tram.gModel.rotation.y=-1.15; __tram.gScene.add(__tram.gModel); __tram.gModelId=id;
}
__tram.renderPreview=function renderPreview(dt){
  if(!__tram.gR||!__tram.gModel) return;
  const c=__tram.gR.domElement, w=c.clientWidth, h=c.clientHeight; if(!w||!h) return;
  if(c.width!==Math.round(w*__tram.gR.getPixelRatio())) __tram.gR.setSize(w,h,false);
  __tram.gCam.aspect=w/h; const fit=__tram.gCam.aspect<1.2?1.25:1; __tram.gCam.position.set(0,1.9*fit,5.8*fit); __tram.gCam.lookAt(0,0.68,0); __tram.gCam.updateProjectionMatrix();
  __tram.gModel.rotation.y+=dt*(__tram.reduced?0:0.55);
  const inner=__tram.gModel.children[0]; __tram.gPhase+=dt*4.5; __tram.animCyclist(inner,-__tram.gPhase,dt*2.2);
  __tram.gR.render(__tram.gScene,__tram.gCam);
}
__tram.renderGarage=function renderGarage(){
  __tram.updateGarageLabels();
  const v=__tram.VEH[__tram.gSel], has=__tram.owned.includes(__tram.gSel), riding=__tram.curVeh===__tram.gSel, idx=__tram.VEH_ORDER.indexOf(__tram.gSel);
  $("gName").textContent=v.name;
  const pr=$("gPrice"); pr.textContent=has?"Owned":(v.price?"€ "+v.price:"Free"); pr.className="gprice"+(has?" own":"");
  $("gDesc").textContent=v.desc;
  $("gCount").textContent=(idx+1)+" / "+__tram.VEH_ORDER.length;
  const st=$("gStats"); st.textContent="";
  const base=__tram.statVals(__tram.STAT_BASE);
  __tram.statVals(v).forEach(([lab,val],i)=>st.append(__tram.statRow(lab,val,base[i][1])));
  const ch=$("gChips"); ch.textContent="";
  for(const t of v.pros){ const c=document.createElement("span"); c.className="chip pro"; c.textContent=t; ch.append(c); }
  for(const t of v.cons){ const c=document.createElement("span"); c.className="chip con"; c.textContent=t; ch.append(c); }
  const bd=$("gBadge"); bd.className="gbadge"+(riding?"":has?"":(__tram.wallet>=v.price?" buy":" lock"));
  bd.textContent=riding?"Riding now":has?"In your garage":(__tram.wallet>=v.price?"Can afford":"Locked");
  const act=$("gAction"), need=$("gNeed");
  act.className="btn"; act.disabled=false; need.hidden=true;
  if(riding){ act.textContent="Riding this one"; act.disabled=true; }
  else if(has){ act.textContent="Ride the "+v.name; }
  else if(__tram.wallet>=v.price){ act.className="btn buy"; act.textContent="Buy for € "+v.price; }
  else { act.textContent="Need € "+(v.price-__tram.wallet)+" more"; act.disabled=true; need.hidden=false; $("gNeedBar").style.width=Math.round(__tram.wallet/v.price*100)+"%"; $("gNeedTxt").textContent="€ "+__tram.wallet+" / € "+v.price; }
  const strip=$("gStrip");
  if(strip.children.length!==__tram.VEH_ORDER.length){
    strip.textContent="";
    for(const id of __tram.VEH_ORDER){
      const b=document.createElement("button"); b.type="button"; b.className="gtile"; b.setAttribute("role","option"); b.dataset.id=id;
      const n=document.createElement("span"); n.className="tn"; const p=document.createElement("span"); p.className="tp";
      b.append(n,p); b.onclick=()=>{ __tram.gSel=id; __tram.renderGarage(); }; strip.append(b);
    }
  }
  for(const b of strip.children){
    const id=b.dataset.id, vv=__tram.VEH[id], own=__tram.owned.includes(id);
    b.querySelector(".tn").textContent=vv.name;
    b.querySelector(".tp").textContent=__tram.curVeh===id?"Riding":own?"Owned":"€ "+vv.price;
    b.classList.toggle("own",own); b.classList.toggle("cur",__tram.curVeh===id); b.classList.toggle("locked",!own&&__tram.wallet<vv.price);
    b.setAttribute("aria-selected",String(id===__tram.gSel));
  }
  const selT=strip.querySelector('[aria-selected="true"]'); if(selT) selT.scrollIntoView({block:"nearest",inline:"nearest"});
  __tram.showPreview(__tram.gSel);
}
__tram.garageStep=function garageStep(d){ const i=__tram.VEH_ORDER.indexOf(__tram.gSel); __tram.gSel=__tram.VEH_ORDER[(i+d+__tram.VEH_ORDER.length)%__tram.VEH_ORDER.length]; __tram.renderGarage(); }
__tram.garageAction=function garageAction(){
  const v=__tram.VEH[__tram.gSel], has=__tram.owned.includes(__tram.gSel);
  if(__tram.curVeh===__tram.gSel) return;
  if(has){ __tram.setVehicle(__tram.gSel); __tram.renderGarage(); __tram.snd.ui("equip"); return; }
  if(__tram.wallet>=v.price){ __tram.wallet-=v.price; __tram.owned.push(__tram.gSel); __tram.setVehicle(__tram.gSel); __tram.renderGarage(); __tram.snd.ui("buy"); const a=$("gAction"); a.classList.remove("flash"); void a.offsetWidth; a.classList.add("flash"); }
}
__tram.openGarage=function openGarage(from){ __tram.garageFrom=from; from.hidden=true; __tram.gSel=__tram.curVeh; __tram.garageEl.hidden=false; __tram.initPreview(); __tram.gModelId=null; __tram.renderGarage(); $("gAction").disabled?$("gNext").focus({preventScroll:true}):$("gAction").focus({preventScroll:true}); }

__tram.__inits.push(() => {

__tram.garageEl=$("garage"); __tram.garageFrom=null;
__tram.gSel=__tram.curVeh, __tram.gR=null, __tram.gScene=null, __tram.gCam=null, __tram.gModel=null, __tram.gModelId=null, __tram.gPhase=0;
__tram.STAT_BASE=__tram.VEH.stolen;
__tram.statVals=v=>[["Speed",(v.spd-0.6)/1.4],["Handling",(v.nim-0.4)/1.1],["Brakes",v.brakes?(v.brakeF||1)*0.8:0]];
$("gPrev").onclick=()=>__tram.garageStep(-1); $("gNext").onclick=()=>__tram.garageStep(1); $("gAction").onclick=__tram.garageAction;
$("garageBtn").onclick=()=>__tram.openGarage(__tram.menu); $("garageBtn2").onclick=()=>__tram.openGarage(__tram.over);
$("gClose").onclick=()=>{ __tram.garageEl.hidden=true; if(__tram.garageFrom) __tram.garageFrom.hidden=false; __tram.updateGarageLabels(); };
$("startBtn").onclick=__tram.start; $("againBtn").onclick=__tram.start; $("resumeBtn").onclick=()=>__tram.setPaused(false);

});
