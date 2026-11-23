// serve.ts — tiny static file server for local play of Solara Bay.
// Serves the repo root (so game/ is reachable at /) on port 8080.
// Node 22, stdlib only. Run: node serve.ts, then open http://localhost:8080
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/game/index.html';
    // The game page lives at /game/index.html but its scripts are relative,
    // so when the page is served at / the browser asks for /src/... — serve
    // those from game/ as well.
    let file = normalize(join(ROOT, path));
    if ((!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) && path !== '/game/index.html') {
      const alt = normalize(join(ROOT, 'game', path));
      if (alt.startsWith(join(ROOT, 'game')) && existsSync(alt) && statSync(alt).isFile()) file = alt;
    }
    if (!file.startsWith(ROOT) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('server error');
  }
});

server.listen(PORT, () => console.log(`Solara Bay serving at http://localhost:${PORT}/`));
