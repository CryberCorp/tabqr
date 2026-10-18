// Makes the published files (dist/) lighter without changing what they do.
// Sources in src/ stay readable; only the generated copies are compacted:
// - JavaScript and CSS minified by esbuild (comments, spaces, short local names);
// - HTML: indentation and blank lines removed (never inside <pre>/<textarea>);
// - the Doto font reduced to the characters it actually shows (titles, logo)
//   and converted to WOFF2;
// - critical path: each page carries its stylesheet (with the font inside)
//   and its blocking script inline, so the first render needs no other
//   request. Deferred scripts stay separate files.

import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, posix } from "node:path";
import { transform } from "esbuild";
import subsetFont from "subset-font";

const listFiles = (dir) => readdirSync(dir, { recursive: true })
  .map((path) => path.split("\\").join("/"))
  .filter((path) => extname(path));

function compactHtml(html) {
  // Keep preformatted blocks exactly as written.
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<textarea[\s\S]*?<\/textarea>)/g)
    .map((part, index) => (index % 2 ? part : part.replace(/\n[ \t]+/g, "\n").replace(/\n{2,}/g, "\n")))
    .join("");
}

const decodeEntities = (text) => text
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, "\"")
  .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)));

// Characters drawn with Doto: page titles (h1) and the "TabQR" logo, plus
// printable ASCII so any future short title still renders in the font.
function dotoCharacters(htmlFiles) {
  const characters = new Set();
  for (let code = 32; code < 127; code += 1) {
    characters.add(String.fromCharCode(code));
  }
  for (const html of htmlFiles) {
    for (const [, title, brand] of html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>|class="brand"[^>]*>([\s\S]*?)<\/a>/g)) {
      for (const character of decodeEntities((title ?? brand ?? "").replace(/<[^>]+>/g, ""))) {
        characters.add(character);
      }
    }
  }
  return [...characters].join("");
}

export async function optimize(distDir, { font }) {
  const files = listFiles(distDir);
  const htmlSources = [];
  let before = 0;
  let after = 0;

  for (const file of files) {
    const path = join(distDir, file);
    const type = extname(file);
    if (![".js", ".css", ".html"].includes(type)) {
      continue;
    }
    const source = readFileSync(path, "utf8");
    let output = source;
    if (type === ".js") {
      // Classic scripts sharing globals (translations, typeset…): esbuild keeps
      // top-level names as they are and only shortens local ones.
      output = (await transform(source, { loader: "js", minify: true, legalComments: "inline", charset: "utf8" })).code;
    } else if (type === ".css") {
      output = (await transform(source, { loader: "css", minify: true, charset: "utf8" })).code;
    } else {
      htmlSources.push(source);
      output = compactHtml(source);
    }
    before += Buffer.byteLength(source);
    after += Buffer.byteLength(output);
    writeFileSync(path, output);
  }

  // Font: subset + WOFF2, and the stylesheets updated to load it.
  const fontPath = join(distDir, font.ttf);
  const woff2 = await subsetFont(readFileSync(fontPath), dotoCharacters(htmlSources), { targetFormat: "woff2" });
  const ttfSize = readFileSync(fontPath).length;
  writeFileSync(join(distDir, font.woff2), woff2);
  rmSync(fontPath);
  const ttfName = font.ttf.split("/").at(-1);
  const woff2Name = font.woff2.split("/").at(-1);
  // The font travels inside the stylesheets (a data URL, about 3 KiB).
  const fontUrl = `data:font/woff2;base64,${woff2.toString("base64")}`;
  const fontReference = new RegExp(`url\\(["']?[^"')]*(?:${ttfName}|${woff2Name})["']?\\)`, "g");
  for (const file of files.filter((name) => name.endsWith(".css"))) {
    const path = join(distDir, file);
    const css = readFileSync(path, "utf8")
      .replace(/format\(["']?truetype["']?\)/g, 'format("woff2")')
      .replace(fontReference, `url(${fontUrl})`);
    writeFileSync(path, css);
  }
  rmSync(join(distDir, font.woff2), { force: true });

  // Inline stylesheets and blocking (non-deferred) scripts into every page.
  const inlined = new Set([font.woff2]);
  const isLocalUrl = (url) => !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);
  for (const file of files.filter((name) => name.endsWith(".html"))) {
    const path = join(distDir, file);
    const pageDir = posix.dirname(file);
    const local = (href) => posix.normalize(posix.join(pageDir, href.split("?")[0]));
    let html = readFileSync(path, "utf8");
    html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (match, href) => {
      if (!isLocalUrl(href)) {
        return match;
      }
      const asset = local(href);
      const css = readFileSync(join(distDir, asset), "utf8");
      if (/<\/style/i.test(css) || /url\((?!["']?data:)/.test(css)) {
        throw new Error(`${asset}: cannot be inlined safely (closing tag or relative url).`);
      }
      inlined.add(asset);
      return `<style>${css}</style>`;
    });
    html = html.replace(/<script src="([^"]+)"><\/script>/g, (match, src) => {
      if (!isLocalUrl(src)) {
        return match;
      }
      const asset = local(src);
      const js = readFileSync(join(distDir, asset), "utf8");
      if (/<\/script/i.test(js)) {
        throw new Error(`${asset}: cannot be inlined safely (closing tag).`);
      }
      inlined.add(asset);
      return `<script>${js}</script>`;
    });
    writeFileSync(path, html);
  }

  // Inlined files are no longer requested by any page: not published.
  for (const asset of inlined) {
    rmSync(join(distDir, asset), { force: true });
  }

  return { before, after, fontBefore: ttfSize, fontAfter: woff2.length, inlined: [...inlined] };
}

// The service worker is written last: compact it on its own.
export async function minifyFile(path) {
  const source = readFileSync(path, "utf8");
  writeFileSync(path, (await transform(source, { loader: "js", minify: true, charset: "utf8" })).code);
}
