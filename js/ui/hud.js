/* Ride HUD, game-over ticket and pause. */
import { __tram, T, $ } from "../runtime.js";

__tram.updateHud=function updateHud(){
  $("hStreet").textContent=__tram.zoneIdx(__tram.G.zone).name;
  const tg=$("hType"), tagTxt=__tram.TYPES[__tram.typeAt(__tram.G.s,__tram.G.u)].tag;
  tg.hidden=!tagTxt; if(tagTxt&&tg.textContent!==tagTxt) tg.textContent=tagTxt;
  const sp=$("hSpeed"), mode=__tram.G.reason?"":(__tram.keys.br&&__tram.G.V.brakes?" · braking":"");
  sp.textContent=Math.max(0,Math.round(__tram.G.speed*3.6-20))+" km/h"+mode; sp.classList.toggle("fast",!!mode);
  $("hScore").textContent=__tram.score();
  $("hDist").textContent=__tram.metres()+" m";
  $("hCub").textContent="€ "+__tram.G.cub;
  __tram.warn.hidden=!(__tram.G.groove>0&&!__tram.G.reason);
  $("hRain").hidden=!(__tram.G.rain>0.3);
  const hm=$("hHelm");
  hm.className="helm"+(__tram.G.helmet?" on":(__tram.G.broke>0?" broke":""));
  hm.textContent=__tram.G.helmet?"Helmet · 1 hit":(__tram.G.broke>0?"Helmet broke":"No helmet");
  const eb=!__tram.G.reason&&__tram.G.objs.find(o=>(o.type==="ebike"||o.type==="bmw")&&!o.knocked&&o.s<__tram.G.s-1.2);
  __tram.ebWarn.hidden=!eb;
  if(eb){
    const txt=eb.type==="bmw"?"VROOOM!":"Ring ring!"; if(__tram.ebWarn.textContent!==txt) __tram.ebWarn.textContent=txt;
    // pin the bubble above the e-bike's line, a few metres ahead of the rider
    const [x,z]=__tram.P(eb.u,__tram.G.s-1.5); __tram.bubbleV.set(x,1.7,z).project(__tram.camera);
    __tram.ebWarn.style.left=__tram.clamp((__tram.bubbleV.x+1)/2*100,8,92)+"%";
    __tram.ebWarn.style.top=__tram.clamp((1-__tram.bubbleV.y)/2*100,25,92)+"%";
  }
}
__tram.setBestText=function setBestText(){ $("bestMenu").textContent=__tram.best?`Best: ${__tram.best}`:"Best: none yet"; }

__tram.start=function start(){
  cancelAnimationFrame(__tram.bonusRAF); __tram.snd.countStop(); __tram.audio(); __tram.newGame(); __tram.state="play"; __tram.paused=false;
  __tram.menu.hidden=true; __tram.over.hidden=true; __tram.pausedEl.hidden=true; __tram.hud.hidden=false; __tram.ctl.hidden=false;
  __tram.keys.l=__tram.keys.r=false; __tram.updateHud();
}
// coins for the distance you rode: nothing below 500 m, then €1 for every 200 m, and €2 per 200 m past 5 km
__tram.distBonus=function distBonus(d){ if(d<500) return 0; return Math.floor((Math.min(d,5000)-500)/200)+2*Math.floor(Math.max(0,d-5000)/200); }
// the bar fills up to the distance you rode; every 200 m mark it passes drops a coin on the counter
__tram.animateBonus=function animateBonus(d,total,done,onCoin){
  cancelAnimationFrame(__tram.bonusRAF); __tram.snd.countStop();
  const bar=$("oBonusBar"), val=$("oBonusV"), box=$("oBonusN"), max=d<500?500:Math.max(1000,Math.ceil(d/1000)*1000);
  const tick=(el,m)=>{ el.hidden=m>max; el.style.left=(m/max*100)+"%"; };
  tick($("oTick1"),500); tick($("oTick2"),5000);
  $("oBonusNote").textContent=d<500?`Ride ${500-d} m more next time to start earning a distance bonus`:(d>=5000?"€1 per 200 m after 500 m · €2 per 200 m past 5 km":"€1 per 200 m after 500 m · €2 per 200 m past 5 km");
  const set=(dd,c)=>{ bar.style.width=Math.min(100,dd/max*100)+"%"; bar.style.background=dd>5000?"var(--signal)":""; val.textContent="+€ "+c; };
  if(__tram.reduced||total===0&&d<500){ set(d,total); done(); return; }
  __tram.snd.countStart();
  const dur=Math.min(2800,800+total*90), t0=performance.now(); let shown=0; set(0,0);
  const step=now=>{
    const k=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-k,2), dd=d*e, c=__tram.distBonus(dd);
    set(dd,c);
    if(c>shown){ shown=c; if(onCoin) onCoin(c); box.classList.remove("bump"); void box.offsetWidth; box.classList.add("bump"); }
    if(k<1) __tram.bonusRAF=requestAnimationFrame(step); else { __tram.snd.countStop(total>0); done(); }
  };
  __tram.bonusRAF=requestAnimationFrame(step);
}
__tram.gameOver=function gameOver(){
  __tram.state="over"; __tram.ctl.hidden=true; __tram.releaseCtl(); __tram.keys.sp=false; __tram.keys.br=false; __tram.warn.hidden=true; __tram.ebWarn.hidden=true;
  const st=__tram.zoneIdx(__tram.G.zone).name, sc=__tram.score(), isBest=sc>__tram.best;
  if(isBest){ __tram.best=sc; try{localStorage.setItem("tramspoor3d-best",String(__tram.best))}catch(e){} __tram.setBestText(); }
  const TXT={
    rail:__tram.G.V.rail==="never"?`Your scooter's tiny wheel dropped straight into a tram rail on ${st}. Scooters and rails never mix.`:`Your front wheel dropped into the groove on ${st}. Cross at an angle, never along.`,
    tram:`You met a tram on ${st}. It weighs about 40 tonnes and it did not brake.`,
    car:`You rear-ended a car on ${st}. Overtake with some room.`,
    door:`Someone flung a car door open on ${st}. Keep a door's width from parked cars.`,
    tourist:`You clipped a tourist reading a map on ${st}. Ring your bell earlier.`,
    ebike:`A speed pedelec doing 45 km/h took you out on ${st}. When the warning flashes, get out of his line.`,
    cyclist:`You rode straight into another cyclist on ${st}. Overtake with room to spare.`,
    walker:`You ran into someone out for a stroll on ${st}. Ring your bell and pass wide.`,
    drunk:`A drunk student swerved straight into you on ${st}. Give him the whole street.`,
    bmw:`A big black BMW came tearing through the Miljardenkwartier and did not brake. When you hear the engine, change lanes.`,
    pothole:`Your front wheel dropped into a pothole on ${st}. The orange cone was there to warn you.`,
    roadworks:`You ended up in the roadworks on ${st}. The worker is still staring at the pit. Change lanes when you see the sign.`
  };
  $("oWhere").textContent=`${st} · ${__tram.metres()} m`;
  $("oHead").textContent=__tram.HEADS[__tram.G.reason]; $("oText").textContent=TXT[__tram.G.reason];
  $("oDist").textContent=__tram.metres()+" m"; $("oScore").textContent=sc; $("oBest").textContent=__tram.best;
  // the bonus goes into the wallet straight away; the ticket counts it up
  const d=__tram.metres(), bonus=__tram.distBonus(d), before=__tram.wallet; if(bonus) __tram.addWallet(bonus);
  const extra=t=>$("oExtra").textContent=(isBest?"New best! · ":"")+`+€${__tram.G.cub} coins · wallet €${t}`;
  const showWallet=w=>{ for(const el of document.querySelectorAll(".gw")) el.textContent="€ "+w; };
  extra(before); __tram.updateGarageLabels(); showWallet(before);
  __tram.animateBonus(d,bonus,()=>{ extra(__tram.wallet); __tram.updateGarageLabels(); },c=>{ showWallet(before+c); extra(before+c); });
  __tram.over.hidden=false; $("againBtn").focus({preventScroll:true});
}
__tram.setPaused=function setPaused(p){ if(__tram.state!=="play"||__tram.G.reason) return; __tram.paused=p; __tram.pausedEl.hidden=!p; }

__tram.__inits.push(() => {

/* ================= UI ================= */
__tram.hud=$("hud"),__tram.menu=$("menu"),__tram.over=$("over"),__tram.pausedEl=$("paused"),__tram.ctl=$("ctl"),__tram.warn=$("warn"),__tram.ebWarn=$("ebWarn");
__tram.bubbleV=new T.Vector3();
__tram.setBestText();
__tram.HEADS={rail:"Stuck in the rail",tram:"Tram 1, you 0",car:"Bumper to bumper",door:"Dooring",tourist:"Tourist down",ebike:"Overtaken the hard way",cyclist:"Fietser tegen fietser",roadworks:"Opgebroken",walker:"Wandelaar down",drunk:"Hic!",bmw:"BMW 1, bike 0",pothole:"Gat in de weg"};
__tram.bonusRAF=0;

});
