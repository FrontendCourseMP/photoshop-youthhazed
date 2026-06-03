import { useRef } from "react";
import {
  LEVELS_MAX,
  gammaToMidFraction,
  midFractionToGamma,
} from "../lib/levels.js";

// Три маркера входных уровней под гистограммой: чёрная точка, гамма
// (полутона) и белая точка. Чёрная не заходит за белую и наоборот,
// маркер гаммы всегда между ними.
export default function LevelsSlider({ value, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(null);

  const { black, white, gamma } = value;
  const midValue = black + gammaToMidFraction(gamma) * (white - black);

  const toPercent = (level) => (level / LEVELS_MAX) * 100;

  function positionToLevel(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(fraction * LEVELS_MAX);
  }

  function handlePointerDown(marker) {
    return (event) => {
      event.preventDefault();
      dragging.current = marker;
      event.currentTarget.setPointerCapture(event.pointerId);
    };
  }

  function handlePointerMove(event) {
    if (!dragging.current) {
      return;
    }

    const level = positionToLevel(event.clientX);

    if (dragging.current === "black") {
      onChange({ ...value, black: Math.min(level, white - 1) });
    } else if (dragging.current === "white") {
      onChange({ ...value, white: Math.max(level, black + 1) });
    } else {
      const clamped = Math.min(white - 1, Math.max(black + 1, level));
      const fraction = (clamped - black) / (white - black);
      onChange({ ...value, gamma: midFractionToGamma(fraction) });
    }
  }

  function handlePointerUp(event) {
    dragging.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div
      className="levels-slider"
      ref={trackRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="levels-track" />
      <button
        type="button"
        className="levels-marker black"
        style={{ left: `${toPercent(black)}%` }}
        onPointerDown={handlePointerDown("black")}
        aria-label="Точка чёрного"
      />
      <button
        type="button"
        className="levels-marker gamma"
        style={{ left: `${toPercent(midValue)}%` }}
        onPointerDown={handlePointerDown("gamma")}
        aria-label="Полутона (гамма)"
      />
      <button
        type="button"
        className="levels-marker white"
        style={{ left: `${toPercent(white)}%` }}
        onPointerDown={handlePointerDown("white")}
        aria-label="Точка белого"
      />
    </div>
  );
}
