/* Dev mode only: tools/dev-server.js --dev adds this script to the game page.
   It listens to the dev server and reloads the page when a texture was converted from its .ai file, so you see
   your Illustrator changes a second or two after saving. Conversion problems (a missing layer, a file saved without
   PDF compatibility ...) are shown in the corner instead of failing silently. */
(function () {
  const badge = document.createElement("div");
  badge.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:99999;max-width:min(520px,80vw);padding:6px 10px;border-radius:6px;" +
    "font:12px/1.4 ui-monospace,Menlo,monospace;color:#fff;background:rgba(20,24,28,.82);pointer-events:none;transition:opacity .3s,background .3s";
  document.body.appendChild(badge);

  let fade = null;
  const show = (text, colour, ms) => {
    badge.textContent = text;
    badge.style.background = colour || "rgba(20,24,28,.82)";
    badge.style.opacity = "1";
    clearTimeout(fade);
    if (ms) fade = setTimeout(() => { badge.style.opacity = "0"; }, ms);
  };
  show("DEV · textures live", null, 3000);

  const es = new EventSource("/__dev/events");
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "status") show("DEV · " + m.message, null, 4000);
    else if (m.type === "error") show("DEV · texture problem" + (m.key ? " (" + m.key + ")" : "") + ": " + m.message, "rgba(150,30,30,.92)", 15000);
    else if (m.type === "converted") {
      show("DEV · updated " + (m.keys.length === 1 ? m.keys[0] : m.keys.length + " textures") + ", reloading ...", "rgba(30,110,60,.92)");
      setTimeout(() => location.reload(), 200);
    }
  };
  es.onerror = () => show("DEV · lost the dev server, retrying ...", "rgba(150,90,20,.92)");
})();
