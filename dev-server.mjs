import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

async function loadHandler(apiPath) {
  const mod = await import(path.join(__dirname, "api", apiPath + ".js"));
  return mod.default;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function makeRes(raw) {
  let statusCode = 200;
  const headers = {};
  const res = {
    setHeader(k, v) { headers[k] = v; return res; },
    status(c) { statusCode = c; return res; },
    json(obj) {
      raw.writeHead(statusCode, { ...headers, "Content-Type": "application/json" });
      raw.end(JSON.stringify(obj));
    },
    end(body) {
      raw.writeHead(statusCode, headers);
      raw.end(body || "");
    },
  };
  return res;
}

const server = http.createServer(async (req, raw) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    const name = url.pathname.replace("/api/", "").replace(/\/$/, "");
    try {
      const handler = await loadHandler(name);
      const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await parseBody(req) : {};
      const query = Object.fromEntries(url.searchParams);
      handler({ method: req.method, headers: req.headers, body, query }, makeRes(raw));
    } catch (e) {
      raw.writeHead(500, { "Content-Type": "application/json" });
      raw.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  const filePath = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const ext = path.extname(fullPath);
    const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
    raw.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    fs.createReadStream(fullPath).pipe(raw);
  } else {
    raw.writeHead(404);
    raw.end("Not found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
