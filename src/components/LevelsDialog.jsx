import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import Histogram from "./Histogram.jsx";
import LevelsSlider from "./LevelsSlider.jsx";
import { getImageCharacteristics } from "../lib/image.js";
import {
  GAMMA_MAX,
  GAMMA_MIN,
  LEVELS_MAX,
  applyLevels,
  computeHistogram,
  createLevelsState,
  levelsChannelOptions,
} from "../lib/levels.js";

const HISTOGRAM_COLORS = {
  master: "#176b87",
  red: "#c0392b",
  green: "#2e8b57",
  blue: "#2c6fbb",
  alpha: "#6b7280",
};

export default function LevelsDialog({ open, source, onPreview, onApply, onClose }) {
  const [levels, setLevels] = useState(createLevelsState);
  const [channel, setChannel] = useState("master");
  const [scale, setScale] = useState("linear");
  const [previewOn, setPreviewOn] = useState(true);
  const rafRef = useRef(0);

  const characteristics = useMemo(
    () => (source ? getImageCharacteristics(source) : null),
    [source],
  );
  const channelOptions = characteristics ? levelsChannelOptions(characteristics) : [];
  const bins = useMemo(
    () => (source ? computeHistogram(source, channel) : null),
    [source, channel],
  );

  // Сброс состояния при каждом открытии диалога.
  useEffect(() => {
    if (open) {
      setLevels(createLevelsState());
      setChannel("master");
      setPreviewOn(true);
    }
  }, [open]);

  // Предпросмотр в реальном времени, скоалесцированный через rAF.
  useEffect(() => {
    if (!open || !source) {
      return undefined;
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onPreview(previewOn ? applyLevels(source, levels) : null);
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [open, source, levels, previewOn, onPreview]);

  const current = levels[channel];

  function updateCurrent(patch) {
    setLevels((prev) => ({ ...prev, [channel]: { ...prev[channel], ...patch } }));
  }

  function handleReset() {
    setLevels(createLevelsState());
  }

  function handleCancel() {
    onPreview(null);
    onClose();
  }

  function handleApply() {
    onApply(applyLevels(source, levels));
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
    <Modal open={open} title="Уровни" onClose={handleCancel} footer={footer} className="levels-modal">
      <div className="field-row">
        <label className="field">
          <span>Канал</span>
          <select value={channel} onChange={(event) => setChannel(event.target.value)}>
            {channelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Шкала</span>
          <select value={scale} onChange={(event) => setScale(event.target.value)}>
            <option value="linear">Линейная</option>
            <option value="log">Логарифмическая</option>
          </select>
        </label>
      </div>

      <Histogram bins={bins} scale={scale} color={HISTOGRAM_COLORS[channel]} />
      <LevelsSlider value={current} onChange={updateCurrent} />

      <div className="field-row levels-inputs">
        <label className="field">
          <span>Чёрная</span>
          <input
            type="number"
            min={0}
            max={current.white - 1}
            value={current.black}
            onChange={(event) =>
              updateCurrent({
                black: Math.min(current.white - 1, Math.max(0, Number(event.target.value) || 0)),
              })
            }
          />
        </label>
        <label className="field">
          <span>Гамма</span>
          <input
            type="number"
            min={GAMMA_MIN}
            max={GAMMA_MAX}
            step={0.01}
            value={current.gamma}
            onChange={(event) =>
              updateCurrent({
                gamma: Math.min(GAMMA_MAX, Math.max(GAMMA_MIN, Number(event.target.value) || 1)),
              })
            }
          />
        </label>
        <label className="field">
          <span>Белая</span>
          <input
            type="number"
            min={current.black + 1}
            max={LEVELS_MAX}
            value={current.white}
            onChange={(event) =>
              updateCurrent({
                white: Math.max(
                  current.black + 1,
                  Math.min(LEVELS_MAX, Number(event.target.value) || LEVELS_MAX),
                ),
              })
            }
          />
        </label>
      </div>

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
