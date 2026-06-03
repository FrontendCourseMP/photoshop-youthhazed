// Воркер свёртки: считает фильтр в отдельном потоке, чтобы интерфейс
// оставался отзывчивым на больших изображениях. Буфер передаётся через
// transferable, результат возвращается тем же способом.

import { convolveData } from "../lib/convolution.js";

self.onmessage = (event) => {
  const { id, buffer, width, height, kernel, channelFlags, edge } = event.data;
  const data = new Uint8ClampedArray(buffer);
  const result = convolveData(data, width, height, kernel, channelFlags, edge);
  self.postMessage({ id, buffer: result.buffer, width, height }, [result.buffer]);
};
