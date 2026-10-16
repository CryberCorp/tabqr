const translations = {
  en: {
    title: "TabQR — QR Code Generator",
    description: "Create and customize QR codes in your browser with TabQR. Free, private and processed locally.",
    eyebrow: "QR CODE GENERATOR",
    intro: "Turn a link or any text into a QR code. Customize it and download it in the format you need.",
    contentLabel: "Content",
    contentPlaceholder: "Paste a link or type any text…",
    usePageUrl: "Use this page’s URL",
    copyContent: "Copy content",
    qrColor: "QR color",
    background: "Background",
    format: "Format",
    yourQr: "Your QR code",
    ready: "LOCAL",
    emptyState: "Enter content to create your QR code.",
    localNote: "Generated locally in your browser. Your content is never sent to a server.",
    download: "Download QR code",
    extensionLabel: "CHROME EXTENSION",
    extensionCopy: "Using the TabQR Chrome extension?",
    extensionPrivacy: "Read the extension privacy policy",
    footerNote: "QR codes, made easy.",
    copied: "Content copied.",
    copyError: "Could not copy the content.",
    generated: "Your QR code is ready.",
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
    intro: "Transformez un lien ou un texte en QR code. Personnalisez-le et téléchargez-le au format souhaité.",
    contentLabel: "Contenu",
    contentPlaceholder: "Collez un lien ou saisissez du texte…",
    usePageUrl: "Utiliser l’adresse de cette page",
    copyContent: "Copier le contenu",
    qrColor: "Couleur du QR",
    background: "Arrière-plan",
    format: "Format",
    yourQr: "Votre QR code",
    ready: "LOCAL",
    emptyState: "Saisissez du contenu pour créer votre QR code.",
    localNote: "Généré localement dans votre navigateur. Votre contenu n’est jamais envoyé à un serveur.",
    download: "Télécharger le QR code",
    extensionLabel: "EXTENSION CHROME",
    extensionCopy: "Vous utilisez l’extension TabQR pour Chrome ?",
    extensionPrivacy: "Lire la politique de confidentialité de l’extension",
    footerNote: "Les QR codes en toute simplicité.",
    copied: "Contenu copié.",
    copyError: "Impossible de copier le contenu.",
    generated: "Votre QR code est prêt.",
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
const usePageUrlButton = document.querySelector("#use-page-url");
let qrMatrix = null;
let updateTimer = 0;
let currentLanguage = "en";

function translatePage(language) {
  currentLanguage = language;
  const messages = translations[language];
  document.documentElement.lang = language;
  document.title = messages.title;
  document.querySelector('meta[name="description"]').content = messages.description;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = messages[element.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = messages[element.dataset.i18nPlaceholder];
  });
  previewCanvas.setAttribute("aria-label", messages.qrPreview);

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });

  if (qrMatrix) {
    status.textContent = messages.generated;
  } else if (!contentInput.value.trim()) {
    status.textContent = messages.inputRequired;
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
  const messages = translations[currentLanguage];
  status.classList.remove("is-error");

  if (!value) {
    qrMatrix = null;
    previewCanvas.hidden = true;
    emptyState.hidden = false;
    status.textContent = messages.inputRequired;
    downloadButton.disabled = true;
    return;
  }

  try {
    const code = qrcode(0, "M");
    code.addData(value);
    code.make();
    qrMatrix = code;
    renderPreview();
    previewCanvas.hidden = false;
    emptyState.hidden = true;
    status.textContent = messages.generated;
    downloadButton.disabled = false;
  } catch {
    qrMatrix = null;
    setError(messages.qrError);
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

function getPageUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}

contentInput.addEventListener("input", () => {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(generateQr, 120);
});

colorInput.addEventListener("input", renderPreview);
backgroundInput.addEventListener("input", renderPreview);

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => translatePage(button.dataset.language));
});

usePageUrlButton.addEventListener("click", () => {
  contentInput.value = getPageUrl();
  generateQr();
});

copyButton.addEventListener("click", async () => {
  if (!contentInput.value.trim()) {
    status.textContent = translations[currentLanguage].inputRequired;
    status.classList.remove("is-error");
    return;
  }

  try {
    await navigator.clipboard.writeText(contentInput.value);
    status.textContent = translations[currentLanguage].copied;
    status.classList.remove("is-error");
  } catch (error) {
    status.textContent = `${translations[currentLanguage].copyError} ${error instanceof Error ? error.message : ""}`.trim();
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
    status.textContent = translations[currentLanguage].downloadSuccess;
  } catch (error) {
    status.textContent = `${translations[currentLanguage].downloadError} ${error instanceof Error ? error.message : ""}`.trim();
    status.classList.add("is-error");
  } finally {
    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
    downloadButton.disabled = !qrMatrix;
  }
});

contentInput.value = getPageUrl();
translatePage("en");
generateQr();
