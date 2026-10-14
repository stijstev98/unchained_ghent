/* Dok Noord tower materials (the towers are built in js/models/buildings.js). */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

__tram.TOWER={glass:__tram.lamTex(__tram.glassTex),resi:__tram.lamTex(__tram.resiTex),slab:__tram.lam(0xf2f0eb),dark:__tram.lam(0x2b3036),brick:__tram.lam(0x9d5a45)};

});
