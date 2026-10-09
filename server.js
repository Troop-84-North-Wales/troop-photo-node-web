// Troop 84 site server — zero dependencies (Node 18+).
// Serves ./public and proxies Facebook Page photos at /api/photos.
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

// ---- Minimal .env loader (does not override real env vars) ----
(function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = val;
  }
})();

const PORT = Number(process.env.PORT) || 3000;
const PAGE_ID = process.env.FB_PAGE_ID || "1312640681940485";
const TOKEN = process.env.FB_PAGE_TOKEN || "";
const GRAPH = "https://graph.facebook.com/" + (process.env.FB_GRAPH_VERSION || "v21.0");
const CACHE_MS = (Number(process.env.PHOTO_CACHE_MINUTES) || 15) * 60 * 1000;
const MAX_PAGES = 20;          // safety cap: 20 x 100 photos
const TARGET_WIDTH = 1280;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8"
};

// Never leak the token in logs/errors.
function scrub(s) { return TOKEN ? String(s).split(TOKEN).join("[redacted]") : String(s); }

function pickImage(images) {
  if (!Array.isArray(images) || !images.length) return null;
  let best = images[0];
  for (const im of images) {
    if (Math.abs(im.width - TARGET_WIDTH) < Math.abs(best.width - TARGET_WIDTH)) best = im;
  }
  return best;
}

let cache = { at: 0, data: null };
let inflight = null;
let lastFail = { at: 0, err: null }; // brief negative cache so failures don't hammer Graph API

async function fetchAllPhotos() {
  if (!TOKEN) throw new Error("FB_PAGE_TOKEN is not configured on the server.");
  const params = new URLSearchParams({
    type: "uploaded", fields: "id,created_time,images,name,link", limit: "100", access_token: TOKEN
  });
  let url = `${GRAPH}/${encodeURIComponent(PAGE_ID)}/photos?${params}`;
  const out = [];
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    let res, body;
    try {
      res = await fetch(url, { signal: ctrl.signal });
      body = await res.json();
    } finally { clearTimeout(t); }
    if (!res.ok || body.error) {
      const msg = body && body.error ? body.error.message : "HTTP " + res.status;
      throw new Error("Graph API error: " + scrub(msg));
    }
    for (const p of body.data || []) {
      const im = pickImage(p.images);
      if (!im) continue;
      out.push({
        id: p.id, src: im.source, width: im.width, height: im.height,
        caption: p.name || "", link: p.link || `https://www.facebook.com/photo/?fbid=${p.id}`,
        created_time: p.created_time
      });
    }
    url = body.paging && body.paging.next ? body.paging.next : null;
  }
  out.sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)));
  return out;
}

async function getPhotos() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!cache.data && lastFail.err && Date.now() - lastFail.at < 60 * 1000) throw lastFail.err;
  if (!inflight) {
    inflight = fetchAllPhotos()
      .then(d => { cache = { at: Date.now(), data: d }; return d; })
      .finally(() => { inflight = null; });
  }
  try { return await inflight; }
  catch (e) {
    lastFail = { at: Date.now(), err: e };
    if (cache.data) { console.warn("Photo refresh failed, serving stale cache:", scrub(e.message)); return cache.data; }
    throw e;
  }
}

function send(res, status, body, type, extra) {
  res.writeHead(status, Object.assign({ "Content-Type": type, "X-Content-Type-Options": "nosniff" }, extra || {}));
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, "Forbidden", MIME[".txt"]);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // allow extensionless URLs, e.g. /photos -> photos.html
      if (!path.extname(file) && fs.existsSync(file + ".html")) return serveStatic(req, res, pathname + ".html");
      return send(res, 404, "Not found", MIME[".txt"]);
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const cacheCtl = /\.(png|jpe?g|gif|svg|ico|webp)$/i.test(file) ? "public, max-age=86400" : "no-cache";
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Cache-Control": cacheCtl });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try { pathname = new URL(req.url, "http://localhost").pathname; }
  catch { return send(res, 400, "Bad request", MIME[".txt"]); }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "Method not allowed", MIME[".txt"]);

  if (pathname === "/healthz") return send(res, 200, "ok", MIME[".txt"]);

  if (pathname === "/api/photos") {
    // No token configured: the site still works as plain HTML; the photo sections stay hidden.
    if (!TOKEN) return send(res, 200, "[]", MIME[".json"], { "Cache-Control": "no-store", "X-Photos-Configured": "false" });
    try {
      const photos = await getPhotos();
      return send(res, 200, JSON.stringify(photos), MIME[".json"], { "Cache-Control": "public, max-age=300" });
    } catch (e) {
      console.error("/api/photos failed:", scrub(e.message));
      return send(res, 502, JSON.stringify({
        error: "Photos are temporarily unavailable. Please visit our Facebook page instead.",
        facebookUrl: `https://www.facebook.com/${PAGE_ID}`
      }), MIME[".json"], { "Cache-Control": "no-store" });
    }
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Troop 84 site running at http://localhost:${PORT}  (Facebook token ${TOKEN ? "configured" : "MISSING"})`);
});
