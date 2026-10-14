"use client";
import { useState } from "react";
import Link from "next/link";
import { Monitor, Package, Wrench, Eye, Check, X, Clock, ClipboardCheck } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";

type Tipo = "laboratorio" | "material" | "falla";
type Estado = "pendiente" | "aprobado" | "rechazado";

type Solicitud = {
  id: number;
  tipo: Tipo;
  titulo: string;
  detalle: string;
  fecha: string;
  solicitante: string;
  rol: "Docente" | "Estudiante";
  estado: Estado;
};

/* ---------- BASE DE DATOS FALSA (solo para ver los estados) ----------
   Pon USAR_MOCK en false para ver el mensaje "No hay solicitudes".
   Cuando tengas la API real, reemplaza el estado inicial por tu fetch. */
const USAR_MOCK = true;

const MOCK: Solicitud[] = [
  { id: 1, tipo: "laboratorio", titulo: "Laboratorio 203", detalle: "14 Oct 2026, 10:00 - 12:00, 25 estudiantes", fecha: "14 Oct 2026", solicitante: "Juan Pérez", rol: "Docente", estado: "pendiente" },
  { id: 2, tipo: "falla", titulo: "Falla en PC-12", detalle: "Laboratorio 203, no enciende", fecha: "14 Oct 2026", solicitante: "Ana Mora", rol: "Estudiante", estado: "pendiente" },
  { id: 3, tipo: "material", titulo: "Cable HDMI × 2, Mouse × 1", detalle: "Para el Laboratorio 105", fecha: "13 Oct 2026", solicitante: "Juan Pérez", rol: "Docente", estado: "pendiente" },
  { id: 4, tipo: "laboratorio", titulo: "Laboratorio 105", detalle: "15 Oct 2026, 08:00 - 10:00, 20 estudiantes", fecha: "12 Oct 2026", solicitante: "Juan Pérez", rol: "Docente", estado: "aprobado" },
  { id: 5, tipo: "falla", titulo: "Falla en PC-03", detalle: "Laboratorio 301, mouse/teclado no responde", fecha: "09 Oct 2026", solicitante: "Luis Vera", rol: "Estudiante", estado: "aprobado" },
  { id: 6, tipo: "material", titulo: "Disco duro × 3", detalle: "Para el Laboratorio 203", fecha: "08 Oct 2026", solicitante: "Juan Pérez", rol: "Docente", estado: "rechazado" },
];

const ICONO: Record<Tipo, React.ReactNode> = {
  laboratorio: <Monitor size={20} />,
  material: <Package size={20} />,
  falla: <Wrench size={20} />,
};
const NOMBRE_TIPO: Record<Tipo, string> = {
  laboratorio: "Laboratorios",
  material: "Material",
  falla: "Fallas",
};

const etiqueta = (s: Solicitud) =>
  s.estado === "pendiente"
    ? { t: "Pendiente", i: <Clock size={12} /> }
    : s.estado === "rechazado"
      ? { t: "Rechazada", i: <X size={12} /> }
      : { t: s.tipo === "falla" ? "Atendida" : "Aprobada", i: <Check size={12} /> };

type Filtro = "todas" | Estado;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "rechazado", t: "Rechazadas" },
];

function Tarjeta({
  s, onCambiar,
}: { s: Solicitud; onCambiar: (id: number, e: Estado) => void }) {
  const e = etiqueta(s);
  return (
    <article className="dd-card" data-estado={s.estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar">{ICONO[s.tipo]}</span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">{s.titulo}</h3>
          <p className="dd-card__place">{s.detalle}</p>
        </div>
        <span className="dd-badge">{e.i}{e.t}</span>
      </div>

      <p className="tt-meta">
        Pedido el {s.fecha} por {s.solicitante} ({s.rol})
      </p>

      <div className="dd-card__actions">
        <button className="dd-btn dd-btn--ghost"><Eye /> Ver detalles</button>
        {s.estado === "pendiente" && (
          <div className="tt-btns">
            <button className="dd-btn dd-btn--danger" onClick={() => onCambiar(s.id, "rechazado")}>
              <X /> Rechazar
            </button>
            <button className="dd-btn dd-btn--primary" onClick={() => onCambiar(s.id, "aprobado")}>
              <Check /> {s.tipo === "falla" ? "Atender" : "Aprobar"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function DashboardTecnico() {
  const [items, setItems] = useState<Solicitud[]>(USAR_MOCK ? MOCK : []);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const cambiar = (id: number, estado: Estado) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado } : x)));

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.estado === f).length);
  const visibles = filtro === "todas" ? items : items.filter((i) => i.estado === filtro);
  const pendientesDe = (t: Tipo) => items.filter((i) => i.tipo === t && i.estado === "pendiente").length;
  const pendientes = items.filter((i) => i.estado === "pendiente").length;

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">¡Bienvenido!</h1>
      <p className="dd-subtitle">Revisa las solicitudes y fallas de los laboratorios.</p>

      <section className="tt-stats" aria-label="Resumen de pendientes">
        <div className="tt-stat tt-stat--main">
          <span className="tt-stat__icon"><ClipboardCheck size={20} /></span>
          <div>
            <p className="tt-stat__n">{pendientes}</p>
            <p className="tt-stat__t">Por atender</p>
          </div>
        </div>
        {(["laboratorio", "material", "falla"] as Tipo[]).map((t) => (
          <div key={t} className="tt-stat">
            <span className="tt-stat__icon">{ICONO[t]}</span>
            <div>
              <p className="tt-stat__n">{pendientesDe(t)}</p>
              <p className="tt-stat__t">{NOMBRE_TIPO[t]}</p>
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

        {visibles.length === 0 ? (
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
            {visibles.map((s) => <Tarjeta key={s.id} s={s} onCambiar={cambiar} />)}
          </div>
        )}
      </section>
    </ShellDocente>
  );
}