/* Car sizes. The bodies themselves are OBJ files: assets/models/vehicles/car-<kind>.obj (see js/models/vehicles.js). */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {

__tram.CAR_KINDS={
  // len: half length in metres (front at -Z), W: width, doors: z of the door seams from the front, used for the swinging door
  hatch:{len:2.15,W:1.78,doors:[0.75,-0.45]},
  sedan:{len:2.35,W:1.78,doors:[0.85,-0.2,-1.2]},
  estate:{len:2.35,W:1.78,doors:[0.85,-0.2,-1.2]},
  suv:{len:2.3,W:1.88,doors:[0.9,-0.2,-1.2]},
  mini:{len:1.85,W:1.66,doors:[0.62,-0.42]},
  van:{len:2.4,W:1.82,doors:[1.0,-0.4]}
};
// the soft shadow under every car and tram (the 'shadowpad' piece in their OBJ files)
__tram.SHADOW_PAD=new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.28,depthWrite:false});

});
