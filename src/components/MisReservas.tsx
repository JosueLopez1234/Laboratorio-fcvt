"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Eye, TriangleAlert, Clock, Check, Play, X, CalendarX } from "lucide-react";
import {
  cargarMisReservas, cancelarReserva, mensajeError,
  type ReservaUI, type EstadoUI,
} from "@/lib/reservas";
import DetalleModal from "@/components/DetalleModal";

type Paso = "done" | "current" | "todo";

const PASOS: Record<EstadoUI, Paso[]> = {
  pendiente: ["done", "done", "current", "todo"],
  aprobado: ["done", "done", "done", "todo"],
  "en-curso": ["done", "done", "done", "current"],
  finalizado: ["done", "done", "done", "done"],
  rechazado: ["done", "done", "current", "todo"],
  cancelado: ["done", "todo", "todo", "todo"],
};

const BADGE: Record<EstadoUI, { t: string; i: React.ReactNode }> = {
  pendiente: { t: "Pendiente", i: <Clock size={12} /> },
  aprobado: { t: "Aprobado", i: <Check size={12} /> },
  "en-curso": { t: "En curso", i: <Play size={12} /> },
  finalizado: { t: "Finalizado", i: <Check size={12} /> },
  rechazado: { t: "Rechazada", i: <X size={12} /> },
  cancelado: { t: "Cancelada", i: <X size={12} /> },
};

type Filtro = "todas" | EstadoUI;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "en-curso", t: "En curso" },
  { id: "finalizado", t: "Finalizadas" },
  { id: "rechazado", t: "Rechazadas" },
  { id: "cancelado", t: "Canceladas" },
];

function Tarjeta({
  r, onCancelar, onDetalle,
}: { r: ReservaUI; onCancelar: (id: string) => void; onDetalle: (r: ReservaUI) => void }) {
  const pasos = PASOS[r.estado];
  const etiquetas = ["Solicitud", "Revisión", "Aprobación", "Uso"];
  const meta = [r.fecha, r.hora, `${r.estudiantes} estudiantes`, `Solicitante\n${r.solicitante}`];
  return (
    <article className="dd-card" data-estado={r.estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Monitor size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">{r.lab}</h3>
          <p className="dd-card__place">Facultad de Ciencias de la Vida y Tecnología</p>
        </div>
        <span className="dd-badge">{BADGE[r.estado].i}{BADGE[r.estado].t}</span>
      </div>
      <div className="dd-steps">
        {etiquetas.map((e, k) => (
          <div key={e} className={`dd-step is-${pasos[k]}`}>
            <span className="dd-step__meta" style={{ whiteSpace: "pre-line" }}>{meta[k]}</span>
            <span className="dd-step__dot">{pasos[k] === "done" && <Check />}</span>
            <span className="dd-step__label">{e}</span>
          </div>
        ))}
      </div>
      {r.estado === "rechazado" && r.motivo && <p className="tt-meta">Motivo del rechazo: {r.motivo}</p>}
      <div className="dd-card__actions">
        <button type="button" className="dd-btn dd-btn--ghost" onClick={() => onDetalle(r)}>
          <Eye /> Ver detalles
        </button>
        {r.estado === "pendiente" && (
          <button type="button" className="dd-btn dd-btn--danger" onClick={() => onCancelar(r.id)}>
            <X /> Cancelar reserva
          </button>
        )}
        {r.estado === "en-curso" && (
          <Link href="/docente/falla" className="dd-btn dd-btn--primary">
            <TriangleAlert /> Reportar inconveniente
          </Link>
        )}
      </div>
    </article>
  );
}

/* Filtros + lista de reservas del docente que inició sesión. */
export default function MisReservas() {
  const [items, setItems] = useState<ReservaUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detalle, setDetalle] = useState<ReservaUI | null>(null);

  useEffect(() => {
    cargarMisReservas()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  const cerrarDetalle = useCallback(() => setDetalle(null), []);

  const cancelar = async (id: string) => {
    if (!window.confirm("¿Cancelar esta reserva?")) return;
    try {
      await cancelarReserva(id);
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "cancelado" } : x)));
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const visibles = filtro === "todas" ? items : items.filter((i) => i.estado === filtro);

  const filasDetalle = (r: ReservaUI): [string, string][] => {
    const filas: [string, string][] = [
      ["Laboratorio", r.lab],
      ["Fecha", r.fecha],
      ["Horario", r.hora],
      ["Estudiantes", String(r.estudiantes)],
      ["Solicitante", r.solicitante],
      ["Estado", BADGE[r.estado].t],
    ];
    if (r.estado === "rechazado" && r.motivo) filas.push(["Motivo", r.motivo]);
    return filas;
  };

  return (
    <>
      <div className="dd-chips" role="tablist" aria-label="Filtrar reservas">
        {FILTROS.map((f) => (
          <button
            key={f.id} type="button" role="tab" aria-selected={filtro === f.id}
            className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.t} ({contar(f.id)})
          </button>
        ))}
      </div>

      {error && <p className="ss-error" role="alert">{error}</p>}

      {cargando ? (
        <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando reservas…</p>
      ) : visibles.length === 0 ? (
        <div className="dd-empty" role="status">
          <span className="dd-empty__icon"><CalendarX size={28} /></span>
          <p className="dd-empty__title">Aún no hay reservas</p>
          <p className="dd-empty__text">
            {items.length > 0
              ? "No tienes reservas con este estado."
              : "Cuando reserves un laboratorio, aparecerá aquí."}
          </p>
        </div>
      ) : (
        <div className="dd-list">
          {visibles.map((r) => (
            <Tarjeta key={r.id} r={r} onCancelar={cancelar} onDetalle={setDetalle} />
          ))}
        </div>
      )}

      {detalle && (
        <DetalleModal titulo={detalle.lab} filas={filasDetalle(detalle)} onClose={cerrarDetalle} />
      )}
    </>
  );
}