/* Materials for the modern blocks (the buildings are assembled in js/models/buildings.js). */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

// one bay of facade for each modern block style (textures/bays/modern/a|b|c.png, bumps from a-height.png etc.)
__tram.MODERN=[__tram.lamTex(__tram.modTexA),__tram.lamTex(__tram.modTexB),__tram.lamTex(__tram.modTexC)];
__tram.glassRail=new T.MeshLambertMaterial({color:0x9fc0d0,transparent:true,opacity:0.45});

});
