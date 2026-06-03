import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import { useFilterWorker } from "../hooks/useFilterWorker.js";
import { getChannelDescriptors, getImageCharacteristics } from "../lib/image.js";
import { EDGE_STRATEGIES, KERNEL_PRESETS } from "../lib/convolution.js";

const IDENTITY = KERNEL_PRESETS[0];

function defaultMask(descriptors) {
  // По умолчанию фильтр применяется к цветовым каналам, но не к альфе.
  return Object.fromEntries(descriptors.map((d) => [d.id, d.id !== "alpha"]));
}

export default function FilterDialog({ open, source, onPreview, onApply, onClose }) {
  const runFilter = useFilterWorker();
  const [cells, setCells] = useState(() => IDENTITY.kernel.map(String));
  const [presetId, setPresetId] = useState(IDENTITY.id);
  const [edge, setEdge] = useState("copy");
  const [mask, setMask] = useState({});
  const [previewOn, setPreviewOn] = useState(true);

  const characteristics = useMemo(
    () => (source ? getImageCharacteristics(source) : null),
    [source],
  );
  const descriptors = characteristics ? getChannelDescriptors(characteristics) : [];

  const kernel = useMemo(
    () =>
      cells.map((cell) => {
        const value = parseFloat(cell);
        return Number.isFinite(value) ? value : 0;
      }),
    [cells],
  );

  const channelFlags = useMemo(() => {
    if (!characteristics) {
      return [false, false, false, false];
    }
    if (characteristics.grayscale) {
      return [!!mask.gray, !!mask.gray, !!mask.gray, !!mask.alpha];
    }
    return [!!mask.red, !!mask.green, !!mask.blue, !!mask.alpha];
  }, [characteristics, mask]);

  // Сброс состояния при открытии.
  useEffect(() => {
    if (open && source) {
      setCells(IDENTITY.kernel.map(String));
      setPresetId(IDENTITY.id);
      setEdge("copy");
      setMask(defaultMask(getChannelDescriptors(getImageCharacteristics(source))));
      setPreviewOn(true);
    }
  }, [open, source]);

  // Предпросмотр через воркер; устаревшие результаты отбрасываются.
  const kernelKey = kernel.join(",");
  const channelKey = channelFlags.join(",");
  useEffect(() => {
    if (!open || !source) {
      return undefined;
    }
    if (!previewOn) {
      onPreview(null);
      return undefined;
    }

    let cancelled = false;
    runFilter(source, kernel, channelFlags, edge).then((image) => {
      if (!cancelled) {
        onPreview(image);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source, previewOn, kernelKey, channelKey, edge, runFilter]);

  function applyPreset(id) {
    const preset = KERNEL_PRESETS.find((item) => item.id === id);
    if (preset) {
      setPresetId(id);
      setCells(preset.kernel.map(String));
    }
  }

  function changeCell(index, value) {
    setCells((current) => current.map((cell, i) => (i === index ? value : cell)));
    setPresetId("custom");
  }

  function toggleMask(id) {
    setMask((current) => ({ ...current, [id]: !current[id] }));
  }

  function handleReset() {
    setCells(IDENTITY.kernel.map(String));
    setPresetId(IDENTITY.id);
    setEdge("copy");
    setMask(defaultMask(descriptors));
  }

  function handleCancel() {
    onPreview(null);
    onClose();
  }

  async function handleApply() {
    const image = await runFilter(source, kernel, channelFlags, edge);
    onApply(image);
  }

  const footer = (
    <>
      <button type="button" className="button" onClick={handleReset}>
        Сбросить
      </button>
      <span className="modal-foot-spacer" />
      <button type="button" className="button" onClick={handleCancel}>
        Отмена
      </button>
      <button type="button" className="button primary" onClick={handleApply}>
        Применить
      </button>
    </>
  );

  return (
    <Modal open={open} title="Фильтрация (свёртка)" onClose={handleCancel} footer={footer}>
      <label className="field">
        <span>Преднастройка</span>
        <select value={presetId} onChange={(event) => applyPreset(event.target.value)}>
          {presetId === "custom" ? <option value="custom">— своё ядро —</option> : null}
          {KERNEL_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="kernel-grid">
        {cells.map((cell, index) => (
          <input
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            type="number"
            step="any"
            value={cell}
            onChange={(event) => changeCell(index, event.target.value)}
            aria-label={`Ядро ${index + 1}`}
          />
        ))}
      </div>

      <div className="field">
        <span>Каналы</span>
        <div className="checks-row">
          {descriptors.map((descriptor) => (
            <label className="field-inline" key={descriptor.id}>
              <input
                type="checkbox"
                checked={!!mask[descriptor.id]}
                onChange={() => toggleMask(descriptor.id)}
              />
              <span>{descriptor.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Края изображения</span>
        <select value={edge} onChange={(event) => setEdge(event.target.value)}>
          {EDGE_STRATEGIES.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field-inline">
        <input
          type="checkbox"
          checked={previewOn}
          onChange={(event) => setPreviewOn(event.target.checked)}
        />
        <span>Предпросмотр на холсте</span>
      </label>
    </Modal>
  );
}
