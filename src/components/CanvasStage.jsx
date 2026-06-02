import { useEffect, useRef, useState } from "react";
import { samplePixel } from "../lib/image.js";

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
  const [isDragging, setIsDragging] = useState(false);

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
