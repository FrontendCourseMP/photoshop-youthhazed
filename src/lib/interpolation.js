// Двумерная интерполяция при масштабировании. Реестр методов сделан
// расширяемым: чтобы добавить новый алгоритм, достаточно добавить запись
// в INTERPOLATIONS с функцией resample(source, dstWidth, dstHeight).

export const DEFAULT_INTERPOLATION = "bilinear";

// Метод ближайшего соседа: каждый пиксель результата берётся из
// ближайшего пикселя источника. Быстрый, без сглаживания, сохраняет
// резкие края (подходит для пиксель-арта).
function resampleNearest(source, dstWidth, dstHeight) {
  const { width: srcWidth, height: srcHeight, data: src } = source;
  const out = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;

  for (let y = 0; y < dstHeight; y += 1) {
    const srcY = Math.min(srcHeight - 1, Math.floor(y * yRatio));
    for (let x = 0; x < dstWidth; x += 1) {
      const srcX = Math.min(srcWidth - 1, Math.floor(x * xRatio));
      const srcIndex = (srcY * srcWidth + srcX) * 4;
      const dstIndex = (y * dstWidth + x) * 4;
      out[dstIndex] = src[srcIndex];
      out[dstIndex + 1] = src[srcIndex + 1];
      out[dstIndex + 2] = src[srcIndex + 2];
      out[dstIndex + 3] = src[srcIndex + 3];
    }
  }

  return new ImageData(out, dstWidth, dstHeight);
}

// Билинейная интерполяция: результат — взвешенное среднее четырёх
// ближайших пикселей. Даёт гладкие переходы, мягче края.
// Центры пикселей выравниваются по формуле (i + 0.5) * ratio - 0.5.
function resampleBilinear(source, dstWidth, dstHeight) {
  const { width: srcWidth, height: srcHeight, data: src } = source;
  const out = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;
  const clamp = (value, max) => (value < 0 ? 0 : value > max ? max : value);

  for (let y = 0; y < dstHeight; y += 1) {
    const fy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.floor(fy);
    const wy = fy - y0;
    const y0c = clamp(y0, srcHeight - 1);
    const y1c = clamp(y0 + 1, srcHeight - 1);

    for (let x = 0; x < dstWidth; x += 1) {
      const fx = (x + 0.5) * xRatio - 0.5;
      const x0 = Math.floor(fx);
      const wx = fx - x0;
      const x0c = clamp(x0, srcWidth - 1);
      const x1c = clamp(x0 + 1, srcWidth - 1);

      const i00 = (y0c * srcWidth + x0c) * 4;
      const i10 = (y0c * srcWidth + x1c) * 4;
      const i01 = (y1c * srcWidth + x0c) * 4;
      const i11 = (y1c * srcWidth + x1c) * 4;
      const dstIndex = (y * dstWidth + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const top = src[i00 + channel] + (src[i10 + channel] - src[i00 + channel]) * wx;
        const bottom = src[i01 + channel] + (src[i11 + channel] - src[i01 + channel]) * wx;
        out[dstIndex + channel] = top + (bottom - top) * wy;
      }
    }
  }

  return new ImageData(out, dstWidth, dstHeight);
}

export const INTERPOLATIONS = {
  nearest: {
    id: "nearest",
    label: "Ближайший сосед",
    description:
      "Берёт значение ближайшего пикселя. Очень быстрый, сохраняет резкие границы, но даёт «лесенку» при увеличении.",
    resample: resampleNearest,
  },
  bilinear: {
    id: "bilinear",
    label: "Билинейная",
    description:
      "Усреднение 4 соседних пикселей. Плавные градиенты и мягкое масштабирование, чуть медленнее ближайшего соседа.",
    resample: resampleBilinear,
  },
};

export function interpolationList() {
  return Object.values(INTERPOLATIONS);
}

// Масштабирует изображение выбранным методом. При совпадении размеров
// возвращает копию без обработки.
export function resample(source, dstWidth, dstHeight, method = DEFAULT_INTERPOLATION) {
  const width = Math.max(1, Math.round(dstWidth));
  const height = Math.max(1, Math.round(dstHeight));

  if (width === source.width && height === source.height) {
    return new ImageData(new Uint8ClampedArray(source.data), source.width, source.height);
  }

  const algorithm = INTERPOLATIONS[method] ?? INTERPOLATIONS[DEFAULT_INTERPOLATION];
  return algorithm.resample(source, width, height);
}
