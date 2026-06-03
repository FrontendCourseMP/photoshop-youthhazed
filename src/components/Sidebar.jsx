import { formatBytes } from "../lib/fileio.js";
import ChannelPanel from "./ChannelPanel.jsx";

export default function Sidebar({
  meta,
  modeLabel,
  hasImage,
  sourceImageData,
  activeTool,
  onSelectTool,
  zoom,
  onZoom,
  onFit,
  descriptors,
  channels,
  onToggleChannel,
  onOpenLevels,
  onOpenResize,
  onOpenFilter,
}) {
  return (
    <aside className="panel">
      <section>
        <h2>Файл</h2>
        <dl className="meta">
          <MetaRow label="Имя" value={meta.fileName || "-"} />
          <MetaRow label="Формат" value={meta.format || "-"} />
          <MetaRow label="Размер" value={meta.fileSize ? formatBytes(meta.fileSize) : "-"} />
          <MetaRow label="Режим" value={modeLabel} />
        </dl>
      </section>

      <section>
        <h2>Инструменты</h2>
        <div className="segmented">
          <button
            className={activeTool === "cursor" ? "selected" : ""}
            type="button"
            onClick={() => onSelectTool("cursor")}
          >
            Курсор
          </button>
          <button
            className={activeTool === "eyedropper" ? "selected" : ""}
            type="button"
            onClick={() => onSelectTool("eyedropper")}
            disabled={!hasImage}
          >
            Пипетка
          </button>
        </div>
      </section>

      <section>
        <h2>Коррекция</h2>
        <div className="stack">
          <button className="button wide-button" type="button" onClick={onOpenLevels} disabled={!hasImage}>
            Уровни…
          </button>
          <button className="button wide-button" type="button" onClick={onOpenResize} disabled={!hasImage}>
            Размер изображения…
          </button>
          <button className="button wide-button" type="button" onClick={onOpenFilter} disabled={!hasImage}>
            Фильтрация…
          </button>
        </div>
      </section>

      <section>
        <h2>Масштаб</h2>
        <div className="zoom-row">
          <button className="small-button" type="button" onClick={() => onZoom(zoom / 1.25)} disabled={!hasImage}>-</button>
          <button className="small-button wide" type="button" onClick={() => onZoom(1)} disabled={!hasImage}>{Math.round(zoom * 100)}%</button>
          <button className="small-button" type="button" onClick={() => onZoom(zoom * 1.25)} disabled={!hasImage}>+</button>
          <button className="small-button fit" type="button" onClick={onFit} disabled={!hasImage}>Подогнать</button>
        </div>
        <input
          className="zoom-range"
          type="range"
          min={12}
          max={300}
          step={1}
          value={Math.round(zoom * 100)}
          onChange={(event) => onZoom(Number(event.target.value) / 100)}
          disabled={!hasImage}
          aria-label="Масштаб, проценты"
        />
      </section>

      <section>
        <h2>Каналы</h2>
        <ChannelPanel
          source={sourceImageData}
          descriptors={descriptors}
          channels={channels}
          onToggle={onToggleChannel}
        />
      </section>

      <section>
        <h2>GrayBit-7</h2>
        <p className="note">
          При сохранении в GB7 изображение переводится в оттенки серого.
          Прозрачность сохраняется как 1-битная маска.
        </p>
      </section>
    </aside>
  );
}

function MetaRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
