/**
 * Production static server for combined user (/) + admin (/admin) dist output.
 * Use on Render Web Services instead of `vite` dev (which breaks /admin routing).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(root, "dist");
const port = Number(process.env.PORT || 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.posix.normalize(decoded);
  if (normalized.includes("..")) return null;
  return path.join(dist, normalized);
}

function tryFile(abs) {
  try {
    const stat = fs.statSync(abs);
    if (stat.isFile()) return abs;
  } catch {
    /* missing */
  }
  return null;
}

function spaFallback(urlPath) {
  if (urlPath === "/admin" || urlPath.startsWith("/admin/")) {
    return path.join(dist, "admin", "index.html");
  }
  return path.join(dist, "index.html");
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url || "/", `http://${req.headers.host}`).pathname;
  let abs = safePath(urlPath);

  if (abs) {
    const direct = tryFile(abs);
    if (direct) abs = direct;
    else {
      const index = tryFile(path.join(abs, "index.html"));
      abs = index || spaFallback(urlPath);
    }
  } else {
    abs = spaFallback(urlPath);
  }

  const final = tryFile(abs);
  if (!final) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(final).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(final).pipe(res);
});

if (!fs.existsSync(dist)) {
  console.error("Missing dist/. Run: npm run build");
  process.exit(1);
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Serving ${dist} on http://0.0.0.0:${port}`);
});
