export default function Toolbar({ hasImage, onOpen, onSave, onClose }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">GB7</span>
        <div>
          <h1>Редактор изображений</h1>
          <p>PNG, JPG и GrayBit-7</p>
        </div>
      </div>

      <div className="actions">
        <button className="button primary" type="button" onClick={onOpen}>
          Открыть
        </button>
        <button className="button" type="button" onClick={() => onSave("PNG")} disabled={!hasImage}>
          PNG
        </button>
        <button className="button" type="button" onClick={() => onSave("JPG")} disabled={!hasImage}>
          JPG
        </button>
        <button className="button" type="button" onClick={() => onSave("GB7")} disabled={!hasImage}>
          GB7
        </button>
        <button className="button" type="button" onClick={onClose} disabled={!hasImage}>
          Закрыть
        </button>
      </div>
    </header>
  );
}
