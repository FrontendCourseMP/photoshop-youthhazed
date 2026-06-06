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

  // Координаты столбцов считаются один раз и переиспользуются по строкам.
  const srcXForColumn = new Int32Array(dstWidth);
  for (let x = 0; x < dstWidth; x += 1) {
    srcXForColumn[x] = Math.min(srcWidth - 1, Math.floor(x * xRatio));
  }

  let dstIndex = 0;
  for (let y = 0; y < dstHeight; y += 1) {
    const rowOffset = Math.min(srcHeight - 1, Math.floor(y * yRatio)) * srcWidth;
    for (let x = 0; x < dstWidth; x += 1) {
      const srcIndex = (rowOffset + srcXForColumn[x]) * 4;
      out[dstIndex] = src[srcIndex];
      out[dstIndex + 1] = src[srcIndex + 1];
      out[dstIndex + 2] = src[srcIndex + 2];
      out[dstIndex + 3] = src[srcIndex + 3];
      dstIndex += 4;
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

  // Левый/правый сосед и горизонтальный вес — один раз на столбец.
  const x0Column = new Int32Array(dstWidth);
  const x1Column = new Int32Array(dstWidth);
  const weightColumn = new Float64Array(dstWidth);
  for (let x = 0; x < dstWidth; x += 1) {
    const fx = (x + 0.5) * xRatio - 0.5;
    const x0 = Math.floor(fx);
    weightColumn[x] = fx - x0;
    x0Column[x] = clamp(x0, srcWidth - 1);
    x1Column[x] = clamp(x0 + 1, srcWidth - 1);
  }

  let dstIndex = 0;
  for (let y = 0; y < dstHeight; y += 1) {
    const fy = (y + 0.5) * yRatio - 0.5;
    const y0 = Math.floor(fy);
    const wy = fy - y0;
    const row0 = clamp(y0, srcHeight - 1) * srcWidth;
    const row1 = clamp(y0 + 1, srcHeight - 1) * srcWidth;

    for (let x = 0; x < dstWidth; x += 1) {
      const wx = weightColumn[x];
      const i00 = (row0 + x0Column[x]) * 4;
      const i10 = (row0 + x1Column[x]) * 4;
      const i01 = (row1 + x0Column[x]) * 4;
      const i11 = (row1 + x1Column[x]) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const top = src[i00 + channel] + (src[i10 + channel] - src[i00 + channel]) * wx;
        const bottom = src[i01 + channel] + (src[i11 + channel] - src[i01 + channel]) * wx;
        out[dstIndex] = top + (bottom - top) * wy;
        dstIndex += 1;
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
