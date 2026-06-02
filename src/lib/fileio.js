// Файловый ввод/вывод: определение формата, загрузка, сохранение, скачивание.

import { decodeGb7, encodeGb7 } from "./gb7.js";

export function getFileFormat(file) {
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

export function getBaseName(name) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

export function formatBytes(bytes) {
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

// Загружает файл в ImageData и собирает метаданные. Бросает понятную
// ошибку при неподдерживаемом формате.
export async function loadImageFile(file) {
  const format = getFileFormat(file);

  if (!format) {
    throw new Error("Поддерживаются только PNG, JPG и GB7.");
  }

  const payload = format === "GB7" ? loadGb7(file) : loadBrowserImage(file, format);
  const { imageData, meta } = await payload;

  return {
    imageData,
    meta: {
      fileName: getBaseName(file.name),
      fileSize: file.size,
      width: meta.width,
      height: meta.height,
      colorDepth: `${meta.colorDepth} бит`,
      format: meta.format,
      hasMask: meta.hasMask,
    },
  };
}

// Кодирует и скачивает изображение в выбранном формате.
export async function saveImageFile(imageData, format, baseName) {
  const fileName = baseName || "image";

  if (format === "GB7") {
    downloadBlob(encodeGb7(imageData), `${fileName}.gb7`);
    return;
  }

  const type = format === "PNG" ? "image/png" : "image/jpeg";
  const blob = await imageDataToBlob(imageData, type);
  downloadBlob(blob, `${fileName}.${format.toLowerCase()}`);
}

async function loadGb7(file) {
  return decodeGb7(await file.arrayBuffer());
}

async function loadBrowserImage(file, format) {
  const image = await createImageBitmap(file);
  const buffer = document.createElement("canvas");
  buffer.width = image.width;
  buffer.height = image.height;
  const context = buffer.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  image.close();

  const imageData = context.getImageData(0, 0, buffer.width, buffer.height);
  const hasMask = hasAlpha(imageData.data);

  return {
    imageData,
    meta: {
      width: imageData.width,
      height: imageData.height,
      colorDepth: hasMask ? 32 : 24,
      format,
      hasMask,
    },
  };
}

function hasAlpha(data) {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}

function imageDataToBlob(imageData, type) {
  const buffer = document.createElement("canvas");
  buffer.width = imageData.width;
  buffer.height = imageData.height;
  buffer.getContext("2d").putImageData(imageData, 0, 0);

  return new Promise((resolve, reject) => {
    buffer.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Не удалось подготовить файл для скачивания."));
        }
      },
      type,
      type === "image/jpeg" ? 0.92 : undefined,
    );
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
