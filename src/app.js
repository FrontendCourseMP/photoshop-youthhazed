import { decodeGb7, encodeGb7 } from "./gb7.js";

const fileInput = document.querySelector("#fileInput");
const canvas = document.querySelector("#canvas");
const context = canvas.getContext("2d", { willReadFrequently: true });
const dropZone = document.querySelector("#dropZone");
const statusText = document.querySelector("#status");
const imageInfo = document.querySelector("#imageInfo");
const fileName = document.querySelector("#fileName");
const fileFormat = document.querySelector("#fileFormat");
const fileSize = document.querySelector("#fileSize");
const savePng = document.querySelector("#savePng");
const saveJpg = document.querySelector("#saveJpg");
const saveGb7 = document.querySelector("#saveGb7");

let currentFileBaseName = "image";
let currentMeta = null;

fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;

  if (file) {
    openFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");

  const [file] = event.dataTransfer.files;

  if (file) {
    openFile(file);
  }
});

savePng.addEventListener("click", () => saveCanvasImage("image/png", "png"));
saveJpg.addEventListener("click", () => saveCanvasImage("image/jpeg", "jpg"));
saveGb7.addEventListener("click", saveGb7Image);

async function openFile(file) {
  try {
    setStatus("Загрузка изображения...");
    const detectedFormat = getFileFormat(file);
    currentFileBaseName = getBaseName(file.name);

    if (detectedFormat === "GB7") {
      await openGb7(file);
    } else if (detectedFormat === "PNG" || detectedFormat === "JPG") {
      await openBrowserImage(file, detectedFormat);
    } else {
      throw new Error("Поддерживаются только PNG, JPG и GB7.");
    }

    updateFileMeta(file, currentMeta);
    setControlsEnabled(true);
    dropZone.classList.add("has-image");
    setStatus("Изображение загружено.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    fileInput.value = "";
  }
}

async function openGb7(file) {
  const buffer = await file.arrayBuffer();
  const { imageData, meta } = decodeGb7(buffer);

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  context.putImageData(imageData, 0, 0);
  currentMeta = meta;
  updateStatusbar(meta);
}

async function openBrowserImage(file, format) {
  const image = await createImageBitmap(file);

  canvas.width = image.width;
  canvas.height = image.height;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  image.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const colorDepth = hasAlpha(imageData.data) ? 32 : 24;

  currentMeta = {
    width: canvas.width,
    height: canvas.height,
    colorDepth,
    format,
    hasMask: colorDepth === 32,
  };
  updateStatusbar(currentMeta);
}

function saveCanvasImage(type, extension) {
  if (!currentMeta) {
    return;
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        setStatus("Не удалось подготовить файл для скачивания.", true);
        return;
      }

      downloadBlob(blob, `${currentFileBaseName}.${extension}`);
      setStatus(`Сохранено как ${extension.toUpperCase()}.`);
    },
    type,
    extension === "jpg" ? 0.92 : undefined,
  );
}

function saveGb7Image() {
  if (!currentMeta) {
    return;
  }

  try {
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const blob = encodeGb7(imageData);

    downloadBlob(blob, `${currentFileBaseName}.gb7`);
    setStatus("Сохранено как GB7.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function downloadBlob(blob, fileNameValue) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileNameValue;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateFileMeta(file, meta) {
  fileName.textContent = file.name;
  fileFormat.textContent = meta.format;
  fileSize.textContent = formatBytes(file.size);
}

function updateStatusbar(meta) {
  imageInfo.textContent = `Ширина: ${meta.width}px | Высота: ${meta.height}px | Глубина цвета: ${meta.colorDepth} бит`;
}

function setControlsEnabled(enabled) {
  savePng.disabled = !enabled;
  saveJpg.disabled = !enabled;
  saveGb7.disabled = !enabled;
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function getFileFormat(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".gb7")) {
    return "GB7";
  }

  if (file.type === "image/png" || name.endsWith(".png")) {
    return "PNG";
  }

  if (file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) {
    return "JPG";
  }

  return null;
}

function getBaseName(name) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} Б`;
  }

  const units = ["КБ", "МБ", "ГБ"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function hasAlpha(data) {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}
