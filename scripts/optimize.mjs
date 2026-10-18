// Makes the published files (dist/) lighter without changing what they do.
// Sources in src/ stay readable; only the generated copies are compacted:
// - JavaScript and CSS minified by esbuild (comments, spaces, short local names);
// - HTML: indentation and blank lines removed (never inside <pre>/<textarea>);
// - the Doto font reduced to the characters it actually shows (titles, logo)
//   and converted to WOFF2; the stylesheets are pointed at it.

import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
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
  for (const file of files.filter((name) => name.endsWith(".css"))) {
    const path = join(distDir, file);
    const css = readFileSync(path, "utf8");
    writeFileSync(path, css.replaceAll(ttfName, woff2Name).replace(/format\(["']?truetype["']?\)/g, 'format("woff2")'));
  }

  return { before, after, fontBefore: ttfSize, fontAfter: woff2.length };
}

// The service worker is written last: compact it on its own.
export async function minifyFile(path) {
  const source = readFileSync(path, "utf8");
  writeFileSync(path, (await transform(source, { loader: "js", minify: true, charset: "utf8" })).code);
}
