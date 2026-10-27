"use client";
import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Wrench, Eye, Download, Clock, Check, Play } from "lucide-react";
import ShellDocente, { MENU_ESTUDIANTE } from "@/components/docente/ShellDocente";
import BannerCarrusel from "@/components/docente/BannerCarrusel";

type Paso = "done" | "current" | "todo";
type EstadoFalla = "pendiente" | "en-curso" | "finalizado";

type Acta = {
  id: number; tipo: "acta";
  carrera: string; periodo: string; fecha: string; estudiantes: number;
};
type Falla = {
  id: number; tipo: "falla";
  equipo: string; aula: string; fecha: string; falla: string; estado: EstadoFalla;
};
type Item = Acta | Falla;

/* TODO: reemplazar por el usuario logueado cuando tengas la sesión */
const USUARIO = "Juan Pérez";

/* ---------- BASE DE DATOS FALSA (solo para ver los estados) ----------
   Pon USAR_MOCK en false para ver el mensaje "Aún no hay actividad".
   Cuando tengas la API real, reemplaza ITEMS por tu fetch. */
const USAR_MOCK = true;

const MOCK: Item[] = [
  { id: 1, tipo: "falla", equipo: "PC-12", aula: "Laboratorio 203", fecha: "14 Oct 2026", falla: "No enciende", estado: "pendiente" },
  { id: 2, tipo: "falla", equipo: "PC-07", aula: "Laboratorio 105", fecha: "13 Oct 2026", falla: "Sin acceso a internet", estado: "en-curso" },
  { id: 3, tipo: "acta", carrera: "Ingeniería en Software", periodo: "2026-1", fecha: "12 Oct 2026", estudiantes: 12 },
  { id: 4, tipo: "falla", equipo: "PC-03", aula: "Laboratorio 301", fecha: "09 Oct 2026", falla: "Mouse/teclado no responde", estado: "finalizado" },
];

const ITEMS: Item[] = USAR_MOCK ? MOCK : [];

const PASOS_FALLA: Record<EstadoFalla, Paso[]> = {
  pendiente:  ["done", "current", "todo", "todo"],
  "en-curso": ["done", "done", "current", "todo"],
  finalizado: ["done", "done", "done", "done"],
};
const ETIQUETAS_FALLA = ["Reporte", "Revisión", "Atención", "Resuelto"];

const BADGE_FALLA: Record<EstadoFalla, { t: string; i: React.ReactNode }> = {
  pendiente:  { t: "Pendiente",   i: <Clock size={12} /> },
  "en-curso": { t: "En atención", i: <Play size={12} /> },
  finalizado: { t: "Resuelta",    i: <Check size={12} /> },
};

type Filtro = "todas" | "acta" | "falla";
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "acta", t: "Actas" },
  { id: "falla", t: "Reportes" },
];

const BANNERS = [
  { src: "/fcvt.jpg", text: "Facultad de Ciencias de la Vida y Tecnología" },
  { src: "/fctv2.jpg", text: "Carrera de software" },
  { src: "/fcvt3.jpg", text: "Nuevas Oportunidades cada día" },
];

function TarjetaActa({ acta }: { acta: Acta }) {
  return (
    <article className="dd-card" data-estado="aprobado">
      <div className="dd-card__top">
        <span className="dd-card__avatar"><ClipboardCheck size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">Acta de compromiso</h3>
          <p className="dd-card__place">{acta.carrera}, período {acta.periodo}</p>
        </div>
        <span className="dd-badge"><Check size={12} />Firmada</span>
      </div>
      <p className="dd-card__place" style={{ marginTop: 10 }}>
        {acta.fecha}, {acta.estudiantes} {acta.estudiantes === 1 ? "estudiante" : "estudiantes"}
      </p>
      <div className="dd-card__actions">
        <button className="dd-btn dd-btn--ghost"><Eye /> Ver detalles</button>
        <button className="dd-btn dd-btn--primary"><Download /> Descargar acta</button>
      </div>
    </article>
  );
}

function TarjetaFalla({ falla }: { falla: Falla }) {
  const pasos = PASOS_FALLA[falla.estado];
  const meta = [falla.fecha, falla.aula, falla.falla, `Reportado por\n${USUARIO}`];
  return (
    <article className="dd-card" data-estado={falla.estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Wrench size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">Falla en {falla.equipo}</h3>
          <p className="dd-card__place">{falla.aula}</p>
        </div>
        <span className="dd-badge">{BADGE_FALLA[falla.estado].i}{BADGE_FALLA[falla.estado].t}</span>
      </div>

      <div className="dd-steps">
        {ETIQUETAS_FALLA.map((e, k) => (
          <div key={e} className={`dd-step is-${pasos[k]}`}>
            <span className="dd-step__meta" style={{ whiteSpace: "pre-line" }}>{meta[k]}</span>
            <span className="dd-step__dot">{pasos[k] === "done" && <Check />}</span>
            <span className="dd-step__label">{e}</span>
          </div>
        ))}
      </div>

      <div className="dd-card__actions">
        <button className="dd-btn dd-btn--ghost"><Eye /> Ver detalles</button>
      </div>
    </article>
  );
}

function SinActividad({ filtrado }: { filtrado: boolean }) {
  return (
    <div className="dd-empty" role="status">
      <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
      <p className="dd-empty__title">Aún no hay actividad</p>
      <p className="dd-empty__text">
        {filtrado
          ? "No tienes nada en esta categoría."
          : "Cuando firmes un acta o reportes una falla, aparecerá aquí."}
      </p>
    </div>
  );
}

export default function DashboardEstudiante() {
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const contar = (f: Filtro) => (f === "todas" ? ITEMS.length : ITEMS.filter((i) => i.tipo === f).length);
  const visibles = filtro === "todas" ? ITEMS : ITEMS.filter((i) => i.tipo === filtro);

  return (
    <ShellDocente menu={MENU_ESTUDIANTE}>
      <h1 className="dd-title">¡Bienvenido!</h1>
      <p className="dd-subtitle">Firma el acta de compromiso o reporta una falla de equipo.</p>

      <BannerCarrusel banners={BANNERS} />

      {/* Solo móvil */}
      <section className="dd-services">
        <h2 className="dd-section-title">Panel de servicios</h2>
        <p className="dd-section-sub">¿Qué necesitas hacer?</p>
        <div className="dd-services__grid">
          {MENU_ESTUDIANTE.map(({ href, t, i: Icon }) => (
            <Link key={href} href={href} className="dd-service">
              <span className="dd-service__icon"><Icon size={20} /></span>{t}
            </Link>
          ))}
        </div>
      </section>

      <section className="dd-reservas">
        <div className="dd-reservas__head">
          <h2 className="dd-section-title">Mi actividad</h2>
        </div>

        <div className="dd-chips" role="tablist" aria-label="Filtrar actividad">
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
          <SinActividad filtrado={ITEMS.length > 0} />
        ) : (
          <div className="dd-list">
            {visibles.map((i) =>
              i.tipo === "acta" ? <TarjetaActa key={`a${i.id}`} acta={i} /> : <TarjetaFalla key={`f${i.id}`} falla={i} />,
            )}
          </div>
        )}
      </section>
    </ShellDocente>
  );
}