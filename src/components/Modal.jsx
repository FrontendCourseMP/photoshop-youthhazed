import { useEffect, useRef } from "react";

// Обобщённое модальное окно на нативном <dialog>. Переиспользуется для
// инструментов «Уровни», «Размер изображения», «Фильтрация».
// onClose вызывается при закрытии по Esc, клику по фону или крестику.
export default function Modal({ open, title, onClose, children, footer, className = "" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc вызывает событие cancel — закрываем через наш обработчик.
  function handleCancel(event) {
    event.preventDefault();
    onClose?.();
  }

  // Клик по подложке (вне содержимого) закрывает окно.
  function handleClick(event) {
    if (event.target === dialogRef.current) {
      onClose?.();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="modal-card">
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </div>
    </dialog>
  );
}
