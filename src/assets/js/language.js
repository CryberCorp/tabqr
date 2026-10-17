// Language choice, loaded in <head> after the hreflang links it reads.
//
// Search engine rules (Google, multilingual sites): never redirect visitors
// based on a guessed language. So only a language the visitor picked
// themselves sends the root page to that language, before anything renders.
// Their browser language only gets a suggestion (see app.js), and language
// pages never redirect: shared links and search results open as they are.
window.TabQRLanguage = (() => {
  const storageKey = "tabqr-language";
  const pages = [...document.querySelectorAll('link[rel="alternate"][hreflang]')]
    .filter((link) => link.hreflang !== "x-default");
  const languages = pages.map((link) => link.hreflang);
  const aliases = { nb: "no", nn: "no", "zh-hant": "zh-TW", "zh-hk": "zh-TW", "zh-mo": "zh-TW" };

  // Matches "pt-BR" / "pt_BR" to "pt-BR", then "pt", among the available pages.
  function match(code) {
    if (typeof code !== "string" || !code) {
      return null;
    }
    const normalized = code.replace("_", "-").toLowerCase();
    const base = normalized.split("-")[0];
    const alias = aliases[normalized] ?? aliases[normalized.split("-").slice(0, 2).join("-")] ?? aliases[base];
    return languages.find((language) => language.toLowerCase() === normalized)
      ?? (alias && languages.includes(alias) ? alias : null)
      ?? languages.find((language) => language.toLowerCase() === base)
      ?? languages.find((language) => language.toLowerCase().startsWith(`${base}-`))
      ?? null;
  }

  function saved() {
    try {
      return match(window.localStorage.getItem(storageKey));
    } catch {
      return null;
    }
  }

  function save(language) {
    try {
      window.localStorage.setItem(storageKey, language);
    } catch {
      // Storage may be unavailable (private mode, blocked site data).
    }
  }

  function browserLanguage() {
    return [...(navigator.languages ?? []), navigator.language].map(match).find(Boolean) ?? null;
  }

  // Relative URL of a language's page from the current page.
  function urlFor(language) {
    const page = pages.find((link) => link.hreflang === language);
    return page ? `${document.documentElement.dataset.root ?? "./"}${page.dataset.path}` : null;
  }

  const isRoot = document.documentElement.dataset.root === "./";
  const choice = saved();
  if (isRoot && choice && choice !== document.documentElement.lang) {
    window.location.replace(urlFor(choice));
  }

  return { isRoot, match, saved, save, browserLanguage, urlFor };
})();
