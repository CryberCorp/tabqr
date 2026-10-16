const translations = {
  en: {
    title: "TabQR — QR Code Generator",
    description: "Create and customize QR codes in your browser with TabQR. Free, private and processed locally.",
    eyebrow: "QR CODE GENERATOR",
    titleLine1: "Create a QR code.",
    titleLine2: "Keep it simple.",
    intro: "Turn a link or any text into a QR code. Customize it and download it in the format you need.",
    contentLabel: "Content",
    contentPlaceholder: "Paste a link or type any text…",
    pasteContent: "Paste from clipboard",
    copyContent: "Copy content",
    clearContent: "Clear",
    cleared: "Content cleared.",
    qrColor: "QR color",
    background: "Background",
    format: "Format",
    yourQr: "Your QR code",
    ready: "LOCAL",
    emptyState: "Enter content to create your QR code.",
    localNote: "Generated in your browser, without ever sending your content to a server.",
    download: "Download QR code",
    extensionPrivacy: "Extension privacy",
    storeComingSoon: "Coming soon",
    storeLabel: "Chrome Web Store — coming soon",
    footerNote: "QR codes, made easy.",
    copied: "Content copied.",
    copyError: "Could not copy the content.",
    pasteReading: "Reading clipboard…",
    pasted: "Content pasted from clipboard.",
    pasteEmpty: "Your clipboard is empty.",
    pasteError: "Could not read the clipboard. Allow clipboard access and try again.",
    generated: "Your QR code is ready.",
    generatedUrl: "Website detected: scanning will open this link.",
    generatedEmail: "Email address detected: scanning will start a new email.",
    generatedPhone: "Phone number detected: scanning will call this number.",
    inputRequired: "Enter some text or a link to create a QR code.",
    qrError: "This content could not be encoded. Try using less text.",
    downloadSuccess: "QR code downloaded.",
    downloadError: "The selected image format is not supported by this browser.",
    qrPreview: "Generated QR code",
  },
  fr: {
    title: "TabQR — Générateur de QR code",
    description: "Créez et personnalisez des QR codes dans votre navigateur avec TabQR. Gratuit, privé et traité localement.",
    eyebrow: "GÉNÉRATEUR DE QR CODE",
    titleLine1: "Créez vos QR codes.",
    titleLine2: "En toute simplicité.",
    intro: "Transformez un lien ou un texte en QR code. Personnalisez-le et téléchargez-le au format souhaité.",
    contentLabel: "Contenu",
    contentPlaceholder: "Collez un lien ou saisissez du texte…",
    pasteContent: "Coller depuis le presse-papiers",
    copyContent: "Copier le contenu",
    clearContent: "Effacer",
    cleared: "Contenu effacé.",
    qrColor: "Couleur du QR",
    background: "Arrière-plan",
    format: "Format",
    yourQr: "Votre QR code",
    ready: "LOCAL",
    emptyState: "Saisissez du contenu pour créer votre QR code.",
    localNote: "Généré dans votre navigateur, sans jamais envoyer votre contenu à un serveur.",
    download: "Télécharger le QR code",
    extensionPrivacy: "Confidentialité de l’extension",
    storeComingSoon: "Bientôt",
    storeLabel: "Chrome Web Store — bientôt disponible",
    footerNote: "Les QR codes en toute simplicité.",
    copied: "Contenu copié.",
    copyError: "Impossible de copier le contenu.",
    pasteReading: "Lecture du presse-papiers…",
    pasted: "Contenu collé depuis le presse-papiers.",
    pasteEmpty: "Le presse-papiers est vide.",
    pasteError: "Impossible de lire le presse-papiers. Autorisez son accès puis réessayez.",
    generated: "Votre QR code est prêt.",
    generatedUrl: "Site web détecté : le scan ouvrira ce lien.",
    generatedEmail: "Adresse e-mail détectée : le scan ouvrira un nouvel e-mail.",
    generatedPhone: "Numéro de téléphone détecté : le scan appellera ce numéro.",
    inputRequired: "Saisissez du texte ou un lien pour créer un QR code.",
    qrError: "Ce contenu n’a pas pu être encodé. Essayez avec moins de texte.",
    downloadSuccess: "QR code téléchargé.",
    downloadError: "Ce format d’image n’est pas pris en charge par ce navigateur.",
    qrPreview: "QR code généré",
  },
};

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
const pasteButton = document.querySelector("#paste-content");
const clearButton = document.querySelector("#clear-content");
let qrMatrix = null;
let qrKind = "text";
let updateTimer = 0;
const defaultLanguage = "en";
const languageKey = "tabqr-language";
const rtlLanguages = new Set(["ar", "fa", "he", "ur"]);
const supportedLanguages = Object.keys(translations);
let currentLanguage = defaultLanguage;

// Missing keys fall back to English, then to the key itself.
function t(key) {
  return translations[currentLanguage]?.[key] ?? translations[defaultLanguage][key] ?? key;
}

// Matches "pt-BR" / "pt_BR" to "pt-BR", then "pt", among supported languages.
function matchLanguage(code) {
  if (typeof code !== "string" || !code) {
    return null;
  }
  const normalized = code.replace("_", "-").toLowerCase();
  const base = normalized.split("-")[0];
  return supportedLanguages.find((language) => language.toLowerCase() === normalized)
    ?? supportedLanguages.find((language) => language.toLowerCase() === base)
    ?? null;
}

function detectLanguage() {
  let saved = null;
  try {
    saved = window.localStorage.getItem(languageKey);
  } catch {
    // Storage unavailable: use the browser languages.
  }
  const candidates = [saved, ...(navigator.languages ?? []), navigator.language];
  for (const candidate of candidates) {
    const language = matchLanguage(candidate);
    if (language) {
      return language;
    }
  }
  return defaultLanguage;
}

function saveLanguage(language) {
  try {
    window.localStorage.setItem(languageKey, language);
  } catch {
    // Storage may be unavailable (private mode, blocked site data).
  }
}

function buildLanguageSwitch() {
  const languageSwitch = document.querySelector(".language-switch");
  languageSwitch.replaceChildren(...supportedLanguages.map((language) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.language = language;
    button.textContent = language.toUpperCase();
    try {
      const displayNames = new Intl.DisplayNames([language], { type: "language" });
      button.title = displayNames.of(language);
      button.lang = language;
    } catch {
      // Intl.DisplayNames unsupported: keep the code only.
    }
    button.addEventListener("click", () => {
      saveLanguage(language);
      translatePage(language);
    });
    return button;
  }));
}

const nonbreakingWordPatterns = {
  en: /(^|[^\p{L}])(a|an|the|and|or|of|to|in|on|at|by|for|as|you)\s+(?=\p{L})/giu,
  fr: /(^|[^\p{L}])(a|à|y|de|du|des|le|la|les|un|une|et|ou|en|au|aux|ce|ces)\s+(?=\p{L})/giu,
};

function keepShortWordsWithNext(text, language) {
  const pattern = nonbreakingWordPatterns[language];
  return pattern ? text.replace(pattern, "$1$2\u00a0") : text;
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

function translatePage(language) {
  currentLanguage = matchLanguage(language) ?? defaultLanguage;
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = rtlLanguages.has(currentLanguage.split("-")[0]) ? "rtl" : "ltr";
  document.title = t("title");
  document.querySelector('meta[name="description"]').content = t("description");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    const text = t(key);
    element.textContent = key === "intro" ? keepShortWordsWithNext(text, currentLanguage) : text;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  previewCanvas.setAttribute("aria-label", t("qrPreview"));

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  });

  if (qrMatrix) {
    status.textContent = generatedMessage();
  } else if (!contentInput.value.trim()) {
    status.textContent = t("inputRequired");
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

loadPreferences();
loadContent();
buildLanguageSwitch();
translatePage(detectLanguage());
generateQr();
