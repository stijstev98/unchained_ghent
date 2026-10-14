/* Boot. The 3D engine is loaded by index.html before this module runs. */
import { T, $ } from "./runtime.js";

if (!T) {
  $("startBtn").textContent = "Could not load the 3D engine. Reload the page.";
} else {
  await import("./run.js");
}
