// UI-состояние просмотра изображения: видимые каналы, масштаб, активный
// инструмент и выбранный пиксель. Характеристики изображения вычисляются
// один раз на загрузку и переиспользуются всеми производными значениями.
//
// Сброс вида и автоподгонка происходят только при НОВОЙ загрузке файла
// (по счётчику generation), а не при редактировании (уровни, ресайз),
// чтобы выбранный пользователем масштаб и видимость каналов сохранялись.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  composeVisibleImageData,
  defaultChannels,
  getChannelDescriptors,
  getImageCharacteristics,
  getImageModeLabel,
  normalizeChannels,
} from "../lib/image.js";

export const ZOOM_MIN = 0.12;
export const ZOOM_MAX = 3;
export const FIT_PADDING = 50;

export function useImageView(imageData, generation) {
  const stageRef = useRef(null);
  const [channels, setChannels] = useState(defaultChannels);
  const [zoom, setZoom] = useState(1);
  const [activeTool, setActiveTool] = useState("cursor");
  const [pixel, setPixel] = useState(null);
  // Временный предпросмотр (например, «Уровни») поверх исходника.
  // Исходные пиксели не мутируются.
  const [preview, setPreview] = useState(null);

  const characteristics = useMemo(
    () => (imageData ? getImageCharacteristics(imageData) : null),
    [imageData],
  );

  // База для отрисовки: предпросмотр, если активен, иначе исходник.
  const renderSource = preview ?? imageData;

  const descriptors = useMemo(
    () => (characteristics ? getChannelDescriptors(characteristics) : []),
    [characteristics],
  );

  const modeLabel = characteristics ? getImageModeLabel(characteristics) : "-";

  const visibleImageData = useMemo(() => {
    if (!renderSource || !characteristics) {
      return null;
    }

    return composeVisibleImageData(renderSource, characteristics, channels);
  }, [renderSource, characteristics, channels]);

  const changeZoom = useCallback((nextZoom) => {
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoom)));
  }, []);

  // Подгонка: изображение целиком помещается в холст с отступом 50px,
  // масштаб ограничен диапазоном 12%–300%.
  const fitToView = useCallback(() => {
    if (!imageData || !stageRef.current) {
      return;
    }

    const availableWidth = Math.max(1, stageRef.current.clientWidth - FIT_PADDING * 2);
    const availableHeight = Math.max(1, stageRef.current.clientHeight - FIT_PADDING * 2);
    const scale = Math.min(
      availableWidth / imageData.width,
      availableHeight / imageData.height,
    );

    changeZoom(Number(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale)).toFixed(3)));
  }, [imageData, changeZoom]);

  const toggleChannel = useCallback(
    (channelId) => {
      setChannels((current) =>
        normalizeChannels(characteristics, { ...current, [channelId]: !current[channelId] }),
      );
    },
    [characteristics],
  );

  const selectTool = useCallback((tool) => {
    setActiveTool(tool);
    if (tool !== "eyedropper") {
      setPixel(null);
    }
  }, []);

  // Последние значения для эффекта сброса (он не должен реагировать на
  // их изменение, только на смену generation).
  const imageRef = useRef(imageData);
  const characteristicsRef = useRef(characteristics);
  const fitRef = useRef(fitToView);
  imageRef.current = imageData;
  characteristicsRef.current = characteristics;
  fitRef.current = fitToView;

  useEffect(() => {
    setPreview(null);
    setPixel(null);
    setActiveTool("cursor");

    if (!imageRef.current) {
      setChannels(defaultChannels);
      setZoom(1);
      return;
    }

    setChannels(normalizeChannels(characteristicsRef.current, defaultChannels));
    requestAnimationFrame(() => fitRef.current());
  }, [generation]);

  return {
    stageRef,
    channels,
    descriptors,
    modeLabel,
    visibleImageData,
    zoom,
    activeTool,
    pixel,
    changeZoom,
    fitToView,
    toggleChannel,
    selectTool,
    setPixel,
    preview,
    setPreview,
  };
}
