// Чистая обработка ImageData: характеристики, каналы, выборка пикселя.
// Все функции, зависящие от состава изображения, принимают заранее
// вычисленные `characteristics`, чтобы не сканировать буфер повторно.

import { rgbToLab } from "./color.js";

export const emptyMeta = {
  fileName: "",
  fileSize: 0,
  width: 0,
  height: 0,
  colorDepth: "",
  format: "",
  hasMask: false,
};

export const defaultChannels = {
  gray: true,
  red: true,
  green: true,
  blue: true,
  alpha: true,
};

// Единственный полный проход по пикселям. Результат мемоизируется
// на уровне компонента и передаётся в остальные помощники.
export function getImageCharacteristics(imageData) {
  const { data } = imageData;
  let grayscale = true;
  let alpha = false;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index] !== data[index + 1] || data[index + 1] !== data[index + 2]) {
      grayscale = false;
    }

    if (data[index + 3] < 255) {
      alpha = true;
    }

    if (!grayscale && alpha) {
      break;
    }
  }

  return { grayscale, alpha };
}

export function getImageModeLabel(characteristics) {
  const { grayscale, alpha } = characteristics;

  if (grayscale) {
    return alpha ? "2 канала: Gray + Alpha" : "1 канал: Gray";
  }

  return alpha ? "4 канала: RGB + Alpha" : "3 канала: RGB";
}

export function getChannelDescriptors(characteristics) {
  const { grayscale, alpha } = characteristics;
  const descriptors = grayscale
    ? [{ id: "gray", label: "Gray" }]
    : [
        { id: "red", label: "Red" },
        { id: "green", label: "Green" },
        { id: "blue", label: "Blue" },
      ];

  if (alpha) {
    descriptors.push({ id: "alpha", label: "Alpha" });
  }

  return descriptors;
}

export function normalizeChannels(characteristics, nextChannels) {
  if (!characteristics) {
    return defaultChannels;
  }

  const available = new Set(
    getChannelDescriptors(characteristics).map((descriptor) => descriptor.id),
  );

  return {
    gray: available.has("gray") ? nextChannels.gray : false,
    red: available.has("red") ? nextChannels.red : false,
    green: available.has("green") ? nextChannels.green : false,
    blue: available.has("blue") ? nextChannels.blue : false,
    alpha: available.has("alpha") ? nextChannels.alpha : false,
  };
}

export function composeVisibleImageData(source, characteristics, channelState) {
  const next = new Uint8ClampedArray(source.data);
  const { grayscale, alpha } = characteristics;
  const hasVisibleColor = grayscale
    ? channelState.gray
    : channelState.red || channelState.green || channelState.blue;
  const showOnlyAlpha = alpha && channelState.alpha && !hasVisibleColor;

  for (let index = 0; index < next.length; index += 4) {
    const red = source.data[index];
    const green = source.data[index + 1];
    const blue = source.data[index + 2];
    const sourceAlpha = source.data[index + 3];

    if (showOnlyAlpha) {
      next[index] = sourceAlpha;
      next[index + 1] = sourceAlpha;
      next[index + 2] = sourceAlpha;
      next[index + 3] = 255;
      continue;
    }

    if (grayscale) {
      const gray = channelState.gray ? red : 0;
      next[index] = gray;
      next[index + 1] = gray;
      next[index + 2] = gray;
    } else {
      next[index] = channelState.red ? red : 0;
      next[index + 1] = channelState.green ? green : 0;
      next[index + 2] = channelState.blue ? blue : 0;
    }

    next[index + 3] = alpha && channelState.alpha ? sourceAlpha : 255;
  }

  return new ImageData(next, source.width, source.height);
}

export function samplePixel(imageData, x, y) {
  const index = (y * imageData.width + x) * 4;
  const red = imageData.data[index];
  const green = imageData.data[index + 1];
  const blue = imageData.data[index + 2];

  return { x, y, r: red, g: green, b: blue, lab: rgbToLab(red, green, blue) };
}
