/* Shared settings for the texture tools (make-ai.js, convert.js, watch.js).

   The workflow in one picture:

     textures-src/<kind>/<style>/<name>.ai      you edit these in Illustrator
         layer "reference"   the texture as it was when the .ai was made (locked, never exported)
         layer "texture"     YOUR new texture              -> assets/textures/<kind>/<style>/<name>.png
         layer "height"      greyscale bump map            -> assets/textures/<kind>/<style>/<name>-height.png
         layer "notes"       hidden text: where the texture appears in the game (never exported)
     assets/textures/...                         what the game loads (written by convert.js, do not edit by hand)

   Same folder structure in both. A texture is its key: "walls/regular/brick". */
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  ROOT,
  TEX_DIR: path.join(ROOT, "assets", "textures"),     // PNGs the game loads
  SRC_DIR: path.join(ROOT, "textures-src"),           // the .ai files
  MODELS_DIR: path.join(ROOT, "assets", "models"),
  JS_DIR: path.join(ROOT, "js"),
  MANIFEST: path.join(ROOT, "assets", "textures", "manifest.json"),
  STATE_FILE: path.join(ROOT, "textures-src", ".build-state.json"), // which .ai was last converted, and what came out

  // Layer names inside every .ai (matching is case-insensitive). Do not rename them; add sublayers inside them if you like.
  LAYERS: { reference: "reference", texture: "texture", height: "height", notes: "notes" },

  HEIGHT_SUFFIX: "-height",   // same suffix as js/render/assets.js
  FLAT_GREY: 128,             // 50% grey (#808080): what the height layer is flattened onto, so unpainted = flat
  EMPTY_ALPHA: 2,             // a layer whose strongest pixel alpha is below this counts as empty
};
