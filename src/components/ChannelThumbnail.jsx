import { useEffect, useRef } from "react";
import { extractChannelImageData } from "../lib/image.js";

const THUMB_MAX = 52;

// Рисует миниатюру отдельного канала. Содержимое канала строится в полном
// разрешении (extractChannelImageData), затем уменьшается под размер бокса.
export default function ChannelThumbnail({ source, channelId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!source || !canvas) {
      return;
    }

    const channel = extractChannelImageData(source, channelId);
    const scale = Math.min(THUMB_MAX / channel.width, THUMB_MAX / channel.height, 1);
    const width = Math.max(1, Math.round(channel.width * scale));
    const height = Math.max(1, Math.round(channel.height * scale));

    const full = document.createElement("canvas");
    full.width = channel.width;
    full.height = channel.height;
    full.getContext("2d").putImageData(channel, 0, 0);

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.drawImage(full, 0, 0, width, height);
  }, [source, channelId]);

  return <canvas ref={canvasRef} className="channel-thumb" />;
}
