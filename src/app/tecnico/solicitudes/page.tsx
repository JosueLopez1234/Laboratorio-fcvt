"use client";

import { useEffect, useState } from "react";
import { Monitor, Check, X, Clock, ClipboardCheck, TriangleAlert, Eye } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import SolicitudesMaterial from "@/components/Solicitudesmateriales";
import DetalleModal from "@/components/DetalleModal";
import {
  cargarSolicitudes, responderReserva, mensajeError, fechaLarga,
  type SolicitudTec,
} from "@/lib/reservas";

type Estado = SolicitudTec["estado"];
type Paso = "done" | "current" | "todo";

const PASOS: Record<Estado, Paso[]> = {
  pendiente: ["done", "done", "current", "todo"],
  aprobado: ["done", "done", "done", "todo"],
  rechazado: ["done", "done", "current", "todo"],
};
const ETIQUETAS = ["Solicitud", "Revisión", "Aprobación", "Uso"];

const BADGE: Record<Estado, { t: string; i: React.ReactNode }> = {
  pendiente: { t: "Pendiente", i: <Clock size={12} /> },
  aprobado: { t: "Aprobada", i: <Check size={12} /> },
  rechazado: { t: "Rechazada", i: <X size={12} /> },
};

type Filtro = "todas" | Estado;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "rechazado", t: "Rechazadas" },
];

/* Dos solicitudes chocan si piden el mismo laboratorio, el mismo día y las horas se cruzan */
const cruza = (a: SolicitudTec, b: SolicitudTec) =>
  a.id !== b.id && a.lab === b.lab && a.fecha === b.fecha &&
  b.estado !== "rechazado" && a.inicio < b.fin && b.inicio < a.fin;

export default function Solicitudes() {
  const [items, setItems] = useState<SolicitudTec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tipo, setTipo] = useState<"laboratorio" | "material">("laboratorio");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<SolicitudTec | null>(null); // <- ahora DENTRO del componente

  useEffect(() => {
    cargarSolicitudes()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  const aprobar = async (id: string) => {
    setError(""); setOcupado(id);
    try {
      await responderReserva(id, "aprobada");
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "aprobado" } : x)));
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const confirmarRechazo = async (id: string) => {
    setError(""); setOcupado(id);
    try {
      const m = motivo.trim();
      await responderReserva(id, "rechazada", m);
      setItems((xs) =>
        xs.map((x) => (x.id === id ? { ...x, estado: "rechazado", motivo: m || undefined } : x)),
      );
      setRechazando(null);
      setMotivo("");
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const q = busqueda.trim().toLowerCase();
  const visibles = items
    .filter((i) => filtro === "todas" || i.estado === filtro)
    .filter((i) => !q || i.docente.toLowerCase().includes(q) || i.lab.includes(q));

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Solicitudes</h1>
      <p className="dd-subtitle">Revisa y responde las reservas de laboratorio y los pedidos de material.</p>

      <div className="dd-chips" role="tablist" aria-label="Tipo de solicitud">
        {([["laboratorio", "Laboratorios"], ["material", "Material"]] as const).map(([id, t]) => (
          <button
            key={id} role="tab" aria-selected={tipo === id}
            className={`dd-chip ${tipo === id ? "is-active" : ""}`}
            onClick={() => setTipo(id)}
          >
            {t}
          </button>
        ))}
      </div>

      {tipo === "material" ? <SolicitudesMaterial /> : (
      <section className="dd-reservas">
        <div className="dd-chips" role="tablist" aria-label="Filtrar solicitudes">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtro === f.id}
              className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.t} ({contar(f.id)})
            </button>
          ))}
        </div>

        <div className="tt-search">
          <label htmlFor="busqueda" className="ss-label">Buscar</label>
          <input
            id="busqueda" className="input" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Docente o número de laboratorio"
          />
        </div>

        {error && <p className="ss-error" role="alert">{error}</p>}

        {cargando ? (
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando solicitudes…</p>
        ) : visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
            <p className="dd-empty__title">No hay solicitudes</p>
            <p className="dd-empty__text">
              {items.length > 0
                ? "Ninguna solicitud coincide con el filtro o la búsqueda."
                : "Cuando un docente reserve un laboratorio, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <div className="dd-list">
            {visibles.map((s) => {
              const pasos = PASOS[s.estado];
              const choques = items.filter((x) => cruza(s, x));
              const bloqueada = choques.some((x) => x.estado === "aprobado");
              const meta = [fechaLarga(s.fecha), `${s.inicio} - ${s.fin}`, `${s.est} estudiantes`, `Solicitante\n${s.docente}`];
              const abierto = rechazando === s.id;
              return (
                <article key={s.id} className="dd-card" data-estado={s.estado}>
                  <div className="dd-card__top">
                    <span className="dd-card__avatar"><Monitor size={20} /></span>
                    <div className="dd-card__info">
                      <h3 className="dd-card__name">Laboratorio {s.lab}</h3>
                      <p className="dd-card__place">Solicitado por {s.docente}</p>
                    </div>
                    <span className="dd-badge">{BADGE[s.estado].i}{BADGE[s.estado].t}</span>
                  </div>

                  <div className="dd-steps">
                    {ETIQUETAS.map((e, k) => (
                      <div key={e} className={`dd-step is-${pasos[k]}`}>
                        <span className="dd-step__meta" style={{ whiteSpace: "pre-line" }}>{meta[k]}</span>
                        <span className="dd-step__dot">{pasos[k] === "done" && <Check />}</span>
                        <span className="dd-step__label">{e}</span>
                      </div>
                    ))}
                  </div>

                  {s.estado === "rechazado" && s.motivo && (
                    <p className="tt-meta">Motivo del rechazo: {s.motivo}</p>
                  )}

                  {s.estado === "pendiente" && choques.length > 0 && (
                    <p className="tt-warn" role="status">
                      <TriangleAlert size={14} />
                      {bloqueada
                        ? "Ya hay una solicitud aprobada en este horario. No se puede aprobar."
                        : `Se cruza con la solicitud de ${choques.map((c) => c.docente).join(", ")}.`}
                    </p>
                  )}

                  {/* Esta fila ahora aparece SIEMPRE: "Ver detalles" en cualquier estado */}
                  <div className="dd-card__actions">
                    <button type="button" className="dd-btn dd-btn--ghost" onClick={() => setDetalle(s)}>
                      <Eye /> Ver detalles
                    </button>

                    {s.estado === "pendiente" && !abierto && (
                      <div className="tt-btns">
                        <button
                          className="dd-btn dd-btn--danger"
                          disabled={ocupado === s.id}
                          onClick={() => { setRechazando(s.id); setMotivo(""); }}
                        >
                          <X /> Rechazar
                        </button>
                        <button
                          className="dd-btn dd-btn--primary"
                          onClick={() => aprobar(s.id)}
                          disabled={bloqueada || ocupado === s.id}
                          style={bloqueada ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        >
                          <Check /> {ocupado === s.id ? "Guardando…" : "Aprobar"}
                        </button>
                      </div>
                    )}
                  </div>

                  {abierto && (
                    <div className="tt-reject">
                      <label htmlFor={`motivo-${s.id}`} className="ss-label">Motivo del rechazo (opcional)</label>
                      <textarea
                        id={`motivo-${s.id}`} className="input" rows={2} value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                        placeholder="Ej: El laboratorio estará en mantenimiento"
                      />
                      <div className="tt-btns">
                        <button className="dd-btn dd-btn--ghost" onClick={() => setRechazando(null)}>Cancelar</button>
                        <button
                          className="dd-btn dd-btn--danger"
                          disabled={ocupado === s.id}
                          onClick={() => confirmarRechazo(s.id)}
                        >
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
      )}

      {/* Modal de detalles (faltaba) */}
      {detalle && (
        <DetalleModal
          titulo={`Laboratorio ${detalle.lab}`}
          onClose={() => setDetalle(null)}
          filas={[
            ["Solicitante", detalle.docente],
            ["Fecha", fechaLarga(detalle.fecha)],
            ["Horario", `${detalle.inicio} - ${detalle.fin}`],
            ["Estudiantes", String(detalle.est)],
            ["Estado", BADGE[detalle.estado].t],
            ...(detalle.motivo ? [["Motivo del rechazo", detalle.motivo] as [string, string]] : []),
          ]}
        />
      )}
    </ShellDocente>
  );
}