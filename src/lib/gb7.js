const SIGNATURE = [0x47, 0x42, 0x37, 0x1d];
const VERSION = 0x01;
const HEADER_SIZE = 12;

export function decodeGb7(buffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < HEADER_SIZE) {
    throw new Error("Файл слишком короткий для формата GB7.");
  }

  for (let index = 0; index < SIGNATURE.length; index += 1) {
    if (bytes[index] !== SIGNATURE[index]) {
      throw new Error("Неверная сигнатура GrayBit-7.");
    }
  }

  const version = bytes[4];
  const flags = bytes[5];
  const hasMask = (flags & 0x01) === 0x01;
  const reservedFlags = flags & 0xfe;
  const width = readUint16(bytes, 6);
  const height = readUint16(bytes, 8);
  const reserved = readUint16(bytes, 10);

  if (version !== VERSION) {
    throw new Error(`Версия GB7 ${version} не поддерживается.`);
  }

  if (reservedFlags !== 0) {
    throw new Error("В GB7 установлены зарезервированные флаги.");
  }

  if (width === 0 || height === 0) {
    throw new Error("GB7 содержит пустой размер изображения.");
  }

  if (reserved !== 0) {
    throw new Error("Зарезервированное поле GB7 должно быть равно 0.");
  }

  const pixelCount = width * height;
  const expectedLength = HEADER_SIZE + pixelCount;

  if (bytes.length !== expectedLength) {
    throw new Error("Размер данных GB7 не совпадает с шириной и высотой.");
  }

  const imageData = new ImageData(width, height);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const packed = bytes[HEADER_SIZE + pixel];

    if (!hasMask && (packed & 0x80) !== 0) {
      throw new Error("В GB7 без маски старший бит пикселя должен быть равен 0.");
    }

    const gray7 = packed & 0x7f;
    const gray8 = Math.round((gray7 / 127) * 255);
    const alpha = hasMask ? ((packed & 0x80) === 0x80 ? 255 : 0) : 255;
    const offset = pixel * 4;

    imageData.data[offset] = gray8;
    imageData.data[offset + 1] = gray8;
    imageData.data[offset + 2] = gray8;
    imageData.data[offset + 3] = alpha;
  }

  return {
    imageData,
    meta: {
      width,
      height,
      colorDepth: hasMask ? 8 : 7,
      format: "GB7",
      hasMask,
    },
  };
}

export function encodeGb7(imageData) {
  const { width, height, data } = imageData;

  if (width > 0xffff || height > 0xffff) {
    throw new Error("GB7 поддерживает размеры только до 65535 пикселей.");
  }

  const pixelCount = width * height;
  const hasMask = hasTransparentPixels(data);
  const bytes = new Uint8Array(HEADER_SIZE + pixelCount);

  bytes.set(SIGNATURE, 0);
  bytes[4] = VERSION;
  bytes[5] = hasMask ? 0x01 : 0x00;
  writeUint16(bytes, 6, width);
  writeUint16(bytes, 8, height);
  writeUint16(bytes, 10, 0);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
    const gray7 = Math.round((luminance / 255) * 127) & 0x7f;
    const maskBit = hasMask && alpha >= 128 ? 0x80 : 0x00;

    bytes[HEADER_SIZE + pixel] = gray7 | maskBit;
  }

  return new Blob([bytes], { type: "application/octet-stream" });
}

function readUint16(bytes, offset) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = (value >> 8) & 0xff;
  bytes[offset + 1] = value & 0xff;
}

function hasTransparentPixels(data) {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) {
      return true;
    }
  }

  return false;
}
