/* Garage catalogue, wallet and the equipped ride. */
import { __tram, T, $ } from "../runtime.js";

__tram.saveGarage=function saveGarage(){ try{ localStorage.setItem("tramspoor3d-wallet",String(__tram.wallet)); localStorage.setItem("tramspoor3d-owned",JSON.stringify(__tram.owned)); localStorage.setItem("tramspoor3d-veh",__tram.curVeh); }catch(e){} }
__tram.addWallet=function addWallet(n){ __tram.wallet+=n; __tram.saveGarage(); }
__tram.setVehicle=function setVehicle(id){
  __tram.curVeh=id;
  if(__tram.bike){ __tram.bike.userData.head.remove(__tram.playerHelmet); __tram.scene.remove(__tram.bike); }
  __tram.bike=__tram.makeCyclist(Object.assign({},__tram.VEH[id].model,__tram.PLAYER_LOOK));
  __tram.bike.userData.head.add(__tram.playerHelmet); __tram.scene.add(__tram.bike);
  const bb=document.querySelector('.cbtn[data-k="bell"]');
  if(bb){ bb.hidden=!!__tram.VEH[id].noBell&&!__tram.VEH[id].jump; bb.textContent=__tram.VEH[id].jump?"JUMP":"BELL"; bb.setAttribute("aria-label",__tram.VEH[id].jump?"Jump":"Ring bell"); }
  const sb=document.querySelector('.cbtn[data-k="sp"]'); if(sb) sb.hidden=!!__tram.VEH[id].noSprint;
  __tram.saveGarage(); __tram.updateGarageLabels();
}

__tram.__inits.push(() => {

/* ================= vehicles, wallet and garage ================= */
__tram.VEH={
  stolen:{name:"Old stolen bike",grip:1.0,price:0,desc:"Rusty, squeaky and nobody will steal it twice. Does the job.",spd:1.0,nim:1.0,brakes:true,brakeF:0.75,rail:"normal",knock:[],immune:[],signBreak:true,
    pros:["Free"],cons:["No perks","Rusty brakes"],model:{frame:0x8a4a2e,rusty:true,basket:true,kickstand:true}},
  koers:{name:"Koersfiets",grip:0.85,price:120,desc:"A Flemish racing bike. Fast and light, with proper rim brakes.",spd:1.15,nim:1.0,brakes:true,rail:"normal",knock:[],immune:[],signBreak:true,
    pros:["Faster"],cons:["No bell"],noBell:true,model:{frame:0xc8202a,tt:0.02,noGuard:true,dropBar:true,crouch:true,racing:true,deep:true,spokes:6,bottle:true,bell:false,grip:[0.2,0.9,-0.5],jacket:0x2f6aa0,stripe:0xf4f1ea,pants:0x16181b,shorts:true,socks:0xf4f1ea,cap:0x2f6aa0,shades:true}},
  scooter:{name:"Electric scooter",grip:0.55,price:180,hw:0.18,hl:0.6,desc:"Zippy and twitchy. Its tiny wheels drop into any tram rail they touch.",spd:1.3,nim:1.5,brakes:true,brakeF:0.75,rail:"never",knock:[],immune:[],signBreak:false,
    pros:["Fast","Very nimble"],cons:["Any tram rail is fatal","Can't knock over signs","Softer brakes"],model:{scooter:true,frame:0x2a2d31}},
  bakfiets:{name:"Bakfiets",grip:1.1,price:300,hw:0.36,desc:"A cargo bike with a wooden box up front. Slow, heavy and unstoppable.",spd:0.82,nim:0.95,brakes:true,rail:"normal",knock:["walker","tourist","cyclist","drunk","door"],immune:["pothole"],signBreak:true,knockHeavy:true,hl:1.25,
    pros:["Shoves pedestrians, cyclists and car doors aside","Can shove other cargo bikes","Rolls over potholes"],cons:["Clearly slower"],model:{frame:0x2f5a4a,zF:-1.55,fR:0.25,box:true,kickstand:true}},
  ebike:{name:"Electric bike",grip:1.1,price:420,desc:"Motor-assisted and a bit heavy. Pedestrians and other cyclists had better move.",spd:1.3,nim:0.8,brakes:true,rail:"normal",knock:["walker","tourist","cyclist","drunk","ebike"],immune:[],signBreak:true,
    pros:["Fast","Knocks pedestrians and other bikes aside"],cons:["Less nimble","Can't shove cargo bikes"],model:{frame:0x3a4a5a,ebike:true,rack:true,pannier:0x2f5a4a,kickstand:true}},
  pedelec:{name:"Speedpedelec",grip:1.15,price:700,desc:"45 km/h with a number plate. Couriers, pedestrians, cyclists and rails don't bother it.",spd:1.6,nim:0.7,brakes:true,rail:"immune",knock:[],immune:["ebike","walker","tourist","cyclist","drunk"],signBreak:true,
    pros:["Very fast","Immune to couriers, pedestrians, cyclists and rails"],cons:["Hard to steer","Car doors still hurt","Cargo bikes don't budge"],model:{frame:0x16181b,ebike:true,tt:0.06,crouch:true,plate:true,mirror:true,suspension:true,noGuard:false}},
  fatbike:{name:"Fatbike",grip:1.7,price:1200,hw:0.3,hl:0.95,desc:"Illegally tuned, absurdly fast and as heavy as a scooter. Only trams, roadworks and cars can stop it.",spd:1.9,nim:0.66,brakes:true,rail:"immune",knock:[],immune:["ebike","walker","tourist","cyclist","drunk","door","pothole","vomit"],signBreak:true,knockHeavy:true,
    pros:["Incredibly fast","Immune to everything except trams, roadworks and cars"],cons:["Barely steers"],model:{frame:0x22261f,ebike:true,tt:0.11,thick:1.4,bench:true,ledbar:true,suspension:true,rack:true,jacket:0x2b2f33,hood:true,pants:0x1d1f22,shades:true,seat:[0,0.86,0.2]}}
};
__tram.VEH.skate={name:"Skateboard",grip:0.45,price:80,hw:0.16,hl:0.45,jumpV:5.1,clears:["pothole","vomit","roadworks","door"],desc:"Push, roll and ollie. Jump over trouble, but a rail under your wheels means a faceplant.",spd:1.54,fixedSpd:60/3.6,nim:1.8,brakes:true,brakeF:0.35,noSprint:true,jump:true,noBell:true,rail:"never",knock:[],immune:[],signBreak:true,
  pros:["Incredibly nimble","Ollie over rails, potholes, vomit, roadworks and doors"],cons:["No sprint","Weak brakes","Rails are fatal unless you jump","No bell"],model:{skate:true,frame:0x2f6aa0,shoeW:true,cap:0xc8202a}};
__tram.VEH.bmx={name:"BMX",grip:0.8,price:220,jumpV:6.6,hl:0.7,clears:["pothole","cone","rwsign","roadworks","vomit","door","car","walker","tourist","cyclist","drunk","ebike"],desc:"Small, tough and twitchy. Bunny-hop over potholes, roadworks, tram rails, pedestrians, other cyclists and even cars.",spd:0.92,nim:1.35,brakes:true,jump:true,noBell:true,rail:"normal",knock:[],immune:[],signBreak:true,
  pros:["Very nimble","Big jumps: clears rails, roadworks, doors, people, bikes and cars"],cons:["A bit slower","No bell"],model:{frame:0xe0447a,tt:0.055,R:0.26,fR:0.26,zF:-0.5,noGuard:true,riser:true,pegs:true,bell:false,spokes:12,seat:[0,0.72,0.22],ht:[0,0.86,-0.4],standBase:0.6,grip:[0.3,1.14,-0.36],cap:0x16181b}};
__tram.VEH_ORDER=["stolen","skate","koers","scooter","bmx","bakfiets","ebike","pedelec","fatbike"];
// the same rider on every ride: orange jacket, dark jeans, white sneakers, brown hair and a backpack
__tram.PLAYER_LOOK={jacket:0xe8a33c,pants:0x34465e,helmet:null,bag:0x2b2f33,skin:0xf0c8a0,shoeW:true,hair:0x6b4a2b,hairStyle:"short",cap:null,shades:false,hood:false,stripe:null,shorts:false,socks:null,gloves:null};
__tram.ABILITY={
  stolen:["Ordinary bike"],skate:["Jumps","No sprint","Weak brakes","No bell"],koers:["Fast","No bell"],scooter:["Rails are fatal"],
  bmx:["Big jumps","No bell"],bakfiets:["Shoves people","Pothole-proof"],ebike:["Knocks pedestrians and bikes aside"],
  pedelec:["Rail-proof","People-proof"],fatbike:["Almost unstoppable"]};
__tram.wallet=0, __tram.owned=["stolen"], __tram.curVeh="stolen";
try{ __tram.wallet=+localStorage.getItem("tramspoor3d-wallet")||0; const ow=JSON.parse(localStorage.getItem("tramspoor3d-owned")||"null"); if(Array.isArray(ow)) __tram.owned=ow.filter(v=>__tram.VEH[v]); if(!__tram.owned.includes("stolen")) __tram.owned.unshift("stolen"); const cv=localStorage.getItem("tramspoor3d-veh"); if(cv&&__tram.owned.includes(cv)) __tram.curVeh=cv; }catch(e){}

});
