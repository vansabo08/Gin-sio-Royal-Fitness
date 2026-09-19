// Servidor local só para ver o site no browser: node servidor-local.mjs
// Serve esta pasta em http://localhost:8750 (não faz falta para publicar).
// Responde a pedidos Range, que o Chrome usa para o vídeo do hero dar a volta sem saltos.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8750);

const COMPRIMIR = /\.(html|css|js|json|svg|webmanifest)$/i;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json"
};

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  let file = path.resolve(ROOT, "." + pathname);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }

  const size = fs.statSync(file).size;
  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");

  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      res.writeHead(416, { "content-range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, {
      "content-type": type,
      "content-length": end - start + 1,
      "content-range": `bytes ${start}-${end}/${size}`,
      "accept-ranges": "bytes",
      "cache-control": "no-cache"
    });
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  if (COMPRIMIR.test(file) && /\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
    res.writeHead(200, { "content-type": type, "content-encoding": "gzip", "vary": "accept-encoding", "cache-control": "no-cache" });
    fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res);
    return;
  }

  res.writeHead(200, {
    "content-type": type,
    "content-length": size,
    "accept-ranges": "bytes",
    "cache-control": "no-cache"
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Site em http://localhost:${PORT}`));
