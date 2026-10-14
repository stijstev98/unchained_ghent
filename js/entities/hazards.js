/* Roadworks worker colours and the helmet pickup. (The barrier, pit, cones, signs and coins are OBJ models: js/models/props.js.) */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

/* -- roadworks worker with a shovel -- */
__tram.RW={orange:__tram.lam(0xff6a13),vest:__tram.lam(0xff7a1a),
  pants:__tram.lam(0x2b3340),hat:__tram.lam(0xf2c230),dirt:__tram.lam(0x7a5f44),hole:__tram.lam(0x17120e),wood:__tram.lam(0x9b7448),grey:__tram.lam(0x6a6e73)};

/* helmet pickup + the helmet the player wears */
__tram.HELM={shell:__tram.lam(0xf4f1ea),stripe:__tram.lam(0xd4f03a),vent:__tram.lam(0x1d2024),halo:new T.MeshBasicMaterial({color:0xd4f03a,transparent:true,opacity:0.55})};

/* player: hair by default, a helmet appears once one is picked up */
__tram.bike=null;
__tram.playerHelmet=new T.Group(); __tram.helmetShell(__tram.playerHelmet,0); __tram.playerHelmet.scale.setScalar(0.85); __tram.playerHelmet.visible=false;

});
