import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function loadHandler(name) {
  const mod = await import(join(__dirname, "api", `${name}.js`));
  return mod.default;
}

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
  });
}

function adaptReq(req, body) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  return {
    method: req.method,
    headers: req.headers,
    body,
    query: Object.fromEntries(url.searchParams),
    url: req.url,
  };
}

function adaptRes(res) {
  let statusCode = 200;
  const proxy = {
    setHeader: (k, v) => res.setHeader(k, v),
    status: (code) => { statusCode = code; return proxy; },
    json: (data) => {
      res.writeHead(statusCode, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    },
    end: (data) => { res.writeHead(statusCode); res.end(data); },
  };
  return proxy;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.replace("/api/", "").replace(/\/$/, "");
    try {
      const handler = await loadHandler(name);
      const body = ["POST", "PUT", "PATCH"].includes(req.method)
        ? await parseBody(req)
        : undefined;
      await handler(adaptReq(req, body), adaptRes(res));
    } catch (err) {
      console.error(`API error (${name}):`, err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = join(__dirname, filePath);
  try {
    const data = await readFile(fullPath);
    const ext = extname(fullPath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
