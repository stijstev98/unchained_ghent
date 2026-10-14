/* Contact sheet of models, each seen from several sides (front, back, low, from above), to spot missing faces,
   flipped normals or transparent planes. Run in the game page's console:
     const v = await import("/tools/model-sheet.js");
     v.show(["vehicles/tram", "buildings/roof-pitch-6"]);              // raw OBJ files
     v.show([{ name: "house", make: () => __tram.makeHouse("gable", 6, 9, 10, 1, true, "normal") }]); // anything that returns an Object3D
   The sheet is drawn on top of the page; call v.hide() to remove it. Do not replace Math.random while building
   things for the sheet: three.js makes material ids from it and equal ids merge materials. */
import { __tram, T } from "../js/runtime.js";

export const VIEWS = [[1, 0.5, 0.8], [-1, 0.5, -0.8], [0.25, 0.12, 1], [0.1, 1, 0.2]];

export function show(items, opts) {
  opts = opts || {};
  const views = opts.views || VIEWS, S = opts.size || 200, cols = opts.cols || views.length, R = __tram.renderer, el = R.domElement;
  items = items.map((it) => typeof it === "string" ? { name: it.split("/").pop(), make: () => __tram.model(it, opts.model) } : it);
  const old = R.getSize(new T.Vector2()), oldRatio = R.getPixelRatio();
  const cam = new T.PerspectiveCamera(35, 1, 0.1, 1000), rows = Math.ceil(items.length * views.length / cols);
  const cv = document.createElement("canvas"); cv.width = cols * S; cv.height = rows * (S + 14);
  const g = cv.getContext("2d"); g.fillStyle = "#223"; g.fillRect(0, 0, cv.width, cv.height);
  const root = new T.Group(); root.position.set(3000, 0, 0); __tram.scene.add(root);
  try {
    R.setPixelRatio(1); R.setSize(S, S, false);
    let n = 0;
    for (const it of items) {
      const o = it.make(); root.add(o); root.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(o), c = b.getCenter(new T.Vector3()), dist = b.getSize(new T.Vector3()).length() / 2 / Math.sin(17.5 * Math.PI / 180) * 0.95;
      for (const v of views) {
        cam.position.copy(c).addScaledVector(new T.Vector3(...v).normalize(), dist); cam.lookAt(c); R.render(__tram.scene, cam);
        const x = (n % cols) * S, y = Math.floor(n / cols) * (S + 14); g.drawImage(el, x, y + 14, S, S);
        g.fillStyle = "#fff"; g.font = "11px monospace"; g.fillText(it.name + "  " + v.join(","), x + 2, y + 11); n++;
      }
      root.remove(o);
    }
  } finally { __tram.scene.remove(root); R.setPixelRatio(oldRatio); R.setSize(old.x, old.y, false); }
  hide();
  const im = new Image(); im.className = "__sheet"; im.src = cv.toDataURL("image/png");
  im.style.cssText = "position:fixed;left:0;top:0;width:" + Math.min(816, cv.width) + "px;z-index:99999;border:2px solid #fff;background:#223";
  document.body.appendChild(im);
  return [cv.width, cv.height];
}
export function hide() { document.querySelectorAll(".__sheet").forEach((e) => e.remove()); }
