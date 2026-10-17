// Markdown content of the site, rendered with one shared page layout
// (src/assets/css/page.css): logo back to the generator, language buttons
// between translations, readable text, footer.
//
// Guides: src/articles/<language>/<slug>.md
//   → <language path>articles/<slug>/  (dist/articles/… in English,
//     dist/fr/articles/… in French), plus one "Guides" index per language.
//   Front matter: title, description, date (YYYY-MM-DD), and optionally
//   updated, translationKey, draft.
//
// Pages: src/pages/<language>/<slug>.md (privacy policy…)
//   → <language path><slug>/, or the address given in "path".
//   Front matter: title, description, and optionally path (to keep an existing
//   address, e.g. "privacy-policy/"), updated (shown as "Last updated"),
//   note (small text at the bottom, Markdown links allowed), translationKey, draft.
//
// Every file starts with:
//   ---
//   title: …
//   description: …
//   ---
// Files starting with "_" are templates and never published. Translations of
// one text share the same translationKey. In the Markdown, links and images
// starting with "/" point to the site root: "/fr/" is the French generator.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";

const marked = new Marked({ gfm: true });

// Interface texts come from src/assets/js/translations.js, so every language
// works: guides, guidesTitle, guidesIntro, readingTime, updatedOn, lastUpdated,
// allGuides, breadcrumb, createQr, plus title, footerNote and language.
function interfaceTexts(translations, defaultLanguage) {
  return (language) => {
    const messages = { ...translations[defaultLanguage], ...translations[language] };
    return {
      indexTitle: messages.guidesTitle,
      indexIntro: messages.guidesIntro,
      guides: messages.guides,
      readingTime: (minutes) => messages.readingTime.replace("{minutes}", minutes),
      updated: messages.updatedOn,
      lastUpdated: (date) => messages.lastUpdated.replace("{date}", date),
      allGuides: messages.allGuides,
      breadcrumb: messages.breadcrumb,
      language: messages.language,
      home: messages.title,
      tagline: messages.footerNote,
      cta: messages.createQr,
    };
  };
}

function parseFrontMatter(source, file, required) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error(`${file}: the file must start with a front matter block (--- … ---).`);
  }
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) {
      throw new Error(`${file}: cannot read the front matter line "${line}".`);
    }
    data[field[1]] = field[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  for (const key of required) {
    if (!data[key]) {
      throw new Error(`${file}: "${key}" is required in the front matter.`);
    }
  }
  for (const key of ["date", "updated"]) {
    if (data[key] && !/^\d{4}-\d{2}-\d{2}$/.test(data[key])) {
      throw new Error(`${file}: "${key}" must be written YYYY-MM-DD.`);
    }
  }
  return { data, body: source.slice(match[0].length) };
}

// Reads src/<folder>/<language>/*.md; loose files and "_" files are ignored.
function readContent(srcDir, folder, required) {
  const root = join(srcDir, folder);
  if (!existsSync(root)) {
    return [];
  }
  const entries = [];
  const languages = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const { name: language } of languages) {
    for (const file of readdirSync(join(root, language)).filter((name) => name.endsWith(".md") && !name.startsWith("_"))) {
      const path = `src/${folder}/${language}/${file}`;
      const { data, body } = parseFrontMatter(readFileSync(join(root, language, file), "utf8"), path, required);
      if (data.draft === "true") {
        continue;
      }
      const slug = file.replace(/\.md$/, "");
      entries.push({ language, slug, key: data.translationKey || slug, source: path, ...data, body });
    }
  }
  return entries;
}

export const readArticles = (srcDir) => readContent(srcDir, "articles", ["title", "description", "date"]);
export const readPages = (srcDir) => readContent(srcDir, "pages", ["title", "description"]);

const slugify = (text) => text
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/<[^>]+>/g, "")
  .replace(/&[a-z]+;/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  .replace(/^-|-$/g, "");

// Short words stay with the next one (typeset), outside code blocks and tags.
function typesetHtml(html, language, typeset) {
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>|<[^>]+>)/g)
    .map((part, index) => (index % 2 ? part : typeset(part, language)))
    .join("");
}

function readingMinutes(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const ideographs = (text.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g) ?? []).length;
  return Math.max(1, Math.round(words / 220 + ideographs / 500));
}

const upTo = (path) => "../".repeat(path.split("/").filter(Boolean).length);

// Shared tools for guides and pages.
function createRenderer(options) {
  const { translations, distDir, siteUrl, defaultLanguage, pathFor, nativeName, typeset, escapeHtml, rtlLanguages, stylesheet } = options;
  const textFor = interfaceTexts(translations, defaultLanguage);
  const dateText = (date, language) => new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
  const written = new Map();

  function markdown(body, language, path) {
    let html = marked.parse(body);
    html = html.replace(/<(h[2-3])>([\s\S]*?)<\/\1>/g, (match, tag, inner) => `<${tag} id="${slugify(inner)}">${inner}</${tag}>`);
    html = html.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${upTo(path)}`);
    html = html.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>");
    return typesetHtml(html, language, typeset).trim();
  }

  function inlineMarkdown(text, language, path) {
    const html = marked.parseInline(text).replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${upTo(path)}`);
    return typesetHtml(html, language, typeset);
  }

  // alternates: [[language, absolute URL], …] of the translations, this page included.
  function page({ language, path, title, description, alternates, body, structuredData, ogType, mainClass }) {
    const text = textFor(language);
    const root = upTo(path);
    const home = `${root}${pathFor(language)}` || "./";
    const xDefault = alternates.find(([hreflang]) => hreflang === defaultLanguage) ?? alternates[0];
    const languageLinks = alternates.length > 1
      ? `
      <nav aria-label="${escapeHtml(text.language)}">
${alternates.map(([hreflang, url]) => `        <a href="${url.replace(siteUrl, root)}" lang="${hreflang}"${hreflang === language ? ' aria-current="page"' : ""}>${escapeHtml(nativeName(hreflang))}</a>`).join("\n")}
      </nav>`
      : "";
    return `<!doctype html>
<html lang="${language}" dir="${rtlLanguages.has(language.split("-")[0]) ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} — TabQR</title>
  <link rel="canonical" href="${siteUrl}${path}">
${alternates.map(([hreflang, url]) => `  <link rel="alternate" hreflang="${hreflang}" href="${url}">`).join("\n")}
  <link rel="alternate" hreflang="x-default" href="${xDefault[1]}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="TabQR">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${siteUrl}${path}">
  <meta property="og:image" content="${siteUrl}assets/icons/icon-512.png">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="${root}assets/images/tabqr-icon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${root}${stylesheet}">
  <script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>
</head>
<body>
  <main class="${mainClass}">
    <header>
      <a class="brand" href="${home}" aria-label="${escapeHtml(text.home)}"><img src="${root}assets/images/tabqr-icon.svg" alt="">TabQR</a>${languageLinks}
    </header>
${body}
  </main>

  <footer class="site-footer">
    <span>TabQR <span aria-hidden="true">·</span> ${escapeHtml(text.tagline)}</span>
    <a href="${home}">
      <span>${escapeHtml(text.cta)}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>
  </footer>
</body>
</html>
`;
  }

  // Writes dist/<path>index.html; two sources may never claim the same address.
  function write(path, html, source) {
    if (written.has(path)) {
      throw new Error(`${source} and ${written.get(path)} both produce the address /${path}.`);
    }
    written.set(path, source);
    mkdirSync(join(distDir, path), { recursive: true });
    writeFileSync(join(distDir, path, "index.html"), html);
  }

  const languageOrder = (a, b) => (a === defaultLanguage ? -1 : b === defaultLanguage ? 1 : a.localeCompare(b));
  const withXDefault = (alternates) => [...alternates, ["x-default", (alternates.find(([l]) => l === defaultLanguage) ?? alternates[0])[1]]];

  return { ...options, textFor, dateText, markdown, inlineMarkdown, page, write, languageOrder, withXDefault };
}

export function buildArticles(options) {
  const r = createRenderer(options);
  const { articles, siteUrl, pathFor, typeset, escapeHtml } = r;
  const indexPath = (language) => `${pathFor(language)}articles/`;
  const articlePath = (article) => `${indexPath(article.language)}${article.slug}/`;
  const languages = [...new Set(articles.map(({ language }) => language))].sort(r.languageOrder);
  const sitemapEntries = [];

  for (const article of articles) {
    const { language } = article;
    const text = r.textFor(language);
    const path = articlePath(article);
    const root = "../".repeat(path.split("/").filter(Boolean).length);
    const alternates = articles
      .filter((other) => other.key === article.key)
      .sort((a, b) => r.languageOrder(a.language, b.language))
      .map((other) => [other.language, `${siteUrl}${articlePath(other)}`]);
    const content = r.markdown(article.body, language, path);
    const minutes = readingMinutes(content);
    const lastDate = article.updated || article.date;
    const dates = article.updated && article.updated !== article.date
      ? `<time datetime="${article.date}">${r.dateText(article.date, language)}</time> · ${escapeHtml(text.updated)} <time datetime="${article.updated}">${r.dateText(article.updated, language)}</time>`
      : `<time datetime="${article.date}">${r.dateText(article.date, language)}</time>`;

    r.write(path, r.page({
      language,
      path,
      title: article.title,
      description: article.description,
      alternates,
      ogType: "article",
      mainClass: "article-page",
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.description,
          inLanguage: language,
          datePublished: article.date,
          dateModified: lastDate,
          mainEntityOfPage: `${siteUrl}${path}`,
          image: `${siteUrl}assets/icons/icon-512.png`,
          author: { "@type": "Organization", name: "CryberCorp", url: "https://github.com/CryberCorp" },
          publisher: { "@type": "Organization", name: "TabQR", logo: { "@type": "ImageObject", url: `${siteUrl}assets/icons/icon-512.png` } },
        },
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "TabQR", item: `${siteUrl}${pathFor(language)}` },
            { "@type": "ListItem", position: 2, name: text.indexTitle, item: `${siteUrl}${indexPath(language)}` },
            { "@type": "ListItem", position: 3, name: article.title, item: `${siteUrl}${path}` },
          ],
        },
      ],
      body: `    <nav class="breadcrumb" aria-label="${escapeHtml(text.breadcrumb)}">
      <a href="${root}${pathFor(language)}">TabQR</a> <span aria-hidden="true">›</span> <a href="../">${escapeHtml(text.guides)}</a>
    </nav>
    <article>
      <h1>${escapeHtml(typeset(article.title, language))}</h1>
      <p class="updated">${dates} · ${escapeHtml(text.readingTime(minutes))}</p>
      <div class="prose">
${content}
      </div>
    </article>
    <p class="article-back"><a href="../"><span aria-hidden="true">←</span> ${escapeHtml(text.allGuides)}</a></p>`,
    }), article.source);
    sitemapEntries.push({ loc: `${siteUrl}${path}`, alternates: r.withXDefault(alternates) });
  }

  // One index per language, newest first.
  const indexAlternates = languages.map((language) => [language, `${siteUrl}${indexPath(language)}`]);
  for (const language of languages) {
    const text = r.textFor(language);
    const path = indexPath(language);
    const list = articles
      .filter((article) => article.language === language)
      .sort((a, b) => (b.updated || b.date).localeCompare(a.updated || a.date))
      .map((article) => `      <li>
        <a href="${article.slug}/">
          <span class="article-list-title">${escapeHtml(typeset(article.title, language))}</span>
          <span class="article-list-description">${escapeHtml(typeset(article.description, language))}</span>
          <time datetime="${article.updated || article.date}">${r.dateText(article.updated || article.date, language)}</time>
        </a>
      </li>`)
      .join("\n");
    r.write(path, r.page({
      language,
      path,
      title: text.indexTitle,
      description: text.indexIntro,
      alternates: indexAlternates,
      ogType: "website",
      mainClass: "article-page",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: text.indexTitle,
        description: text.indexIntro,
        inLanguage: language,
        url: `${siteUrl}${path}`,
      },
      body: `    <h1>${escapeHtml(typeset(text.indexTitle, language))}</h1>
    <p class="updated">${escapeHtml(typeset(text.indexIntro, language))}</p>
    <ul class="article-list">
${list}
    </ul>`,
    }), `the ${language} guide index`);
    sitemapEntries.push({ loc: `${siteUrl}${path}`, alternates: r.withXDefault(indexAlternates) });
  }

  return { languages, sitemapEntries, write: r.write };
}

// "write" from buildArticles is passed in so guides and pages share one
// address registry (no page can silently overwrite a guide).
export function buildPages(options) {
  const r = createRenderer(options);
  const write = options.write ?? r.write;
  const { pages, siteUrl, pathFor, typeset, escapeHtml } = r;
  const pathOf = (page) => (page.path ? `${page.path.replace(/^\/+|\/+$/g, "")}/` : `${pathFor(page.language)}${page.slug}/`);
  const sitemapEntries = [];

  for (const entry of pages) {
    const { language } = entry;
    const text = r.textFor(language);
    const path = pathOf(entry);
    const alternates = pages
      .filter((other) => other.key === entry.key)
      .sort((a, b) => r.languageOrder(a.language, b.language))
      .map((other) => [other.language, `${siteUrl}${pathOf(other)}`]);
    const updated = entry.updated
      ? `\n    <p class="updated">${escapeHtml(typeset(text.lastUpdated(r.dateText(entry.updated, language)), language))}</p>`
      : "";
    const note = entry.note
      ? `\n    <div class="page-note">\n      <p>${r.inlineMarkdown(entry.note, language, path)}</p>\n    </div>`
      : "";

    write(path, r.page({
      language,
      path,
      title: entry.title,
      description: entry.description,
      alternates,
      ogType: "website",
      mainClass: "content-page",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: entry.title,
        description: entry.description,
        inLanguage: language,
        url: `${siteUrl}${path}`,
        ...(entry.updated ? { dateModified: entry.updated } : {}),
      },
      body: `    <h1>${escapeHtml(typeset(entry.title, language))}</h1>${updated}
    <div class="prose">
${r.markdown(entry.body, language, path)}
    </div>${note}`,
    }), entry.source);
    sitemapEntries.push({ loc: `${siteUrl}${path}`, alternates: r.withXDefault(alternates) });
  }
  return { sitemapEntries };
}
