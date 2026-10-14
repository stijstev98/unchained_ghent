#!/usr/bin/env node
/* Tiny static server for the game: `node tools/dev-server.js [port]`  (default http://127.0.0.1:8765/).
   The game loads ES modules and image files, so it has to be served over http, not opened from disk.
   Files are sent with no-cache headers, so a normal reload picks up edited textures and models.

   Dev mode: `node tools/dev-server.js --dev [port]`  (or `npm run dev`)
   Everything above, plus the test cheats (invincible, give €500) and live textures: it watches textures-src/*.ai
   (the Illustrator files), converts them to the PNGs the game loads (tools/textures/convert.js) and reloads the
   game page when one changed. Needs `npm install` once (the converter uses pdfjs-dist and @napi-rs/canvas).
   A normal start (`npm start`) does not include the cheats. That is what a public build should serve.

   LAN mode: add `--lan` (or `npm run dev:lan`) to listen on all network interfaces, so you can open the game on a phone
   on the same wifi. It prints the address to type in. Without it the server only listens on this computer (127.0.0.1). */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.argv.find((a) => /^\d+$/.test(a))) || 8765;
const DEV = process.argv.includes("--dev");
const LAN = process.argv.includes("--lan");
const HOST = LAN ? "0.0.0.0" : "127.0.0.1";
const lanAddresses = () => Object.values(require("os").networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".obj": "text/plain; charset=utf-8", ".mtl": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wav": "audio/wav",
};

/* ---------- dev mode: live updates to the open game pages ---------- */
const clients = new Set();
const broadcast = (msg) => { for (const res of clients) res.write("data: " + JSON.stringify(msg) + "\n\n"); };
const CLIENT_TAG = '<script src="/tools/dev-client.js"></script>';
const CHEAT_BUTTONS = '<button class="god" id="godBtn" type="button" aria-pressed="false" title="Invincible (I)">Invincible: off</button><button class="god cash" id="cashBtn" type="button">Give € 500</button>';

function sendEvents(req, res) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
  res.write("retry: 1500\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
}

http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (DEV && rel === "/__dev/events") return sendEvents(req, res);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.resolve(ROOT, "." + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    if (DEV && file === path.join(ROOT, "index.html")) {
      data = Buffer.from(data.toString()
        .replace('<div class="pops" id="pops"></div>', '<div class="pops" id="pops"></div>' + CHEAT_BUTTONS)
        .replace("</body>", CLIENT_TAG + "</body>"));
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}).on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`Port ${PORT} is already in use: a server is probably running already. Stop it first, or pass another port (node tools/dev-server.js --dev 8766).`);
  else console.error(e.message);
  process.exit(1);
}).listen(PORT, HOST, () => {
  console.log(`Tramspoor 3D on http://127.0.0.1:${PORT}/${DEV ? "  (dev mode)" : ""}`);
  if (LAN) for (const ip of lanAddresses()) console.log(`  on your network (phone, same wifi): http://${ip}:${PORT}/`);
  if (!DEV) return;
  try {
    require("@napi-rs/canvas");
    if (!fs.existsSync(path.join(ROOT, "node_modules", "pdfjs-dist"))) throw new Error("pdfjs-dist missing");
  } catch (e) {
    console.error("Dev mode needs the texture converter's packages. Run `npm install` in " + ROOT + " and start again.");
    process.exit(1);
  }
  const { startTextureWatcher } = require("./textures/watch");
  startTextureWatcher((msg) => {
    if (msg.type === "error") console.error("[textures] problem" + (msg.key ? " (" + msg.key + ")" : "") + ": " + msg.message);
    broadcast(msg);
  });
});
