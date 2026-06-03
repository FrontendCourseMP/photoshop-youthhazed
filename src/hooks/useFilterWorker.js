// Управляет Web Worker'ом свёртки и даёт промис-интерфейс runFilter().
// Если воркер недоступен, фильтр считается синхронно в основном потоке.

import { useCallback, useEffect, useRef } from "react";
import { convolveData } from "../lib/convolution.js";

export function useFilterWorker() {
  const workerRef = useRef(null);
  const requestId = useRef(0);
  const pending = useRef(new Map());

  useEffect(() => {
    let worker = null;
    try {
      worker = new Worker(new URL("../workers/filter.worker.js", import.meta.url), {
        type: "module",
      });
      worker.onmessage = (event) => {
        const { id, buffer, width, height } = event.data;
        const resolve = pending.current.get(id);
        if (resolve) {
          pending.current.delete(id);
          resolve(new ImageData(new Uint8ClampedArray(buffer), width, height));
        }
      };
    } catch {
      worker = null;
    }

    workerRef.current = worker;
    return () => {
      worker?.terminate();
      workerRef.current = null;
      pending.current.clear();
    };
  }, []);

  return useCallback((source, kernel, channelFlags, edge) => {
    const worker = workerRef.current;

    if (!worker) {
      const result = convolveData(
        new Uint8ClampedArray(source.data),
        source.width,
        source.height,
        kernel,
        channelFlags,
        edge,
      );
      return Promise.resolve(new ImageData(result, source.width, source.height));
    }

    return new Promise((resolve) => {
      const id = (requestId.current += 1);
      pending.current.set(id, resolve);
      const copy = new Uint8ClampedArray(source.data);
      worker.postMessage(
        {
          id,
          buffer: copy.buffer,
          width: source.width,
          height: source.height,
          kernel,
          channelFlags,
          edge,
        },
        [copy.buffer],
      );
    });
  }, []);
}
