import { useEffect, useMemo, useRef, useState } from "react";
import { decodeGb7, encodeGb7 } from "./gb7.js";

const emptyMeta = {
  fileName: "",
  fileSize: 0,
  width: 0,
  height: 0,
  colorDepth: "",
  format: "",
  hasMask: false,
};

const defaultChannels = {
  gray: true,
  red: true,
  green: true,
  blue: true,
  alpha: true,
};

export default function App() {
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const [sourceImageData, setSourceImageData] = useState(null);
  const [meta, setMeta] = useState(emptyMeta);
  const [status, setStatus] = useState("Готово");
  const [isError, setIsError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTool, setActiveTool] = useState("cursor");
  const [channels, setChannels] = useState(defaultChannels);
  const [zoom, setZoom] = useState(1);
  const [pixel, setPixel] = useState(null);

  const descriptors = useMemo(
    () => (sourceImageData ? getChannelDescriptors(sourceImageData) : []),
    [sourceImageData],
  );

  const visibleImageData = useMemo(() => {
    if (!sourceImageData) {
      return null;
    }

    return composeVisibleImageData(sourceImageData, channels);
  }, [sourceImageData, channels]);

  useEffect(() => {
    if (!visibleImageData || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = visibleImageData.width;
    canvas.height = visibleImageData.height;
    canvas.style.width = `${Math.max(1, Math.round(visibleImageData.width * zoom))}px`;
    canvas.style.height = `${Math.max(1, Math.round(visibleImageData.height * zoom))}px`;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.putImageData(visibleImageData, 0, 0);
  }, [visibleImageData, zoom]);

  useEffect(() => {
    if (!sourceImageData) {
      return;
    }

    setChannels(normalizeChannels(sourceImageData, defaultChannels));
    setPixel(null);
    requestAnimationFrame(() => fitToView(sourceImageData));
  }, [sourceImageData]);

  useEffect(() => {
    if (!sourceImageData || !stageRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      fitToView(sourceImageData);
    });

    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [sourceImageData]);

  async function handleFile(file) {
    try {
      setStatusMessage("Загрузка изображения...");
      const format = getFileFormat(file);

      if (!format) {
        throw new Error("Поддерживаются только PNG, JPG и GB7.");
      }

      const payload =
        format === "GB7"
          ? await loadGb7(file)
          : await loadBrowserImage(file, format);

      setSourceImageData(payload.imageData);
      setMeta({
        fileName: getBaseName(file.name),
        fileSize: file.size,
        width: payload.meta.width,
        height: payload.meta.height,
        colorDepth: `${payload.meta.colorDepth} бит`,
        format: payload.meta.format,
        hasMask: payload.meta.hasMask,
      });
      setActiveTool("cursor");
      setStatusMessage("Изображение загружено.");
    } catch (error) {
      clearImage();
      setStatusMessage(error.message || "Не удалось открыть файл.", true);
    } finally {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function clearImage() {
    setSourceImageData(null);
    setMeta(emptyMeta);
    setChannels(defaultChannels);
    setPixel(null);
    setZoom(1);
    setActiveTool("cursor");
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const [file] = event.dataTransfer.files;
    if (file) {
      handleFile(file);
    }
  }

  function handleCanvasClick(event) {
    if (activeTool !== "eyedropper" || !sourceImageData) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(
      sourceImageData.width - 1,
      Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * sourceImageData.width)),
    );
    const y = Math.min(
      sourceImageData.height - 1,
      Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * sourceImageData.height)),
    );

    setPixel(samplePixel(sourceImageData, x, y));
  }

  function toggleChannel(channelId) {
    setChannels((current) => normalizeChannels(sourceImageData, { ...current, [channelId]: !current[channelId] }));
  }

  function changeZoom(nextZoom) {
    setZoom(Math.min(8, Math.max(0.05, nextZoom)));
  }

  function fitToView(imageData = sourceImageData) {
    if (!imageData || !stageRef.current) {
      return;
    }

    const bounds = stageRef.current.getBoundingClientRect();
    const scale = Math.min(
      (bounds.width - 48) / imageData.width,
      (bounds.height - 48) / imageData.height,
      1,
    );

    changeZoom(Number(Math.max(0.05, scale).toFixed(3)));
  }

  async function saveImage(format) {
    if (!sourceImageData) {
      return;
    }

    try {
      if (format === "GB7") {
        downloadBlob(encodeGb7(sourceImageData), `${meta.fileName || "image"}.gb7`);
      } else {
        const type = format === "PNG" ? "image/png" : "image/jpeg";
        const blob = await imageDataToBlob(sourceImageData, type);
        downloadBlob(blob, `${meta.fileName || "image"}.${format.toLowerCase()}`);
      }

      setStatusMessage(`Сохранено как ${format}.`);
    } catch (error) {
      setStatusMessage(error.message || "Не удалось сохранить изображение.", true);
    }
  }

  const hasImage = Boolean(sourceImageData);
  const modeLabel = hasImage ? getImageModeLabel(sourceImageData) : "-";

  return (
    <div className="app">
      <input
        ref={inputRef}
        className="hidden-input"
        type="file"
        accept=".png,.jpg,.jpeg,.gb7,image/png,image/jpeg"
        onChange={(event) => {
          const [file] = event.target.files;
          if (file) {
            handleFile(file);
          }
        }}
      />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">GB7</span>
          <div>
            <h1>Редактор изображений</h1>
            <p>PNG, JPG и GrayBit-7</p>
          </div>
        </div>

        <div className="actions">
          <button className="button primary" type="button" onClick={() => inputRef.current?.click()}>
            Открыть
          </button>
          <button className="button" type="button" onClick={() => saveImage("PNG")} disabled={!hasImage}>
            PNG
          </button>
          <button className="button" type="button" onClick={() => saveImage("JPG")} disabled={!hasImage}>
            JPG
          </button>
          <button className="button" type="button" onClick={() => saveImage("GB7")} disabled={!hasImage}>
            GB7
          </button>
          <button className="button" type="button" onClick={clearImage} disabled={!hasImage}>
            Закрыть
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel">
          <section>
            <h2>Файл</h2>
            <dl className="meta">
              <MetaRow label="Имя" value={meta.fileName || "-"} />
              <MetaRow label="Формат" value={meta.format || "-"} />
              <MetaRow label="Размер" value={meta.fileSize ? formatBytes(meta.fileSize) : "-"} />
              <MetaRow label="Режим" value={modeLabel} />
            </dl>
          </section>

          <section>
            <h2>Инструменты</h2>
            <div className="segmented">
              <button
                className={activeTool === "cursor" ? "selected" : ""}
                type="button"
                onClick={() => {
                  setActiveTool("cursor");
                  setPixel(null);
                }}
              >
                Курсор
              </button>
              <button
                className={activeTool === "eyedropper" ? "selected" : ""}
                type="button"
                onClick={() => setActiveTool("eyedropper")}
                disabled={!hasImage}
              >
                Пипетка
              </button>
            </div>
          </section>

          <section>
            <h2>Масштаб</h2>
            <div className="zoom-row">
              <button className="small-button" type="button" onClick={() => changeZoom(zoom / 1.25)} disabled={!hasImage}>-</button>
              <button className="small-button wide" type="button" onClick={() => changeZoom(1)} disabled={!hasImage}>{Math.round(zoom * 100)}%</button>
              <button className="small-button" type="button" onClick={() => changeZoom(zoom * 1.25)} disabled={!hasImage}>+</button>
              <button className="small-button fit" type="button" onClick={() => fitToView()} disabled={!hasImage}>Подогнать</button>
            </div>
          </section>

          <section>
            <h2>Каналы</h2>
            {descriptors.length ? (
              <div className="channel-list">
                {descriptors.map((descriptor) => (
                  <label className="channel" key={descriptor.id}>
                    <input
                      type="checkbox"
                      checked={channels[descriptor.id]}
                      onChange={() => toggleChannel(descriptor.id)}
                    />
                    <span>{descriptor.label}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="note">Каналы появятся после открытия файла.</p>
            )}
          </section>

          <section>
            <h2>GrayBit-7</h2>
            <p className="note">
              При сохранении в GB7 изображение переводится в оттенки серого.
              Прозрачность сохраняется как 1-битная маска.
            </p>
          </section>
        </aside>

        <section className="canvas-area" aria-label="Холст изображения">
          <div
            ref={stageRef}
            className={`drop-zone ${hasImage ? "has-image" : ""} ${isDragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {hasImage ? (
              <canvas
                ref={canvasRef}
                className={activeTool === "eyedropper" ? "eyedropper" : ""}
                onClick={handleCanvasClick}
              />
            ) : (
              <div className="empty-state">
                <strong>Загрузите изображение</strong>
                <span>Перетащите файл сюда или нажмите «Открыть»</span>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="statusbar">
        <span className={isError ? "error" : ""}>{status}</span>
        <span>{hasImage ? `${meta.width}px x ${meta.height}px | ${meta.colorDepth} | ${meta.format}` : "Ширина: - | Высота: - | Глубина цвета: -"}</span>
        <span>{activeTool === "eyedropper" ? "Пипетка" : "Курсор"}</span>
        <span>{pixel ? `X:${pixel.x} Y:${pixel.y} | RGB ${pixel.r}, ${pixel.g}, ${pixel.b} | LAB ${pixel.lab.l}, ${pixel.lab.a}, ${pixel.lab.b}` : "Пиксель не выбран"}</span>
      </footer>
    </div>
  );

  function setStatusMessage(message, error = false) {
    setStatus(message);
    setIsError(error);
  }
}

function MetaRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function loadGb7(file) {
  const { imageData, meta } = decodeGb7(await file.arrayBuffer());
  return { imageData, meta };
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

function getImageCharacteristics(imageData) {
  let grayscale = true;
  let alpha = false;

  for (let index = 0; index < imageData.data.length; index += 4) {
    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];

    if (red !== green || green !== blue) {
      grayscale = false;
    }

    if (imageData.data[index + 3] < 255) {
      alpha = true;
    }

    if (!grayscale && alpha) {
      break;
    }
  }

  return { grayscale, alpha };
}

function getImageModeLabel(imageData) {
  const { grayscale, alpha } = getImageCharacteristics(imageData);

  if (grayscale) {
    return alpha ? "2 канала: Gray + Alpha" : "1 канал: Gray";
  }

  return alpha ? "4 канала: RGB + Alpha" : "3 канала: RGB";
}

function getChannelDescriptors(imageData) {
  const { grayscale, alpha } = getImageCharacteristics(imageData);
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

function normalizeChannels(imageData, nextChannels) {
  if (!imageData) {
    return defaultChannels;
  }

  const available = new Set(getChannelDescriptors(imageData).map((descriptor) => descriptor.id));

  return {
    gray: available.has("gray") ? nextChannels.gray : false,
    red: available.has("red") ? nextChannels.red : false,
    green: available.has("green") ? nextChannels.green : false,
    blue: available.has("blue") ? nextChannels.blue : false,
    alpha: available.has("alpha") ? nextChannels.alpha : false,
  };
}

function composeVisibleImageData(source, channelState) {
  const next = new Uint8ClampedArray(source.data);
  const { grayscale, alpha } = getImageCharacteristics(source);
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

function samplePixel(imageData, x, y) {
  const index = (y * imageData.width + x) * 4;
  const red = imageData.data[index];
  const green = imageData.data[index + 1];
  const blue = imageData.data[index + 2];
  const lab = rgbToLab(red, green, blue);

  return { x, y, r: red, g: green, b: blue, lab };
}

function rgbToLab(red, green, blue) {
  const r = srgbToLinear(red);
  const g = srgbToLinear(green);
  const b = srgbToLinear(blue);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const fx = labPivot(x);
  const fy = labPivot(y);
  const fz = labPivot(z);

  return {
    l: Number((116 * fy - 16).toFixed(2)),
    a: Number((500 * (fx - fy)).toFixed(2)),
    b: Number((200 * (fy - fz)).toFixed(2)),
  };
}

function srgbToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function labPivot(value) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
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
