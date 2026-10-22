"use client";

import { useEffect, useState } from "react";
import { Package, Check, X, Clock, ClipboardCheck } from "lucide-react";
import { cargarMaterialTec, responderMaterial, type MaterialTec } from "@/lib/material";
import { mensajeError } from "@/lib/reservas";

type Estado = MaterialTec["estado"];
type Filtro = "todas" | Estado;

const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobada", t: "Aprobadas" },
  { id: "rechazada", t: "Rechazadas" },
];

/* data-estado reutiliza los colores que ya existen en globals.css */
const CSS_ESTADO: Record<Estado, string> = { pendiente: "pendiente", aprobada: "aprobado", rechazada: "rechazado" };
const BADGE: Record<Estado, { t: string; i: React.ReactNode }> = {
  pendiente: { t: "Pendiente", i: <Clock size={12} /> },
  aprobada: { t: "Aprobada", i: <Check size={12} /> },
  rechazada: { t: "Rechazada", i: <X size={12} /> },
};

export default function SolicitudesMaterial() {
  const [items, setItems] = useState<MaterialTec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);

  useEffect(() => {
    cargarMaterialTec()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  const responder = async (id: string, estado: "aprobada" | "rechazada") => {
    setError(""); setOcupado(id);
    try {
      const m = motivo.trim();
      await responderMaterial(id, estado, m);
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado, motivo: estado === "rechazada" ? m || undefined : undefined } : x)));
      setRechazando(null);
      setMotivo("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const visibles = filtro === "todas" ? items : items.filter((i) => i.estado === filtro);

  return (
    <section className="dd-reservas">
      <div className="dd-chips" role="tablist" aria-label="Filtrar solicitudes de material">
        {FILTROS.map((f) => (
          <button
            key={f.id} role="tab" aria-selected={filtro === f.id}
            className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.t} ({contar(f.id)})
          </button>
        ))}
      </div>

      {error && <p className="ss-error" role="alert">{error}</p>}

      {cargando ? (
        <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando solicitudes…</p>
      ) : visibles.length === 0 ? (
        <div className="dd-empty" role="status">
          <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
          <p className="dd-empty__title">No hay solicitudes de material</p>
          <p className="dd-empty__text">
            {items.length > 0 ? "No hay solicitudes con este estado." : "Cuando un docente pida material, aparecerá aquí."}
          </p>
        </div>
      ) : (
        <div className="dd-list">
          {visibles.map((s) => {
            const unidades = s.items.reduce((n, i) => n + i.cantidad, 0);
            const abierto = rechazando === s.id;
            return (
              <article key={s.id} className="dd-card" data-estado={CSS_ESTADO[s.estado]}>
                <div className="dd-card__top">
                  <span className="dd-card__avatar"><Package size={20} /></span>
                  <div className="dd-card__info">
                    <h3 className="dd-card__name">Material para el Laboratorio {s.lab}</h3>
                    <p className="dd-card__place">{unidades} {unidades === 1 ? "unidad" : "unidades"}, {s.carrera}, {s.periodo}</p>
                  </div>
                  <span className="dd-badge">{BADGE[s.estado].i}{BADGE[s.estado].t}</span>
                </div>

                <ul className="tt-meta" style={{ listStyle: "none", padding: 0 }}>
                  {s.items.map((i) => <li key={i.material}>× {i.cantidad} {i.material}</li>)}
                </ul>
                {s.justificacion && <p className="tt-meta">Justificación: {s.justificacion}</p>}
                <p className="tt-meta">Pedido el {s.fecha} por {s.docente} (Docente)</p>
                {s.estado === "rechazada" && s.motivo && <p className="tt-meta">Motivo del rechazo: {s.motivo}</p>}

                {s.estado === "pendiente" && !abierto && (
                  <div className="dd-card__actions" style={{ justifyContent: "flex-end" }}>
                    <div className="tt-btns">
                      <button className="dd-btn dd-btn--danger" disabled={ocupado === s.id}
                        onClick={() => { setRechazando(s.id); setMotivo(""); }}>
                        <X /> Rechazar
                      </button>
                      <button className="dd-btn dd-btn--primary" disabled={ocupado === s.id}
                        onClick={() => responder(s.id, "aprobada")}>
                        <Check /> {ocupado === s.id ? "Guardando…" : "Aprobar"}
                      </button>
                    </div>
                  </div>
                )}

                {abierto && (
                  <div className="tt-reject">
                    <label htmlFor={`motivo-m-${s.id}`} className="ss-label">Motivo del rechazo (opcional)</label>
                    <textarea
                      id={`motivo-m-${s.id}`} className="input" rows={2} value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej: No hay stock de este material"
                    />
                    <div className="tt-btns">
                      <button className="dd-btn dd-btn--ghost" onClick={() => setRechazando(null)}>Cancelar</button>
                      <button className="dd-btn dd-btn--danger" disabled={ocupado === s.id}
                        onClick={() => responder(s.id, "rechazada")}>
                        <X /> Confirmar rechazo
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}