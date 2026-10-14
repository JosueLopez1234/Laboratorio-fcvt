"use client";
import { useState } from "react";
import { Monitor, Check, X, Clock, ClipboardCheck, TriangleAlert } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";

type Estado = "pendiente" | "aprobado" | "rechazado";
type Paso = "done" | "current" | "todo";

type Sol = {
  id: number;
  docente: string;
  lab: string;
  fecha: string;
  inicio: string;
  fin: string;
  est: number;
  estado: Estado;
  motivo?: string;
};

/* ---------- BASE DE DATOS FALSA (solo para ver los estados) ----------
   Cuando tengas la API real, reemplaza este arreglo por tu fetch. */
const MOCK: Sol[] = [
  { id: 1, docente: "Ana Mora", lab: "201", fecha: "Lun 06/10", inicio: "08:00", fin: "10:00", est: 28, estado: "pendiente" },
  { id: 2, docente: "Mario Cedeño", lab: "201", fecha: "Lun 06/10", inicio: "09:00", fin: "11:00", est: 20, estado: "pendiente" },
  { id: 3, docente: "Luis Vera", lab: "103", fecha: "Mar 07/10", inicio: "10:00", fin: "12:00", est: 35, estado: "pendiente" },
  { id: 4, docente: "Rosa Pinto", lab: "204", fecha: "Mié 08/10", inicio: "14:00", fin: "16:00", est: 22, estado: "aprobado" },
];

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
const cruza = (a: Sol, b: Sol) =>
  a.id !== b.id && a.lab === b.lab && a.fecha === b.fecha &&
  b.estado !== "rechazado" && a.inicio < b.fin && b.inicio < a.fin;

export default function Solicitudes() {
  const [items, setItems] = useState<Sol[]>(MOCK);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");
  const [rechazando, setRechazando] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");

  const aprobar = (id: number) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "aprobado" } : x)));

  const confirmarRechazo = (id: number) => {
    setItems((xs) =>
      xs.map((x) => (x.id === id ? { ...x, estado: "rechazado", motivo: motivo.trim() || undefined } : x)),
    );
    setRechazando(null);
    setMotivo("");
  };

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const q = busqueda.trim().toLowerCase();
  const visibles = items
    .filter((i) => filtro === "todas" || i.estado === filtro)
    .filter((i) => !q || i.docente.toLowerCase().includes(q) || i.lab.includes(q));

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Solicitudes</h1>
      <p className="dd-subtitle">Revisa y responde las reservas de laboratorio.</p>

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

        {visibles.length === 0 ? (
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
              const meta = [s.fecha, `${s.inicio} - ${s.fin}`, `${s.est} estudiantes`, `Solicitante\n${s.docente}`];
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

                  {s.estado === "pendiente" && !abierto && (
                    <div className="dd-card__actions" style={{ justifyContent: "flex-end" }}>
                      <div className="tt-btns">
                        <button
                          className="dd-btn dd-btn--danger"
                          onClick={() => { setRechazando(s.id); setMotivo(""); }}
                        >
                          <X /> Rechazar
                        </button>
                        <button
                          className="dd-btn dd-btn--primary"
                          onClick={() => aprobar(s.id)}
                          disabled={bloqueada}
                          style={bloqueada ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                        >
                          <Check /> Aprobar
                        </button>
                      </div>
                    </div>
                  )}

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
                        <button className="dd-btn dd-btn--danger" onClick={() => confirmarRechazo(s.id)}>
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
    </ShellDocente>
  );
}