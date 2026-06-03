// UI-состояние просмотра изображения: видимые каналы, масштаб, активный
// инструмент и выбранный пиксель. Характеристики изображения вычисляются
// один раз на загрузку и переиспользуются всеми производными значениями.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  composeVisibleImageData,
  defaultChannels,
  getChannelDescriptors,
  getImageCharacteristics,
  getImageModeLabel,
  normalizeChannels,
} from "../lib/image.js";

export function useImageView(imageData) {
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
    setZoom(Math.min(8, Math.max(0.05, nextZoom)));
  }, []);

  const fitToView = useCallback(() => {
    if (!imageData || !stageRef.current) {
      return;
    }

    const bounds = stageRef.current.getBoundingClientRect();
    const scale = Math.min(
      (bounds.width - 48) / imageData.width,
      (bounds.height - 48) / imageData.height,
      1,
    );

    changeZoom(Number(Math.max(0.05, scale).toFixed(3)));
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

  // Сброс вида при смене изображения и автоподгонка под холст.
  useEffect(() => {
    setPreview(null);

    if (!imageData) {
      setChannels(defaultChannels);
      setZoom(1);
      setActiveTool("cursor");
      setPixel(null);
      return;
    }

    setChannels(normalizeChannels(characteristics, defaultChannels));
    setPixel(null);
    requestAnimationFrame(fitToView);
  }, [imageData, characteristics, fitToView]);

  useEffect(() => {
    if (!imageData || !stageRef.current) {
      return undefined;
    }

    const observer = new ResizeObserver(fitToView);
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [imageData, fitToView]);

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
