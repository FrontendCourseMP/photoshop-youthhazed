import { useEffect, useRef, useState } from "react";
import { samplePixel } from "../lib/image.js";
import { resample } from "../lib/interpolation.js";

export default function CanvasStage({
  stageRef,
  hasImage,
  sourceImageData,
  visibleImageData,
  zoom,
  activeTool,
  onDropFile,
  onPick,
}) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Масштабирование для вывода выполняется собственной интерполяцией
  // (resample), а не CSS: холст рисуется 1:1 в целевом размере.
  // Перерисовка скоалесцирована через requestAnimationFrame.
  useEffect(() => {
    if (!visibleImageData || !canvasRef.current) {
      return undefined;
    }

    const dstWidth = Math.max(1, Math.round(visibleImageData.width * zoom));
    const dstHeight = Math.max(1, Math.round(visibleImageData.height * zoom));

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const scaled =
        zoom === 1 ? visibleImageData : resample(visibleImageData, dstWidth, dstHeight);
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }
      canvas.width = scaled.width;
      canvas.height = scaled.height;
      canvas.style.width = `${scaled.width}px`;
      canvas.style.height = `${scaled.height}px`;
      canvas.getContext("2d", { willReadFrequently: true }).putImageData(scaled, 0, 0);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [visibleImageData, zoom]);

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);

    const [file] = event.dataTransfer.files;
    if (file) {
      onDropFile(file);
    }
  }

  function handleClick(event) {
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

    onPick(samplePixel(sourceImageData, x, y));
  }

  return (
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
            onClick={handleClick}
          />
        ) : (
          <div className="empty-state">
            <strong>Загрузите изображение</strong>
            <span>Перетащите файл сюда или нажмите «Открыть»</span>
          </div>
        )}
      </div>
    </section>
  );
}
