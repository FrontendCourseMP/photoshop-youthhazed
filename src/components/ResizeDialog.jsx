import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal.jsx";
import {
  DEFAULT_INTERPOLATION,
  INTERPOLATIONS,
  interpolationList,
  resample,
} from "../lib/interpolation.js";

const MAX_SIDE = 10000;

function megapixels(width, height) {
  return ((width * height) / 1_000_000).toFixed(2);
}

export default function ResizeDialog({ open, source, onApply, onClose }) {
  const [unit, setUnit] = useState("percent");
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [linked, setLinked] = useState(true);
  const [method, setMethod] = useState(DEFAULT_INTERPOLATION);

  const aspect = source ? source.width / source.height : 1;

  // Инициализация полей при открытии.
  useEffect(() => {
    if (open && source) {
      setUnit("percent");
      setWidth(100);
      setHeight(100);
      setLinked(true);
      setMethod(DEFAULT_INTERPOLATION);
    }
  }, [open, source]);

  const target = useMemo(() => {
    if (!source) {
      return { width: 0, height: 0 };
    }
    if (unit === "percent") {
      return {
        width: Math.round((source.width * width) / 100),
        height: Math.round((source.height * height) / 100),
      };
    }
    return { width: Math.round(width), height: Math.round(height) };
  }, [source, unit, width, height]);

  const isValid =
    target.width >= 1 &&
    target.height >= 1 &&
    target.width <= MAX_SIDE &&
    target.height <= MAX_SIDE &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0;

  function handleUnitChange(nextUnit) {
    if (!source || nextUnit === unit) {
      return;
    }
    // Пересчёт текущих значений в новые единицы, чтобы размер не «прыгал».
    if (nextUnit === "pixels") {
      setWidth(Math.round((source.width * width) / 100));
      setHeight(Math.round((source.height * height) / 100));
    } else {
      setWidth(Number(((width / source.width) * 100).toFixed(1)));
      setHeight(Number(((height / source.height) * 100).toFixed(1)));
    }
    setUnit(nextUnit);
  }

  function handleWidthChange(rawValue) {
    const value = Number(rawValue);
    setWidth(value);
    if (linked) {
      setHeight(unit === "pixels" ? Math.round(value / aspect) : value);
    }
  }

  function handleHeightChange(rawValue) {
    const value = Number(rawValue);
    setHeight(value);
    if (linked) {
      setWidth(unit === "pixels" ? Math.round(value * aspect) : value);
    }
  }

  function handleApply() {
    if (!isValid) {
      return;
    }
    onApply(resample(source, target.width, target.height, method));
  }

  const footer = (
    <>
      <span className="modal-foot-spacer" />
      <button type="button" className="button" onClick={onClose}>
        Отмена
      </button>
      <button type="button" className="button primary" onClick={handleApply} disabled={!isValid}>
        Применить
      </button>
    </>
  );

  return (
    <Modal open={open} title="Размер изображения" onClose={onClose} footer={footer}>
      <dl className="resize-stats">
        <div>
          <dt>Было</dt>
          <dd>
            {source ? `${source.width}×${source.height}` : "-"}
            {source ? ` · ${megapixels(source.width, source.height)} Мп` : ""}
          </dd>
        </div>
        <div>
          <dt>Станет</dt>
          <dd>
            {`${target.width}×${target.height}`}
            {` · ${megapixels(target.width, target.height)} Мп`}
          </dd>
        </div>
      </dl>

      <label className="field">
        <span>Единицы</span>
        <select value={unit} onChange={(event) => handleUnitChange(event.target.value)}>
          <option value="percent">Проценты</option>
          <option value="pixels">Пиксели</option>
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Ширина{unit === "percent" ? ", %" : ", px"}</span>
          <input
            type="number"
            min={unit === "percent" ? 1 : 1}
            value={width}
            onChange={(event) => handleWidthChange(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Высота{unit === "percent" ? ", %" : ", px"}</span>
          <input
            type="number"
            min={1}
            value={height}
            onChange={(event) => handleHeightChange(event.target.value)}
          />
        </label>
      </div>

      <label className="field-inline">
        <input type="checkbox" checked={linked} onChange={(event) => setLinked(event.target.checked)} />
        <span>Сохранять пропорции</span>
      </label>

      <label className="field">
        <span>Интерполяция</span>
        <select value={method} onChange={(event) => setMethod(event.target.value)}>
          {interpolationList().map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint" role="tooltip">
        {INTERPOLATIONS[method].description}
      </p>

      {!isValid ? (
        <p className="field-error">
          Размер должен быть от 1 до {MAX_SIDE} пикселей по каждой стороне.
        </p>
      ) : null}
    </Modal>
  );
}
