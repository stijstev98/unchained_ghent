/* Ghent neighbourhoods and which one you are riding through. */
import { __tram, T, $ } from "../runtime.js";

// every ride strings the neighbourhoods together in a fresh random order, never repeating the last two.
// Each one runs ZL metres, unless a junction cuts it short and sends you into the one you picked.
__tram.zoneList=function zoneList(s){
  const L=__tram.G.zl;
  while(L[L.length-1].s0+(L[L.length-1].len||__tram.ZL)<=s){ const last=L[L.length-1], recent=L.slice(-2).map(e=>e.z); let z; do{ z=__tram.ri(0,__tram.ZONES.length-1); }while(recent.includes(z)); L.push({s0:last.s0+(last.len||__tram.ZL),z}); }
  return L;
}
__tram.zoneIdx=function zoneIdx(i){ __tram.zoneList(0); return __tram.ZONES[__tram.G.zl[Math.min(i,__tram.G.zl.length-1)].z]; }
__tram.sideType=function sideType(side,s){
  if(s<0) return "houses";
  const {z,local,len}=__tram.zoneAt(s), t=side<0?z.L:z.R;
  let r=t;
  if(t==="bridge") r=(local>70&&local<len-70)?"bridge":"houses";
  else if(t==="water"||t==="open") r=(local>20&&local<len-20)?t:"houses";
  const c=__tram.G&&__tram.chunkAt(s);
  if(c&&c.canal!=null&&Math.abs(s-c.canal)<9) return "canal";
  const ty=c&&(c.fork?(side<0?c.fork.L.type:c.fork.R.type):c.type);
  if(ty==="park") return "park";
  if(ty==="rich") return "villa";
  return r;
}

__tram.__inits.push(() => {

__tram.ZONES=[
  {name:"Nokermarkt",types:["normal","cobble"],L:"houses",R:"houses",style:"gable",marks:[{fn:"niklaas",side:-1,at:210,half:28,off:14},{fn:"oudepost",side:1,at:95,half:17,off:8}]},
  {name:"Graslui",types:["cobble","bike"],L:"houses",R:"water",style:"gable",marks:[{fn:"graslei",side:-1,at:200,half:24,off:6}]},
  {name:"Sint-Miezelbrug",types:["normal","bike"],L:"bridge",R:"bridge",style:"gable",marks:[{fn:"michiels",side:-1,at:200,half:26,off:27}]},
  {name:"Emile Bruinplein",types:["cobble","normal"],L:"houses",R:"houses",style:"gable",marks:[{fn:"stadshal",side:1,at:130,half:24,off:12},{fn:"belfort",side:-1,at:250,half:12,off:7}]},
  {name:"Sint-Blaafsplein",types:["cobble","normal"],L:"houses",R:"houses",style:"town",marks:[{fn:"baafs",side:1,at:200,half:28,off:7},{fn:"ntgent",side:-1,at:200,half:16,off:9}]},
  {name:"Kouwter",types:["normal","bike"],L:"open",R:"open",style:"town",marks:[{fn:"kiosk",side:1,at:200,half:0,off:9},{fn:"opera",side:-1,at:200,half:22,off:9}]},
  {name:"Sint-Pietersnieuwsgierigstraat",types:["normal","bike"],L:"houses",R:"houses",style:"town",marks:[{fn:"boekentoren",side:-1,at:220,half:14,off:12},{fn:"vooruit",side:1,at:110,half:14,off:7}]},
  {name:"Gent-Sint-Wachters",types:["normal","bike"],L:"houses",R:"houses",style:"town",marks:[{fn:"station",side:1,at:200,half:34,off:7}]},
  {name:"Grauwsteen",types:["cobble","normal"],L:"water",R:"houses",style:"gable",marks:[{fn:"gravensteen",side:1,at:200,half:24,off:20},{fn:"vleeshuis",side:1,at:300,half:23,off:7}]},
  {name:"Dok-Doorn",types:["normal","bike"],L:"water",R:"houses",style:"industrial",marks:[{fn:"crane",side:-1,at:160,half:0,off:__tram.BANK-__tram.WALK+4},{fn:"dokcrane",side:-1,at:300,half:0,off:__tram.BANK-__tram.WALK+1},{fn:"fabriek",side:1,at:230,half:20,off:10}]},
  // whole neighbourhoods of one street type: park paths, the student strip, the villa quarter
  {name:"Cicadepark",types:["park"],L:"houses",R:"houses",style:"town",marks:[{fn:"msk",side:1,at:200,half:28,off:22}]},
  {name:"Toverpoort",types:["student"],L:"houses",R:"houses",style:"town",marks:[{fn:"boekentoren",side:-1,at:330,half:10,off:46}]},
  {name:"Miljardenkwartier",types:["rich"],L:"houses",R:"houses",style:"town",marks:[]}
];
__tram.zoneAt=s=>{ s=Math.max(0,s); const L=__tram.zoneList(s); let i=L.length-1; while(i>0&&L[i].s0>s) i--; const e=L[i], end=i+1<L.length?L[i+1].s0:e.s0+(e.len||__tram.ZL);
  return {z:__tram.ZONES[e.z],i,local:s-e.s0,s0:e.s0,len:end-e.s0}; };

});
