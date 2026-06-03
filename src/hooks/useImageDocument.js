// Управляет жизненным циклом изображения: загрузка из файла, очистка,
// сохранение и строка состояния. UI-состояние (каналы, зум, инструмент)
// живёт в компоненте.

import { useCallback, useState } from "react";
import { emptyMeta } from "../lib/image.js";
import { loadImageFile, saveImageFile } from "../lib/fileio.js";

export function useImageDocument() {
  const [imageData, setImageData] = useState(null);
  const [meta, setMeta] = useState(emptyMeta);
  const [status, setStatus] = useState("Готово");
  const [isError, setIsError] = useState(false);
  // Увеличивается при загрузке нового файла и при закрытии, но НЕ при
  // редактировании — по нему вид сбрасывается и подгоняется заново.
  const [generation, setGeneration] = useState(0);

  const setStatusMessage = useCallback((message, error = false) => {
    setStatus(message);
    setIsError(error);
  }, []);

  const clear = useCallback(() => {
    setImageData(null);
    setMeta(emptyMeta);
    setGeneration((value) => value + 1);
  }, []);

  // Замена изображения результатом редактирования (уровни, фильтр, ресайз).
  // Размеры в метаданных обновляются автоматически.
  const replaceImage = useCallback((nextImageData, metaPatch = {}) => {
    setImageData(nextImageData);
    setMeta((prev) => ({
      ...prev,
      width: nextImageData.width,
      height: nextImageData.height,
      ...metaPatch,
    }));
  }, []);

  const load = useCallback(
    async (file) => {
      try {
        setStatusMessage("Загрузка изображения...");
        const document = await loadImageFile(file);
        setImageData(document.imageData);
        setMeta(document.meta);
        setGeneration((value) => value + 1);
        setStatusMessage("Изображение загружено.");
      } catch (error) {
        clear();
        setStatusMessage(error.message || "Не удалось открыть файл.", true);
      }
    },
    [clear, setStatusMessage],
  );

  const save = useCallback(
    async (format) => {
      if (!imageData) {
        return;
      }

      try {
        await saveImageFile(imageData, format, meta.fileName);
        setStatusMessage(`Сохранено как ${format}.`);
      } catch (error) {
        setStatusMessage(error.message || "Не удалось сохранить изображение.", true);
      }
    },
    [imageData, meta.fileName, setStatusMessage],
  );

  return { imageData, meta, status, isError, generation, load, clear, save, replaceImage };
}
