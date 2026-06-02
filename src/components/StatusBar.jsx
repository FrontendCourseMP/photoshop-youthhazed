export default function StatusBar({ status, isError, hasImage, meta, activeTool, pixel }) {
  return (
    <footer className="statusbar">
      <span className={isError ? "error" : ""}>{status}</span>
      <span>
        {hasImage
          ? `${meta.width}px x ${meta.height}px | ${meta.colorDepth} | ${meta.format}`
          : "Ширина: - | Высота: - | Глубина цвета: -"}
      </span>
      <span>{activeTool === "eyedropper" ? "Пипетка" : "Курсор"}</span>
      <span>
        {pixel
          ? `X:${pixel.x} Y:${pixel.y} | RGB ${pixel.r}, ${pixel.g}, ${pixel.b} | LAB ${pixel.lab.l}, ${pixel.lab.a}, ${pixel.lab.b}`
          : "Пиксель не выбран"}
      </span>
    </footer>
  );
}
