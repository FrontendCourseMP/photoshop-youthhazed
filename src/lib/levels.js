// Градационная коррекция «Уровни» (Levels): построение LUT, применение к
// каналам, расчёт гистограммы. Работа идёт в 8-битном диапазоне (0..255):
// после декодирования любое изображение (включая 7-битный GB7) хранится в
// 8 битах на канал.

export const LEVELS_MAX = 255;
export const GAMMA_MIN = 0.1;
export const GAMMA_MAX = 9.9;

export const identityLevels = { black: 0, white: LEVELS_MAX, gamma: 1 };

// Каналы, к которым применяется коррекция, и какие из них доступны.
export function levelsChannelOptions(characteristics) {
  const options = [{ id: "master", label: characteristics.grayscale ? "Серый" : "RGB" }];

  if (!characteristics.grayscale) {
    options.push(
      { id: "red", label: "Red" },
      { id: "green", label: "Green" },
      { id: "blue", label: "Blue" },
    );
  }

  if (characteristics.alpha) {
    options.push({ id: "alpha", label: "Alpha" });
  }

  return options;
}

export function createLevelsState() {
  return {
    master: { ...identityLevels },
    red: { ...identityLevels },
    green: { ...identityLevels },
    blue: { ...identityLevels },
    alpha: { ...identityLevels },
  };
}

export function isIdentity(level) {
  return level.black === 0 && level.white === LEVELS_MAX && level.gamma === 1;
}

// Позиция маркера полутонов как доля диапазона [black..white].
// midNorm = 0.5 ^ gamma  →  gamma = 1 даёт центр (0.5).
export function gammaToMidFraction(gamma) {
  return 0.5 ** gamma;
}

export function midFractionToGamma(fraction) {
  const clamped = Math.min(0.999, Math.max(0.001, fraction));
  const gamma = Math.log(clamped) / Math.log(0.5);
  return clampGamma(gamma);
}

export function clampGamma(gamma) {
  return Math.min(GAMMA_MAX, Math.max(GAMMA_MIN, Number(gamma.toFixed(2))));
}

// Таблица подстановки 256→256 для одного канала.
export function buildLut({ black, white, gamma }) {
  const lut = new Uint8ClampedArray(256);
  const span = Math.max(1, white - black);
  const exponent = 1 / gamma;

  for (let value = 0; value < 256; value += 1) {
    const normalized = Math.min(1, Math.max(0, (value - black) / span));
    lut[value] = Math.round(255 * normalized ** exponent);
  }

  return lut;
}

// Применяет уровни к изображению, не мутируя исходные данные.
// Сначала действуют поканальные LUT (R/G/B/A), затем мастер-LUT на R/G/B.
export function applyLevels(source, levels) {
  const { data, width, height } = source;
  // Все 4 канала каждого пикселя перезаписываются ниже, поэтому копировать
  // исходный буфер не нужно.
  const out = new Uint8ClampedArray(data.length);

  const master = buildLut(levels.master);
  const red = buildLut(levels.red);
  const green = buildLut(levels.green);
  const blue = buildLut(levels.blue);
  const alpha = buildLut(levels.alpha);

  for (let index = 0; index < data.length; index += 4) {
    out[index] = master[red[data[index]]];
    out[index + 1] = master[green[data[index + 1]]];
    out[index + 2] = master[blue[data[index + 2]]];
    out[index + 3] = alpha[data[index + 3]];
  }

  return new ImageData(out, width, height);
}

// Гистограмма (256 корзин) по выбранному каналу.
// master — композитная светлота по формуле luma.
export function computeHistogram(source, channel) {
  const { data } = source;
  const bins = new Uint32Array(256);

  if (channel === "master") {
    for (let index = 0; index < data.length; index += 4) {
      const luma = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      bins[Math.round(luma)] += 1;
    }
    return bins;
  }

  const offset = { red: 0, green: 1, blue: 2, alpha: 3 }[channel] ?? 0;
  for (let index = 0; index < data.length; index += 4) {
    bins[data[index + offset]] += 1;
  }

  return bins;
}
