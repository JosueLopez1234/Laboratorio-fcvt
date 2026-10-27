"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function DetalleModal({
  titulo, filas, onClose, children,
}: {
  titulo: string;
  filas: [string, string][];
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", alTeclear);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = previo;
    };
  }, [onClose]);

  if (!montado) return null;

  // Portal: el modal se pinta directo en <body>, fuera de cualquier contenedor
  return createPortal(
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
    </div>,
    document.body,
  );
}