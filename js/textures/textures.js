/* The textures the game code itself asks for, in one place: which PNG in assets/textures each one comes from.
   To swap a texture, overwrite the PNG (same name). To add one, put the PNG in assets/textures, list it in
   manifest.json and give it a name here.
   Not listed here: textures that only the OBJ models use (landmarks, vehicles, signs, coins ...) are named inside
   each model's .mtl file (map_Kd), house facades (walls, windows, doors, details per style) are layered in facade.js,
   shopfronts are in shop.js, and the direction panels at forks stay painted in code (direction-sign.js) because
   their text depends on the route.
   Any texture here can get bumps: add <name>-height.png (greyscale) next to it and list it in manifest.json. */
import { __tram, T, $ } from "../runtime.js";

__tram.__inits.push(() => {
const tile = (key) => __tram.fileTex(key);          // repeats
const once = (key) => __tram.fileTex(key, false);   // decal, sign or sprite: does not repeat

// ground
__tram.asphaltTex = tile("surfaces/asphalt");
__tram.cobbleTex = tile("surfaces/cobble");
__tram.settsTex = tile("surfaces/setts");
__tram.bikeRoadTex = tile("surfaces/bike-road");
__tram.dirtTex = tile("surfaces/dirt");
__tram.grassTex = tile("surfaces/grass");
__tram.rippleTex = tile("surfaces/water");
// roofs (the building assembler puts these on the roof pieces; see roofMat in materials.js for the per-style pool)
__tram.tileTex = tile("roofs/regular/tile");
__tram.slateTex = tile("roofs/regular/slate");
// markings, pickups and effects
__tram.manholeTex = once("decals/manhole");
__tram.bikeMarkTex = once("decals/bike-mark");
__tram.beerTex = once("decals/beer");
__tram.smokeTex = once("decals/smoke");
__tram.cloudTex = once("decals/cloud");
// modern buildings and towers (one bay each, wall and windows baked in one image until they are split into walls/ and windows/)
__tram.modTexA = tile("bays/modern/a");
__tram.modTexB = tile("bays/modern/b");
__tram.modTexC = tile("bays/modern/c");
__tram.glassTex = tile("bays/modern/tower-glass");
__tram.resiTex = tile("bays/modern/tower-residential");
// tram and bus stop flags
__tram.stopTex = once("signs/tram-stop");
__tram.busStopTex = once("signs/bus-stop");

// destination displays of the tram (vehicles/tram-dest-N.png; the game picks one per tram, the tram model has a 'dest' slot)
__tram.destMats = [0, 1, 2, 3, 4, 5].map((i) => new T.MeshBasicMaterial({ map: once("vehicles/tram-dest-" + i) }));

// shop awnings, graffiti shutters and posters for the student quarter
__tram.awningMats = [0, 1, 2, 3].map((i) => __tram.lam(0xffffff, { map: tile("shops/awning-" + i) }));
__tram.SHUTTERS = [0, 1, 2].map((i) => __tram.lam(0xffffff, { map: once("student/shutters-" + i) }));
__tram.POSTERS = [0, 1, 2, 3].map((i) => __tram.lam(0xffffff, { map: once("student/poster-" + i) }));
// speech bubbles for cyclists and walkers who have nowhere to go (text is part of each PNG: yell-0 "Kan nie!" ... yell-4 "Rustig!")
__tram.YELL_MATS = [0, 1, 2, 3, 4].map((i) => new T.SpriteMaterial({ map: once("decals/yell-" + i), depthTest: false }));
});

// Belgian road-sign faces: signs/road-<kind>.png (the sign model itself is props/road-sign.obj)
__tram.roadSignMats = {};
__tram.roadSignMat = function roadSignMat(kind) {
  if (__tram.roadSignMats[kind]) return __tram.roadSignMats[kind];
  return __tram.roadSignMats[kind] = __tram.lam(0xffffff, { transparent: true, alphaTest: 0.4, map: __tram.fileTex("signs/road-" + kind, false) });
};
// street-type sign faces: signs/type-<type>.png
__tram.typeSignTex = function typeSignTex(type) { return __tram.fileTex("signs/type-" + type, false); };
