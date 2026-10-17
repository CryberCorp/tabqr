// Builds the published site from src/ into dist/ (never edit dist/ by hand):
//   npm run build        (or: node scripts/build.mjs)
//
// - src/index.html is the template: one page per language is generated from it
//   and src/assets/js/translations.js (dist/index.html in English, dist/fr/…),
//   with canonical, hreflang, Open Graph, structured data and crawlable
//   language links, plus dist/sitemap.xml;
// - ?v= on local CSS/JS set from their content, so browsers never keep an
//   outdated file;
// - the offline file list and cache version in dist/sw.js;
// - every other file of src/ is copied as is.
// GitHub Actions (.github/workflows/deploy.yml) runs this build and publishes
// dist/ on every push: generated files are never committed.

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

// Settings ------------------------------------------------------------------

const siteUrl = "https://crybercorp.github.io/tabqr/";
// Chrome Web Store page of the extension. Empty: the header button and the
// footer link stay hidden. See TODO.md.
const chromeWebStoreUrl = "";
const privacyUrls = {
  en: `${siteUrl}privacy-policy/`,
  fr: `${siteUrl}privacy-policy/fr/`,
};
const defaultLanguage = "en";
const rtlLanguages = new Set(["ar", "fa", "he", "ur"]);
// Open Graph wants language_TERRITORY.
const ogLocales = {
  ar: "ar_AR", bg: "bg_BG", ca: "ca_ES", cs: "cs_CZ", da: "da_DK", de: "de_DE", el: "el_GR", en: "en_US",
  es: "es_ES", fi: "fi_FI", fr: "fr_FR", he: "he_IL", hi: "hi_IN", hr: "hr_HR", hu: "hu_HU", id: "id_ID",
  it: "it_IT", ja: "ja_JP", ko: "ko_KR", nl: "nl_NL", no: "nb_NO", pl: "pl_PL", "pt-BR": "pt_BR",
  "pt-PT": "pt_PT", ro: "ro_RO", ru: "ru_RU", sk: "sk_SK", sv: "sv_SE", tr: "tr_TR", uk: "uk_UA",
  vi: "vi_VN", "zh-CN": "zh_CN", "zh-TW": "zh_TW",
};

// ---------------------------------------------------------------------------

const projectDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(projectDir, "src");
const distDir = join(projectDir, "dist");
const read = (path) => readFileSync(join(srcDir, path), "utf8");
const hash = (content) => createHash("sha256").update(content).digest("hex").slice(0, 10);
const { translations, typeset } = new Function(
  `${read("assets/js/translations.js")}\nreturn { translations, typeset };`,
)();
const languages = Object.keys(translations);
const shareImage = `${siteUrl}assets/icons/icon-512.png`;

const pathFor = (language) => (language === defaultLanguage ? "" : `${language.toLowerCase()}/`);
const urlFor = (language) => `${siteUrl}${pathFor(language)}`;
const isLocal = (url) => !/^(?:[a-z][a-z0-9+.-]*:|\/|#|\.\.?\/)/.test(url) && url !== "./";
const escapeHtml = (text) => text
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Each language is listed under its own name, e.g. "Deutsch", "日本語".
function nativeName(language) {
  const name = new Intl.DisplayNames([language], { type: "language" }).of(language);
  return name.charAt(0).toLocaleUpperCase(language) + name.slice(1);
}

function replaceBlock(text, start, end, lines) {
  const pattern = new RegExp(`([ \\t]*)${start}[\\s\\S]*?${end}`);
  const match = text.match(pattern);
  if (!match) {
    throw new Error(`Missing block ${start} ... ${end}.`);
  }
  const indent = match[1];
  const body = lines.map((line) => `${indent}${line}\n`).join("");
  return text.replace(pattern, () => `${indent}${start}\n${body}${indent}${end}`);
}

function setHidden(tag, hidden) {
  const visible = tag.replace(/\shidden(?=[\s>])/, "");
  return hidden ? visible.replace(/>$/, " hidden>") : visible;
}

// Versioned assets: "assets/css/app.css" becomes "assets/css/app.css?v=<content hash>".
const template = read("index.html").replace(
  /(\s(?:href|src)=")([^"?#]+\.(?:css|js))"/g,
  (match, attribute, path) => (isLocal(path) ? `${attribute}${path}?v=${hash(read(path))}"` : match),
);

function headTags(language, messages) {
  const url = urlFor(language);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TabQR",
    url,
    description: messages.description,
    inLanguage: language,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    image: shareImage,
  };
  return [
    `<link rel="canonical" href="${url}">`,
    ...languages.map((other) => `<link rel="alternate" hreflang="${other}" href="${urlFor(other)}" data-path="${pathFor(other)}">`),
    `<link rel="alternate" hreflang="x-default" href="${siteUrl}" data-path="">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="TabQR">',
    `<meta property="og:title" content="${escapeHtml(messages.title)}">`,
    `<meta property="og:description" content="${escapeHtml(messages.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${shareImage}">`,
    `<meta property="og:locale" content="${ogLocales[language] ?? language.replace("-", "_")}">`,
    '<meta name="twitter:card" content="summary">',
    `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>`,
  ];
}

function languageLinks(language) {
  const isRoot = language === defaultLanguage;
  return languages.map((other) => {
    const href = pathFor(other) || (isRoot ? "./" : "../");
    const current = other === language ? ' aria-current="page"' : "";
    return `<a href="${href}" hreflang="${other}" lang="${other}"${current}>${escapeHtml(nativeName(other))}</a>`;
  });
}

function render(language) {
  const messages = { ...translations[defaultLanguage], ...translations[language] };
  const text = (key) => escapeHtml(typeset(messages[key] ?? key, language));
  const attribute = (key) => escapeHtml(messages[key] ?? key);
  const isRoot = language === defaultLanguage;
  let html = template;

  html = html.replace(
    /<html[^>]*>/,
    `<html lang="${language}" dir="${rtlLanguages.has(language.split("-")[0]) ? "rtl" : "ltr"}" data-root="${isRoot ? "./" : "../"}">`,
  );
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${attribute("title")}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${attribute("description")}$2`);
  html = replaceBlock(html, "<!-- build:head -->", "<!-- /build:head -->", headTags(language, messages));
  html = replaceBlock(html, "<!-- build:language-links -->", "<!-- /build:language-links -->", languageLinks(language));
  html = html.replace(/(<span data-language-name>)[^<]*(<\/span>)/, `$1${escapeHtml(nativeName(language))}$2`);

  html = html.replace(
    /(<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g,
    (match, open, tag, key, close) => `${open}${text(key)}${close}`,
  );
  html = html.replace(
    /<[^>]*\sdata-i18n-placeholder="([^"]+)"[^>]*>/g,
    (tag, key) => tag.replace(/\splaceholder="[^"]*"/, ` placeholder="${attribute(key)}"`),
  );
  html = html.replace(
    /<[^>]*\sdata-i18n-aria-label="([^"]+)"[^>]*>/g,
    (tag, key) => tag.replace(/\saria-label="[^"]*"/, ` aria-label="${attribute(key)}"`),
  );
  html = html.replace(
    /(<a href=")[^"]*(" data-i18n="extensionPrivacy")/,
    `$1${privacyUrls[language] ?? privacyUrls[defaultLanguage]}$2`,
  );

  // Chrome Web Store: links appear once the URL is set. The header button
  // (data-desktop-chromium) stays hidden here: app.js shows it only on
  // desktop browsers that install Chrome Web Store extensions.
  html = html.replace(/<a\b[^>]*\sdata-store-link[^>]*>/g, (tag) => setHidden(
    tag.replace(/\shref="[^"]*"/, ` href="${chromeWebStoreUrl ? escapeHtml(chromeWebStoreUrl) : "#"}"`),
    !chromeWebStoreUrl || tag.includes("data-desktop-chromium"),
  ));

  // Language pages live one folder down: point local assets back to the root.
  if (!isRoot) {
    html = html.replace(/(\s(?:href|src)=")([^"]*)"/g, (match, attribute, url) => (
      isLocal(url) ? `${attribute}../${url}"` : match
    ));
  }
  return html;
}

function sitemap() {
  const entry = (loc, alternates) => [
    "  <url>",
    `    <loc>${loc}</loc>`,
    ...alternates.map(([hreflang, href]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`),
    "  </url>",
  ].join("\n");
  const appAlternates = [...languages.map((language) => [language, urlFor(language)]), ["x-default", siteUrl]];
  const privacyAlternates = [...Object.entries(privacyUrls), ["x-default", privacyUrls[defaultLanguage]]];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...languages.map((language) => entry(urlFor(language), appAlternates)),
    ...Object.values(privacyUrls).map((url) => entry(url, privacyAlternates)),
    "</urlset>",
    "",
  ].join("\n");
}

// Everything the app needs offline: every language page, the files they load,
// the files their stylesheets load (fonts) and the manifest icons.
function offlineFiles(pages) {
  const assets = new Set();
  for (const [, url] of template.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    // Folder links are the language pages, listed separately.
    if (isLocal(url) && !url.endsWith("/")) {
      assets.add(url);
    }
  }
  for (const stylesheet of [...assets].filter((url) => url.split("?")[0].endsWith(".css"))) {
    const path = stylesheet.split("?")[0];
    for (const [, url] of read(path).matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      // Inline images (data:) and external URLs need no local file.
      if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
        assets.add(posix.normalize(posix.join(posix.dirname(path), url)));
      }
    }
  }
  for (const icon of JSON.parse(read("manifest.webmanifest")).icons) {
    assets.add(icon.src);
  }
  const sortedAssets = [...assets].sort();
  const urls = [...pages.map(({ path }) => path || "./"), ...sortedAssets];
  const contents = [...pages.map(({ html }) => html), ...sortedAssets.map((url) => read(url.split("?")[0]))];
  return { urls, version: hash(contents.join("\n")) };
}

// Fresh dist/: static files copied as is, then the generated ones.
const generatedFromSrc = new Set([join(srcDir, "index.html"), join(srcDir, "sw.js")]);
// Empty dist/ rather than deleting it: on Windows an open editor or file
// watcher can lock the folder itself.
mkdirSync(distDir, { recursive: true });
for (const entry of readdirSync(distDir)) {
  rmSync(join(distDir, entry), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
cpSync(srcDir, distDir, { recursive: true, filter: (path) => !generatedFromSrc.has(path) });

// Secondary pages (privacy policy…) are copied as is; only their local CSS/JS
// get a content ?v=, resolved from the page's own folder.
for (const page of readdirSync(distDir, { recursive: true }).filter((path) => path.endsWith(".html"))) {
  const pageDir = posix.dirname(page.split("\\").join("/"));
  const html = readFileSync(join(distDir, page), "utf8");
  const versioned = html.replace(
    /(\s(?:href|src)=")([^"?#:]+\.(?:css|js))"/g,
    (match, attribute, url) => `${attribute}${url}?v=${hash(read(posix.normalize(posix.join(pageDir, url))))}"`,
  );
  if (versioned !== html) {
    writeFileSync(join(distDir, page), versioned);
  }
}

const pages = languages.map((language) => ({ path: pathFor(language), html: render(language) }));
for (const { path, html } of pages) {
  const file = join(distDir, path, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}
writeFileSync(join(distDir, "sitemap.xml"), sitemap());

const { urls, version } = offlineFiles(pages);
writeFileSync(join(distDir, "sw.js"), replaceBlock(read("sw.js"), "// build:precache", "// /build:precache", [
  `const VERSION = "${version}";`,
  "const PRECACHE = [",
  ...urls.map((url) => `  "${url}",`),
  "];",
]));

console.log(`Built ${pages.length} language pages, sitemap.xml and sw.js (${urls.length} offline files, version ${version}).`);
