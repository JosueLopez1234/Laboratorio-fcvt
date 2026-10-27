"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export default function DetalleModal({
  titulo, filas, onClose, children,
}: {
  titulo: string;
  filas: [string, string][];
  onClose: () => void;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onClose]);

  return (
    <div className="dm-overlay" onClick={onClose}>
      <div
        className="dm-box" role="dialog" aria-modal="true" aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dm-head">
          <h2 className="dm-title">{titulo}</h2>
          <button type="button" className="dd-icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X />
          </button>
        </div>
        <dl className="ss-sum__list">
          {filas.map(([k, v]) => (
            <div key={k} className="ss-sum__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </div>
  );
}