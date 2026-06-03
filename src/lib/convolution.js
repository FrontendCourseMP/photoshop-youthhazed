// Свёртка изображения ядром 3×3 (аналог Photoshop Filters → Custom).
// Чистая логика без DOM — используется и в Web Worker, и как запасной
// синхронный путь. Работает с сырым Uint8ClampedArray (RGBA).

export const KERNEL_PRESETS = [
  { id: "identity", label: "Тождественное", kernel: [0, 0, 0, 0, 1, 0, 0, 0, 0] },
  { id: "sharpen", label: "Повышение резкости", kernel: [0, -1, 0, -1, 5, -1, 0, -1, 0] },
  { id: "gaussian", label: "Фильтр Гаусса 3×3", kernel: [1, 2, 1, 2, 4, 2, 1, 2, 1] },
  { id: "box", label: "Прямоугольное размытие", kernel: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { id: "prewittX", label: "Прюитт (горизонтальный)", kernel: [-1, 0, 1, -1, 0, 1, -1, 0, 1] },
  { id: "prewittY", label: "Прюитт (вертикальный)", kernel: [-1, -1, -1, 0, 0, 0, 1, 1, 1] },
];

export const EDGE_STRATEGIES = [
  { id: "copy", label: "Копирование края" },
  { id: "black", label: "Чёрный" },
  { id: "white", label: "Белый" },
];

// Значение канала с учётом стратегии заполнения краёв (padding).
function sampleChannel(data, width, height, x, y, channel, edge) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    if (edge === "black") {
      return 0;
    }
    if (edge === "white") {
      return 255;
    }
    // copy: повтор крайнего пикселя.
    x = Math.min(width - 1, Math.max(0, x));
    y = Math.min(height - 1, Math.max(0, y));
  }

  return data[(y * width + x) * 4 + channel];
}

// channelFlags — массив [r, g, b, a] булевых: к каким каналам применять.
// Невыбранные каналы остаются без изменений. Делитель = сумма ядра
// (или 1, если сумма равна 0 — для оператора Прюитта и подобных).
export function convolveData(data, width, height, kernel, channelFlags, edge) {
  const out = new Uint8ClampedArray(data);
  const sum = kernel.reduce((accumulator, value) => accumulator + value, 0);
  const divisor = sum === 0 ? 1 : sum;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dstIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        if (!channelFlags[channel]) {
          continue;
        }

        let accumulator = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky += 1) {
          for (let kx = -1; kx <= 1; kx += 1) {
            accumulator +=
              sampleChannel(data, width, height, x + kx, y + ky, channel, edge) * kernel[k];
            k += 1;
          }
        }

        out[dstIndex + channel] = accumulator / divisor;
      }
    }
  }

  return out;
}
