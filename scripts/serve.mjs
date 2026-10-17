// Local preview of the built site (dist/), without any dependency:
//   npm run dev          (build, serve, and rebuild on every change in src/)
//   npm run serve        (serve the last build)
// Then open http://localhost:8080/ and reload after an edit.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT ?? 8080);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

if (process.argv.includes("--watch")) {
  const { startWatch } = await import("./watch.mjs");
  await startWatch();
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, "http://localhost");
  let file = normalize(join(distDir, decodeURIComponent(pathname)));
  if (!file.startsWith(distDir + sep) && file !== distDir) {
    response.writeHead(403).end();
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith("/")) {
        response.writeHead(301, { Location: `${pathname}/` }).end();
        return;
      }
      file = join(file, "index.html");
    }
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, () => console.log(`TabQR preview: http://localhost:${port}/`));
