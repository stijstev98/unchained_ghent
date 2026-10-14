# Deploy

Public beta. The container serves the game. Caddy on the same machine does HTTPS.

Cheats (invincible, give €500) are only in `npm run dev`. `npm start` and this image do not include them.

On the server:

1. Copy `.env.example` to `.env`. `PORT` is the local port (default `8080`), bound to `127.0.0.1`.
2. `docker compose up -d --build`
3. Paste the site block from `Caddyfile.example` into the Caddyfile you already run, with your hostname and the same port, then reload Caddy.

The image is nginx with the game files only: `index.html`, `css`, `js`, and `assets`.
