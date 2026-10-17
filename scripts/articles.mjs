// Articles: Markdown files in src/articles/<language>/<slug>.md become pages
// at <language path>articles/<slug>/ (dist/articles/… in English,
// dist/fr/articles/… in French), plus one "Guides" index per language.
//
// Each file starts with a front matter block:
//   ---
//   title: How big should a printed QR code be?
//   description: One or two sentences, shown in search results and the index.
//   date: 2026-10-18
//   updated: 2026-11-02        (optional)
//   translationKey: print-size (optional: same key = translations of one article)
//   draft: true                (optional: skipped by the build)
//   ---
//
// In the Markdown, links and images starting with "/" point to the site root:
// "/fr/" is the French generator, "/assets/images/articles/size.png" an image.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";

// Interface texts come from src/assets/js/translations.js (keys guides,
// guidesTitle, guidesIntro, readingTime, updatedOn, allGuides, breadcrumb,
// createQr, plus title, footerNote and language), so every language works.
function interfaceTexts(translations, defaultLanguage) {
  return (language) => {
    const messages = { ...translations[defaultLanguage], ...translations[language] };
    return {
      indexTitle: messages.guidesTitle,
      indexIntro: messages.guidesIntro,
      guides: messages.guides,
      readingTime: (minutes) => messages.readingTime.replace("{minutes}", minutes),
      updated: messages.updatedOn,
      allGuides: messages.allGuides,
      breadcrumb: messages.breadcrumb,
      language: messages.language,
      home: messages.title,
      tagline: messages.footerNote,
      cta: messages.createQr,
    };
  };
}

const marked = new Marked({ gfm: true });

function parseFrontMatter(source, file) {
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
  for (const key of ["title", "description", "date"]) {
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

export function readArticles(srcDir) {
  const root = join(srcDir, "articles");
  if (!existsSync(root)) {
    return [];
  }
  const articles = [];
  // One folder per language; loose files (like _template.md) are ignored.
  const folders = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const { name: language } of folders) {
    const folder = join(root, language);
    for (const file of readdirSync(folder).filter((name) => name.endsWith(".md") && !name.startsWith("_"))) {
      const path = `src/articles/${language}/${file}`;
      const { data, body } = parseFrontMatter(readFileSync(join(folder, file), "utf8"), path);
      if (data.draft === "true") {
        continue;
      }
      const slug = file.replace(/\.md$/, "");
      articles.push({ language, slug, key: data.translationKey || slug, ...data, body });
    }
  }
  return articles;
}

export function buildArticles({ articles, translations, distDir, siteUrl, defaultLanguage, pathFor, nativeName, typeset, escapeHtml, rtlLanguages, stylesheet }) {
  const textFor = interfaceTexts(translations, defaultLanguage);
  const indexPath = (language) => `${pathFor(language)}articles/`;
  const articlePath = (article) => `${indexPath(article.language)}${article.slug}/`;
  const upTo = (path) => "../".repeat(path.split("/").filter(Boolean).length);
  const languages = [...new Set(articles.map(({ language }) => language))].sort((a, b) => (
    a === defaultLanguage ? -1 : b === defaultLanguage ? 1 : a.localeCompare(b)
  ));
  const sitemapEntries = [];
  const dateText = (date, language) => new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

  function page({ language, path, title, description, alternates, body, structuredData, ogType }) {
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
  <main class="article-page">
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

  function write(path, html) {
    const file = join(distDir, path, "index.html");
    mkdirSync(join(distDir, path), { recursive: true });
    writeFileSync(file, html);
  }

  // Article pages.
  for (const article of articles) {
    const { language } = article;
    const text = textFor(language);
    const path = articlePath(article);
    const root = upTo(path);
    const translations = articles
      .filter((other) => other.key === article.key)
      .sort((a, b) => languages.indexOf(a.language) - languages.indexOf(b.language));
    const alternates = translations.map((other) => [other.language, `${siteUrl}${articlePath(other)}`]);

    let content = marked.parse(article.body);
    content = content.replace(/<(h[2-3])>([\s\S]*?)<\/\1>/g, (match, tag, inner) => `<${tag} id="${slugify(inner)}">${inner}</${tag}>`);
    content = content.replace(/(\s(?:href|src)=")\/(?!\/)/g, `$1${root}`);
    content = content.replace(/<table>/g, '<div class="table-scroll"><table>').replace(/<\/table>/g, "</table></div>");
    content = typesetHtml(content, language, typeset);

    const minutes = readingMinutes(content);
    const lastDate = article.updated || article.date;
    const dates = article.updated && article.updated !== article.date
      ? `<time datetime="${article.date}">${dateText(article.date, language)}</time> · ${escapeHtml(text.updated)} <time datetime="${article.updated}">${dateText(article.updated, language)}</time>`
      : `<time datetime="${article.date}">${dateText(article.date, language)}</time>`;

    const structuredData = [
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
    ];

    write(path, page({
      language,
      path,
      title: article.title,
      description: article.description,
      alternates,
      structuredData,
      ogType: "article",
      body: `    <nav class="breadcrumb" aria-label="${escapeHtml(text.breadcrumb)}">
      <a href="${root}${pathFor(language)}">TabQR</a> <span aria-hidden="true">›</span> <a href="../">${escapeHtml(text.guides)}</a>
    </nav>
    <article>
      <h1>${escapeHtml(typeset(article.title, language))}</h1>
      <p class="updated">${dates} · ${escapeHtml(text.readingTime(minutes))}</p>
      <div class="prose">
${content.trim()}
      </div>
    </article>
    <p class="article-back"><a href="../"><span aria-hidden="true">←</span> ${escapeHtml(text.allGuides)}</a></p>`,
    }));
    sitemapEntries.push({ loc: `${siteUrl}${path}`, alternates: [...alternates, ["x-default", (alternates.find(([l]) => l === defaultLanguage) ?? alternates[0])[1]]] });
  }

  // One index per language: newest first.
  const indexAlternates = languages.map((language) => [language, `${siteUrl}${indexPath(language)}`]);
  for (const language of languages) {
    const text = textFor(language);
    const path = indexPath(language);
    const list = articles
      .filter((article) => article.language === language)
      .sort((a, b) => (b.updated || b.date).localeCompare(a.updated || a.date))
      .map((article) => `      <li>
        <a href="${article.slug}/">
          <span class="article-list-title">${escapeHtml(typeset(article.title, language))}</span>
          <span class="article-list-description">${escapeHtml(typeset(article.description, language))}</span>
          <time datetime="${article.date}">${dateText(article.updated || article.date, language)}</time>
        </a>
      </li>`)
      .join("\n");
    write(path, page({
      language,
      path,
      title: text.indexTitle,
      description: text.indexIntro,
      alternates: indexAlternates,
      ogType: "website",
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
    }));
    sitemapEntries.push({ loc: `${siteUrl}${path}`, alternates: [...indexAlternates, ["x-default", indexAlternates[0][1]]] });
  }

  return { languages, sitemapEntries };
}
