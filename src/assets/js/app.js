const contentInput = document.querySelector("#qr-content");
const previewCanvas = document.querySelector("#qr-preview");
const previewContext = previewCanvas.getContext("2d");
const emptyState = document.querySelector("#empty-state");
const status = document.querySelector("#status");
const colorInput = document.querySelector("#qr-color");
const backgroundInput = document.querySelector("#qr-background");
const formatInput = document.querySelector("#qr-format");
const downloadButton = document.querySelector("#download-qr");
const copyButton = document.querySelector("#copy-content");
const readyDot = document.querySelector(".ready-badge .privacy-dot");
const pasteButton = document.querySelector("#paste-content");
const clearButton = document.querySelector("#clear-content");
const languageMenu = document.querySelector(".language-menu");
const installButton = document.querySelector("#install-app");
const installDialog = document.querySelector("#install-dialog");
const languageNotice = document.querySelector("#language-notice");
let installPrompt = null;
let qrMatrix = null;
let qrKind = "text";
let updateTimer = 0;
const defaultLanguage = "en";
// Each language has its own static page; its <html> says which one it is.
const currentLanguage = translations[document.documentElement.lang] ? document.documentElement.lang : defaultLanguage;
const siteRoot = document.documentElement.dataset.root ?? "./";

// Missing keys fall back to English, then to the key itself.
// Texts get non-breaking spaces so short words never end a line.
function t(key, language = currentLanguage) {
  const text = translations[language]?.[key] ?? translations[defaultLanguage][key] ?? key;
  return typeset(text, language);
}

const preferencesKey = "tabqr-preferences";
const contentKey = "tabqr-content";
const exampleContents = [
  "https://example.com",
  "demo@example.com",
  "+33 6 12 34 56 78",
  "Hello from TabQR!",
];
const emailPattern = /^[^\s@:]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+0(][\d\s().-]+$/;
const schemePattern = /^[a-z][a-z0-9+.-]*:/i;
const bareUrlPattern = /^(?:www\.[^\s/]+\.[a-z]{2,}|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|fr|be|ch|ca|de|eu|uk|io|co|app|dev|info|me|shop|store|site|online|tech|xyz))(?::\d+)?(?:[/?#]\S*)?$/i;

// Prefixes emails, phone numbers and bare domains so scanners act on them.
function encodeContent(value) {
  if (emailPattern.test(value)) {
    return { data: `mailto:${value}`, kind: "email" };
  }
  if (schemePattern.test(value)) {
    const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
    const kind = { http: "url", https: "url", mailto: "email", tel: "phone" }[scheme] ?? "text";
    return { data: value, kind };
  }
  const digits = value.replace(/\D/g, "");
  if (phonePattern.test(value) && digits.length >= 8 && digits.length <= 15) {
    return { data: `tel:${value.startsWith("+") ? "+" : ""}${digits}`, kind: "phone" };
  }
  if (bareUrlPattern.test(value)) {
    return { data: `https://${value}`, kind: "url" };
  }
  return { data: value, kind: "text" };
}

function loadContent() {
  let saved = null;
  try {
    saved = window.localStorage.getItem(contentKey);
  } catch {
    // Storage unavailable: fall back to an example.
  }
  contentInput.value = saved ?? exampleContents[Math.floor(Math.random() * exampleContents.length)];
}

function saveContent() {
  try {
    window.localStorage.setItem(contentKey, contentInput.value);
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
}

function generatedMessage() {
  return t({
    url: "generatedUrl",
    email: "generatedEmail",
    phone: "generatedPhone",
  }[qrKind] ?? "generated");
}

const hexColorPattern = /^#[0-9a-f]{6}$/i;

function loadPreferences() {
  let preferences;
  try {
    preferences = JSON.parse(window.localStorage.getItem(preferencesKey) || "{}");
  } catch {
    return;
  }
  if (!preferences || typeof preferences !== "object") {
    return;
  }

  if (hexColorPattern.test(preferences.color)) {
    colorInput.value = preferences.color;
  }
  if (hexColorPattern.test(preferences.background)) {
    backgroundInput.value = preferences.background;
  }
  if ([...formatInput.options].some((option) => option.value === preferences.format)) {
    formatInput.value = preferences.format;
  }
}

function savePreferences() {
  try {
    window.localStorage.setItem(preferencesKey, JSON.stringify({
      color: colorInput.value,
      background: backgroundInput.value,
      format: formatInput.value,
    }));
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
}

function drawQr(context, matrix, size, foreground, background) {
  const moduleCount = matrix.getModuleCount();
  const moduleSize = Math.floor(size / (moduleCount + 8));
  const qrSize = moduleCount * moduleSize;
  const offset = Math.floor((size - qrSize) / 2);

  context.fillStyle = background;
  context.fillRect(0, 0, size, size);
  context.fillStyle = foreground;
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (matrix.isDark(row, column)) {
        context.fillRect(
          offset + column * moduleSize,
          offset + row * moduleSize,
          moduleSize,
          moduleSize,
        );
      }
    }
  }
}

function renderPreview() {
  if (!qrMatrix) {
    return;
  }
  drawQr(previewContext, qrMatrix, previewCanvas.width, colorInput.value, backgroundInput.value);
}

function setError(message) {
  status.textContent = message;
  status.classList.add("is-error");
  previewCanvas.hidden = true;
  emptyState.hidden = false;
  downloadButton.disabled = true;
}

function replayAnimation(element) {
  element.classList.remove("is-revealing");
  void element.offsetWidth;
  element.classList.add("is-revealing");
}

// The LOCAL light blinks when a code is ready, when a button or an option
// (colours, format) is used, and now and then on its own (every 6 to 14
// seconds, only while the page is visible), like a device at work.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function blinkLater() {
  window.setTimeout(() => {
    if (!document.hidden && !reducedMotion.matches) {
      replayAnimation(readyDot);
    }
    blinkLater();
  }, 6000 + Math.random() * 8000);
}
blinkLater();

document.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) {
    replayAnimation(readyDot);
  }
});

for (const option of [colorInput, backgroundInput, formatInput]) {
  option.addEventListener("change", () => replayAnimation(readyDot));
}

// A new code is drawn in a few steps, top to bottom. Not while typing: only
// when the content changed after a pause.
let lastGenerated = 0;
function revealQr() {
  const now = performance.now();
  const paused = now - lastGenerated > 600;
  lastGenerated = now;
  if (paused) {
    replayAnimation(previewCanvas);
    replayAnimation(readyDot);
  }
}

// Briefly swaps a button's icon for a check mark once its action succeeded.
const checkIcon = '<path d="M5 12.5l4.5 4.5L19 7.5"/>';
function confirmAction(button) {
  const icon = button.querySelector("svg");
  icon.dataset.icon ??= icon.innerHTML;
  icon.innerHTML = checkIcon;
  window.clearTimeout(button.confirmTimer);
  button.confirmTimer = window.setTimeout(() => {
    icon.innerHTML = icon.dataset.icon;
  }, 1200);
}

function generateQr() {
  const value = contentInput.value.trim();
  status.classList.remove("is-error");

  if (!value) {
    qrMatrix = null;
    previewCanvas.hidden = true;
    emptyState.hidden = false;
    status.textContent = t("inputRequired");
    downloadButton.disabled = true;
    return;
  }

  try {
    const encoded = encodeContent(value);
    const code = qrcode(0, "M");
    code.addData(encoded.data);
    code.make();
    qrMatrix = code;
    qrKind = encoded.kind;
    renderPreview();
    previewCanvas.hidden = false;
    emptyState.hidden = true;
    revealQr();
    status.textContent = generatedMessage();
    downloadButton.disabled = false;
  } catch {
    qrMatrix = null;
    setError(t("qrError"));
  }
}

function canvasToBlob(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== mimeType) {
        reject(new Error("Image encoding is not supported."));
        return;
      }
      resolve(blob);
    }, mimeType, 1);
  });
}

function createSvg(matrix, size, foreground, background) {
  const moduleCount = matrix.getModuleCount();
  const moduleSize = Math.floor(size / (moduleCount + 8));
  const offset = Math.floor((size - moduleCount * moduleSize) / 2);
  const modules = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (matrix.isDark(row, column)) {
        modules.push(`<rect x="${offset + column * moduleSize}" y="${offset + row * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${background}"/><g fill="${foreground}">${modules.join("")}</g></svg>`;
}

contentInput.addEventListener("input", () => {
  saveContent();
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(generateQr, 120);
});

colorInput.addEventListener("input", renderPreview);
backgroundInput.addEventListener("input", renderPreview);
colorInput.addEventListener("change", savePreferences);
backgroundInput.addEventListener("change", savePreferences);
formatInput.addEventListener("change", savePreferences);

function openLanguage(language) {
  const url = TabQRLanguage.urlFor(language);
  if (url) {
    TabQRLanguage.save(language);
    window.location.href = url;
  }
}

// Language menu: remember the choice so the root page opens in it next time.
languageMenu.querySelectorAll("a[hreflang]").forEach((link) => {
  link.addEventListener("click", () => TabQRLanguage.save(link.hreflang));
});

// Footer menus ("More", languages): one open at a time; a click outside or
// Escape closes them.
const footerMenus = [...document.querySelectorAll(".footer-menu")];
for (const menu of footerMenus) {
  menu.addEventListener("toggle", () => {
    if (menu.open) {
      footerMenus.filter((other) => other !== menu).forEach((other) => { other.open = false; });
    }
  });
}
document.addEventListener("click", (event) => {
  footerMenus
    .filter((menu) => menu.open && !menu.contains(event.target))
    .forEach((menu) => { menu.open = false; });
});
document.addEventListener("keydown", (event) => {
  const openMenu = footerMenus.find((menu) => menu.open);
  if (event.key === "Escape" && openMenu) {
    openMenu.open = false;
    openMenu.querySelector("summary").focus();
  }
});

// First visit on the root page: suggest the browser's language, in that
// language, instead of redirecting (see language.js). Closing it keeps English.
function suggestLanguage() {
  const language = TabQRLanguage.browserLanguage();
  if (!TabQRLanguage.isRoot || TabQRLanguage.saved() || !language || language === currentLanguage) {
    return;
  }
  const text = languageNotice.querySelector("#language-notice-text");
  const link = languageNotice.querySelector("#language-notice-link");
  const close = languageNotice.querySelector("#language-notice-close");
  languageNotice.lang = language;
  languageNotice.dir = /^(ar|fa|he|ur)\b/.test(language) ? "rtl" : "ltr";
  text.textContent = t("languageAvailable", language);
  link.textContent = t("languageSwitch", language);
  link.href = TabQRLanguage.urlFor(language);
  close.setAttribute("aria-label", t("close", language));
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openLanguage(language);
  });
  close.addEventListener("click", () => {
    TabQRLanguage.save(currentLanguage);
    languageNotice.hidden = true;
  });
  languageNotice.hidden = false;
}

pasteButton.addEventListener("click", async () => {
  pasteButton.disabled = true;
  status.classList.remove("is-error");
  status.textContent = t("pasteReading");

  try {
    if (!navigator.clipboard?.readText) {
      throw new Error("Clipboard reading is not available in this browser.");
    }

    const clipboardText = await navigator.clipboard.readText();
    if (!clipboardText.trim()) {
      status.textContent = t("pasteEmpty");
      return;
    }

    contentInput.value = clipboardText;
    saveContent();
    generateQr();
    status.textContent = t("pasted");
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    status.textContent = `${t("pasteError")}${detail}`;
    status.classList.add("is-error");
  } finally {
    pasteButton.disabled = false;
  }
});

clearButton.addEventListener("click", () => {
  window.clearTimeout(updateTimer);
  contentInput.value = "";
  saveContent();
  generateQr();
  status.textContent = t("cleared");
  contentInput.focus();
});

copyButton.addEventListener("click", async () => {
  if (!contentInput.value.trim()) {
    status.textContent = t("inputRequired");
    status.classList.remove("is-error");
    return;
  }

  try {
    await navigator.clipboard.writeText(contentInput.value);
    status.textContent = t("copied");
    status.classList.remove("is-error");
    confirmAction(copyButton);
  } catch (error) {
    status.textContent = `${t("copyError")} ${error instanceof Error ? error.message : ""}`.trim();
    status.classList.add("is-error");
  }
});

downloadButton.addEventListener("click", async () => {
  if (!qrMatrix) {
    return;
  }

  downloadButton.disabled = true;
  status.classList.remove("is-error");
  let objectUrl = "";

  try {
    const size = 1080;
    const format = formatInput.value;
    let blob;

    if (format === "svg") {
      blob = new Blob(
        [createSvg(qrMatrix, size, colorInput.value, backgroundInput.value)],
        { type: "image/svg+xml" },
      );
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not create an image canvas.");
      }
      drawQr(context, qrMatrix, size, colorInput.value, backgroundInput.value);
      const mimeType = {
        png: "image/png",
        webp: "image/webp",
        jpeg: "image/jpeg",
      }[format];
      blob = await canvasToBlob(canvas, mimeType);
    }

    objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `tabqr-code.${format}`;
    anchor.click();
    status.textContent = t("downloadSuccess");
    confirmAction(downloadButton);
  } catch (error) {
    status.textContent = `${t("downloadError")} ${error instanceof Error ? error.message : ""}`.trim();
    status.classList.add("is-error");
  } finally {
    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    downloadButton.disabled = !qrMatrix;
  }
});

// "Install extension" button: only on desktop Google Chrome, Microsoft Edge
// and Brave, which install Chrome Web Store extensions in one or two clicks
// (Edge asks once to allow other stores). Opera needs an extra add-on first,
// and mobile browsers cannot install extensions, so they never see it.
// Browsers without User-Agent Client Hints (Safari, Firefox) are excluded too.
function canInstallChromeExtension() {
  const hints = navigator.userAgentData;
  if (!hints || hints.mobile || /Android|iOS/i.test(hints.platform)) {
    return false;
  }
  const brands = hints.brands.map(({ brand }) => brand);
  return Boolean(navigator.brave)
    || brands.some((brand) => ["Google Chrome", "Microsoft Edge", "Brave"].includes(brand));
}

const extensionButton = document.querySelector("#install-extension");
if (extensionButton.getAttribute("href") !== "#" && canInstallChromeExtension()) {
  extensionButton.hidden = false;
}

// Installing the app (PWA).
// - Browsers with a native install prompt (Chrome, Edge, Samsung Internet,
//   Opera, Brave… on Android and desktop) fire beforeinstallprompt: the button
//   opens that prompt directly, in one click.
// - Everywhere else (iPhone/iPad, where Apple offers no install API in any
//   browser; Safari on Mac; Firefox) the button opens a guide with the steps
//   for the detected device, which the visitor can switch by hand.
// - In-app browsers (Instagram, Facebook…) cannot install: the guide says to
//   open the page in the real browser first.
// - Once installed (running as an app), the button is hidden.
const installedDisplayModes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];
const isInstalled = navigator.standalone === true
  || installedDisplayModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
const installTabs = [...installDialog.querySelectorAll('[role="tab"]')];

function detectPlatform() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(ua)) {
    return "android";
  }
  return /Macintosh/.test(ua) ? "mac" : "desktop";
}

function selectInstallTab(platform, focus = false) {
  for (const tab of installTabs) {
    const selected = tab.dataset.platform === platform;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    installDialog.querySelector(`#${tab.getAttribute("aria-controls")}`).hidden = !selected;
    if (selected && focus) {
      tab.focus();
    }
  }
}

function openInstallGuide() {
  selectInstallTab(detectPlatform());
  installDialog.querySelector("#install-in-app").hidden = !/FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|Snapchat|LinkedInApp|Line\//.test(navigator.userAgent);
  installDialog.querySelector("#install-now").hidden = !installPrompt;
  installDialog.showModal();
}

async function promptInstall() {
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  // A prompt can only be shown once; Chrome fires a new event if declined.
  installPrompt = null;
  installDialog.querySelector("#install-now").hidden = true;
  if (outcome === "accepted") {
    installButton.hidden = true;
    installDialog.close();
  }
}

installButton.hidden = isInstalled;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  installDialog.querySelector("#install-now").hidden = false;
});

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  installButton.hidden = true;
  installDialog.close();
});

installButton.addEventListener("click", () => (installPrompt ? promptInstall() : openInstallGuide()));
installDialog.querySelector("#install-now").addEventListener("click", promptInstall);
installDialog.querySelector("#install-dialog-close").addEventListener("click", () => installDialog.close());
// A click on the backdrop (outside the dialog box) closes it.
installDialog.addEventListener("click", (event) => {
  if (event.target === installDialog) {
    installDialog.close();
  }
});

for (const tab of installTabs) {
  tab.addEventListener("click", () => selectInstallTab(tab.dataset.platform));
  tab.addEventListener("keydown", (event) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const direction = document.documentElement.dir === "rtl" && /Left|Right/.test(event.key) ? -step : step;
    const next = installTabs[(installTabs.indexOf(tab) + direction + installTabs.length) % installTabs.length];
    selectInstallTab(next.dataset.platform, true);
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${siteRoot}sw.js`).catch(() => {
      // Offline support is optional: the site works without it.
    });
  });
}

suggestLanguage();
loadPreferences();
loadContent();
generateQr();
