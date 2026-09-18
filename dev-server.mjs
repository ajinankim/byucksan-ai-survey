// 로컬 확인용 서버. Vercel 로그인 없이 public/ + api/ 를 그대로 띄운다.
//   node dev-server.mjs   →  http://localhost:3000
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, "public");
const PORT = Number(process.env.PORT || 3000);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const routes = {
  "/api/config": (await import("./api/config.js")).default,
  "/api/submit": (await import("./api/submit.js")).default,
  "/api/stats": (await import("./api/stats.js")).default,
};

function shim(res) {
  return {
    _code: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(c) {
      this._code = c;
      return this;
    },
    json(d) {
      res.writeHead(this._code, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(d));
    },
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const fn = routes[url.pathname];
    if (fn) {
      const body = req.method === "POST" ? await readBody(req) : {};
      try {
        await fn({ method: req.method, body, query: Object.fromEntries(url.searchParams) },
                 shim(res));
      } catch (e) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(e.message || e) }));
      }
      return;
    }

    let p = url.pathname === "/" ? "/index.html" : url.pathname;
    if (!path.extname(p)) p += ".html";
    const file = path.join(PUB, path.normalize(p).replace(/^[\\/]+/, ""));
    if (!file.startsWith(PUB)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    try {
      const buf = await fs.readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(buf);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1>");
    }
  })
  .listen(PORT, () => {
    console.log(`\n  설문   http://localhost:${PORT}/`);
    console.log(`  결과   http://localhost:${PORT}/stats.html`);
    console.log(`  QR     http://localhost:${PORT}/qr.html\n`);
    console.log("  (저장소 미연결 — 서버를 끄면 응답은 사라집니다)\n");
  });
