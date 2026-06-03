import { useEffect, useRef } from "react";

const WIDTH = 256;
const HEIGHT = 120;

// Столбчатая гистограмма по 256 корзинам. scale: "linear" | "log".
export default function Histogram({ bins, scale = "linear", color = "#176b87" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bins) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    canvas.width = WIDTH * ratio;
    canvas.height = HEIGHT * ratio;

    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    context.clearRect(0, 0, WIDTH, HEIGHT);

    let maxValue = 0;
    for (let index = 0; index < bins.length; index += 1) {
      if (bins[index] > maxValue) {
        maxValue = bins[index];
      }
    }
    if (maxValue === 0) {
      return;
    }

    const norm = scale === "log" ? Math.log(1 + maxValue) : maxValue;
    context.fillStyle = color;

    for (let index = 0; index < 256; index += 1) {
      const raw = bins[index];
      const value = scale === "log" ? Math.log(1 + raw) : raw;
      const barHeight = (value / norm) * (HEIGHT - 2);
      if (barHeight > 0) {
        context.fillRect(index, HEIGHT - barHeight, 1, barHeight);
      }
    }
  }, [bins, scale, color]);

  return <canvas ref={canvasRef} className="histogram" />;
}
