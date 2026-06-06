import { memo, useEffect, useRef } from "react";

const THUMB_MAX = 52;
const CHANNEL_OFFSET = { gray: 0, red: 0, green: 1, blue: 2, alpha: 3 };

// Миниатюра канала в градациях серого (белый = макс. интенсивность).
// Источник уменьшается средствами браузера (со сглаживанием), а перекраска
// в нужный канал выполняется уже на маленьком буфере — без полноразмерных
// аллокаций на каждый канал.
function ChannelThumbnail({ source, channelId }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!source || !canvas) {
      return;
    }

    const scale = Math.min(THUMB_MAX / source.width, THUMB_MAX / source.height, 1);
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const full = document.createElement("canvas");
    full.width = source.width;
    full.height = source.height;
    full.getContext("2d").putImageData(source, 0, 0);

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.drawImage(full, 0, 0, width, height);

    const offset = CHANNEL_OFFSET[channelId] ?? 0;
    const image = context.getImageData(0, 0, width, height);
    const data = image.data;
    for (let index = 0; index < data.length; index += 4) {
      const value = data[index + offset];
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }, [source, channelId]);

  return <canvas ref={canvasRef} className="channel-thumb" />;
}

export default memo(ChannelThumbnail);
