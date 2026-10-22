"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Package, Wrench, Eye, Check, X, Clock, ClipboardCheck } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import {
  cargarSolicitudes, responderReserva, mensajeError, fechaLarga,
  type SolicitudTec,
} from "@/lib/reservas";
import { contarPendientes } from "@/lib/pendientes";

type Estado = SolicitudTec["estado"];

const etiqueta = (estado: Estado) =>
  estado === "pendiente"
    ? { t: "Pendiente", i: <Clock size={12} /> }
    : estado === "rechazado"
      ? { t: "Rechazada", i: <X size={12} /> }
      : { t: "Aprobada", i: <Check size={12} /> };

type Filtro = "todas" | Estado;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "rechazado", t: "Rechazadas" },
];

function Tarjeta({
  s, ocupado, onCambiar,
}: { s: SolicitudTec; ocupado: boolean; onCambiar: (id: string, e: "aprobada" | "rechazada") => void }) {
  const e = etiqueta(s.estado);
  return (
    <article className="dd-card" data-estado={s.estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Monitor size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">Laboratorio {s.lab}</h3>
          <p className="dd-card__place">{fechaLarga(s.fecha)}, {s.inicio} - {s.fin}, {s.est} estudiantes</p>
        </div>
        <span className="dd-badge">{e.i}{e.t}</span>
      </div>
      <p className="tt-meta">Solicitado por {s.docente} (Docente)</p>
      {s.estado === "rechazado" && s.motivo && <p className="tt-meta">Motivo del rechazo: {s.motivo}</p>}
      <div className="dd-card__actions">
        <Link href="/tecnico/solicitudes" className="dd-btn dd-btn--ghost"><Eye /> Ver detalles</Link>
        {s.estado === "pendiente" && (
          <div className="tt-btns">
            <button className="dd-btn dd-btn--danger" disabled={ocupado} onClick={() => onCambiar(s.id, "rechazada")}>
              <X /> Rechazar
            </button>
            <button className="dd-btn dd-btn--primary" disabled={ocupado} onClick={() => onCambiar(s.id, "aprobada")}>
              <Check /> Aprobar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function DashboardTecnico() {
  const [items, setItems] = useState<SolicitudTec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [extra, setExtra] = useState({ material: 0, fallas: 0 });

  useEffect(() => {
    cargarSolicitudes()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    contarPendientes().then(setExtra).catch(() => {});
  }, []);

  const cambiar = async (id: string, estado: "aprobada" | "rechazada") => {
    setError(""); setOcupado(id);
    try {
      await responderReserva(id, estado);
      setItems((xs) =>
        xs.map((x) => (x.id === id ? { ...x, estado: estado === "aprobada" ? "aprobado" : "rechazado" } : x)),
      );
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const visibles = filtro === "todas" ? items : items.filter((i) => i.estado === filtro);
  const pendientes = items.filter((i) => i.estado === "pendiente").length;

  const resumen = [
    { t: "Laboratorios", n: pendientes, icono: <Monitor size={20} /> },
    { t: "Material", n: extra.material, icono: <Package size={20} /> },
    { t: "Fallas", n: extra.fallas, icono: <Wrench size={20} /> },
  ];
  const porAtender = pendientes + extra.material + extra.fallas;

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">¡Bienvenido!</h1>
      <p className="dd-subtitle">Revisa las solicitudes y fallas de los laboratorios.</p>

      <section className="tt-stats" aria-label="Resumen de pendientes">
        <div className="tt-stat tt-stat--main">
          <span className="tt-stat__icon"><ClipboardCheck size={20} /></span>
          <div>
            <p className="tt-stat__n">{porAtender}</p>
            <p className="tt-stat__t">Por atender</p>
          </div>
        </div>
        {resumen.map((r) => (
          <div key={r.t} className="tt-stat">
            <span className="tt-stat__icon">{r.icono}</span>
            <div>
              <p className="tt-stat__n">{r.n}</p>
              <p className="tt-stat__t">{r.t}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Solo móvil */}
      <section className="dd-services">
        <h2 className="dd-section-title">Panel de servicios</h2>
        <p className="dd-section-sub">¿Qué necesitas hacer?</p>
        <div className="dd-services__grid">
          {MENU_TECNICO.map(({ href, t, i: Icon }) => (
            <Link key={href} href={href} className="dd-service">
              <span className="dd-service__icon"><Icon size={20} /></span>{t}
            </Link>
          ))}
        </div>
      </section>

      <section className="dd-reservas">
        <div className="dd-reservas__head">
          <h2 className="dd-section-title">Solicitudes</h2>
        </div>
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

        {error && <p className="ss-error" role="alert">{error}</p>}

        {cargando ? (
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando solicitudes…</p>
        ) : visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
            <p className="dd-empty__title">No hay solicitudes</p>
            <p className="dd-empty__text">
              {items.length > 0
                ? "No hay solicitudes con este estado."
                : "Cuando un docente o estudiante envíe algo, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <div className="dd-list">
            {visibles.map((s) => (
              <Tarjeta key={s.id} s={s} ocupado={ocupado === s.id} onCambiar={cambiar} />
            ))}
          </div>
        )}
      </section>
    </ShellDocente>
  );
}