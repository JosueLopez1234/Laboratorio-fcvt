"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck, Wrench, Monitor, Eye, Clock, Check, Play, X,
} from "lucide-react";
import ShellDocente, { MENU_ESTUDIANTE } from "@/components/docente/ShellDocente";
import BannerCarrusel from "@/components/docente/BannerCarrusel";
import DetalleModal from "@/components/DetalleModal";
import { supabase } from "@/lib/servicios/supabase";
import {
  cargarMisReservas, fechaLarga, mensajeError,
  type ReservaUI, type EstadoUI,
} from "@/lib/servicios/reservas";
import { usePerfil } from "@/lib/perfil/perfil";

type Paso = "done" | "current" | "todo";
type EstadoFalla = "pendiente" | "en-curso" | "finalizado";

type Acta = {
  id: string; tipo: "acta";
  carrera: string; periodo: string; fecha: string; estudiantes: number;
};
type Falla = {
  id: string; tipo: "falla";
  equipo: string; aula: string; fecha: string; falla: string; estado: EstadoFalla;
  detalle?: string;
};
type Reserva = { id: string; tipo: "reserva"; r: ReservaUI };
type Item = Acta | Falla | Reserva;

const PASOS_FALLA: Record<EstadoFalla, Paso[]> = {
  pendiente: ["done", "current", "todo", "todo"],
  "en-curso": ["done", "done", "current", "todo"],
  finalizado: ["done", "done", "done", "done"],
};
const ETIQUETAS_FALLA = ["Reporte", "Revisión", "Atención", "Resuelto"];

const BADGE_FALLA: Record<EstadoFalla, { t: string; i: React.ReactNode }> = {
  pendiente: { t: "Pendiente", i: <Clock size={12} /> },
  "en-curso": { t: "En atención", i: <Play size={12} /> },
  finalizado: { t: "Resuelta", i: <Check size={12} /> },
};

const PASOS_RESERVA: Record<EstadoUI, Paso[]> = {
  pendiente: ["done", "done", "current", "todo"],
  aprobado: ["done", "done", "done", "todo"],
  "en-curso": ["done", "done", "done", "current"],
  finalizado: ["done", "done", "done", "done"],
  rechazado: ["done", "done", "current", "todo"],
  cancelado: ["done", "todo", "todo", "todo"],
};
const ETIQUETAS_RESERVA = ["Solicitud", "Revisión", "Aprobación", "Uso"];

const BADGE_RESERVA: Record<EstadoUI, { t: string; i: React.ReactNode }> = {
  pendiente: { t: "Pendiente", i: <Clock size={12} /> },
  aprobado: { t: "Aprobada", i: <Check size={12} /> },
  "en-curso": { t: "En curso", i: <Play size={12} /> },
  finalizado: { t: "Finalizada", i: <Check size={12} /> },
  rechazado: { t: "Rechazada", i: <X size={12} /> },
  cancelado: { t: "Cancelada", i: <X size={12} /> },
};

type Filtro = "todas" | "reserva" | "acta" | "falla";
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "reserva", t: "Reservas" },
  { id: "acta", t: "Actas" },
  { id: "falla", t: "Reportes" },
];

const BANNERS = [
  { src: "/fcvt.jpg", text: "Facultad de Ciencias de la Vida y Tecnología" },
  { src: "/fctv2.jpg", text: "Carrera de software" },
  { src: "/fcvt3.jpg", text: "Nuevas Oportunidades cada día" },
];

/* ---------- Tarjetas ---------- */
function TarjetaReserva({ r, onDetalle }: { r: ReservaUI; onDetalle: () => void }) {
  const pasos = PASOS_RESERVA[r.estado];
  const meta = [r.fecha, r.hora, `${r.estudiantes} personas`, `Solicitante\n${r.solicitante}`];
  return (
    <article className="dd-card" data-estado={r.estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Monitor size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">{r.lab}</h3>
          <p className="dd-card__place">Solicitud especial</p>
        </div>
        <span className="dd-badge">{BADGE_RESERVA[r.estado].i}{BADGE_RESERVA[r.estado].t}</span>
      </div>
      <div className="dd-steps">
        {ETIQUETAS_RESERVA.map((e, k) => (
          <div key={e} className={`dd-step is-${pasos[k]}`}>
            <span className="dd-step__meta" style={{ whiteSpace: "pre-line" }}>{meta[k]}</span>
            <span className="dd-step__dot">{pasos[k] === "done" && <Check />}</span>
            <span className="dd-step__label">{e}</span>
          </div>
        ))}
      </div>
      {r.motivoEspecial && <p className="tt-meta"><strong>Motivo:</strong> {r.motivoEspecial}</p>}
      {r.estado === "rechazado" && r.motivo && <p className="tt-meta">Motivo del rechazo: {r.motivo}</p>}
      <div className="dd-card__actions">
        <button type="button" className="dd-btn dd-btn--ghost" onClick={onDetalle}>
          <Eye /> Ver detalles
        </button>
      </div>
    </article>
  );
}

function TarjetaActa({ acta, onDetalle }: { acta: Acta; onDetalle: () => void }) {
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
        <button type="button" className="dd-btn dd-btn--ghost" onClick={onDetalle}>
          <Eye /> Ver detalles
        </button>
      </div>
    </article>
  );
}

function TarjetaFalla({
  falla, nombre, onDetalle,
}: { falla: Falla; nombre: string; onDetalle: () => void }) {
  const pasos = PASOS_FALLA[falla.estado];
  const meta = [falla.fecha, falla.aula, falla.falla, `Reportado por\n${nombre}`];
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
        <button type="button" className="dd-btn dd-btn--ghost" onClick={onDetalle}>
          <Eye /> Ver detalles
        </button>
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
          : "Cuando solicites un laboratorio, firmes un acta o reportes una falla, aparecerá aquí."}
      </p>
    </div>
  );
}

/* ---------- Página ---------- */
export default function DashboardEstudiante() {
  const perfil = usePerfil();
  const nombre = perfil?.nombre ?? "—";

  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [detalle, setDetalle] = useState<{ titulo: string; filas: [string, string][] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [res, f, a] = await Promise.all([
          cargarMisReservas(),
          supabase.from("fallas")
            .select("id, equipo, aula, tipos, descripcion, estado, creado_en")
            .order("creado_en", { ascending: false }),
          supabase.from("actas")
            .select("id, carrera, periodo, fecha, estudiantes")
            .order("fecha", { ascending: false }),
        ]);
        if (f.error) throw f.error;
        if (a.error) throw a.error;

        const reservas: Item[] = res.map((r) => ({ id: `r${r.id}`, tipo: "reserva", r }));

        const fallas: Item[] = (f.data ?? []).map((x) => ({
          id: `f${x.id}`, tipo: "falla",
          equipo: x.equipo, aula: x.aula,
          fecha: fechaLarga(String(x.creado_en).slice(0, 10)),
          falla: (x.tipos ?? []).join(", ") || "Sin especificar",
          detalle: x.descripcion ?? undefined,
          estado: x.estado === "abierta" ? "pendiente"
            : x.estado === "reparacion" ? "en-curso" : "finalizado",
        }));

        const actas: Item[] = (a.data ?? []).map((x) => ({
          id: `a${x.id}`, tipo: "acta",
          carrera: x.carrera, periodo: x.periodo, fecha: fechaLarga(x.fecha),
          estudiantes: Array.isArray(x.estudiantes) ? x.estudiantes.length : 0,
        }));

        setItems([...reservas, ...fallas, ...actas]);
      } catch (e) {
        setError(mensajeError(e));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const contar = (f: Filtro) => (f === "todas" ? items.length : items.filter((i) => i.tipo === f).length);
  const visibles = filtro === "todas" ? items : items.filter((i) => i.tipo === filtro);

  const verReserva = (r: ReservaUI) => {
    const filas: [string, string][] = [
      ["Laboratorio", r.lab], ["Fecha", r.fecha], ["Horario", r.hora],
      ["Asistentes", String(r.estudiantes)], ["Estado", BADGE_RESERVA[r.estado].t],
    ];
    if (r.motivoEspecial) filas.push(["Motivo", r.motivoEspecial]);
    if (r.estado === "rechazado" && r.motivo) filas.push(["Motivo del rechazo", r.motivo]);
    setDetalle({ titulo: r.lab, filas });
  };
  const verActa = (a: Acta) =>
    setDetalle({
      titulo: "Acta de compromiso",
      filas: [["Carrera", a.carrera], ["Período", a.periodo], ["Fecha", a.fecha], ["Estudiantes", String(a.estudiantes)]],
    });
  const verFalla = (f: Falla) =>
    setDetalle({
      titulo: `Falla en ${f.equipo}`,
      filas: [
        ["Aula", f.aula], ["Fecha", f.fecha], ["Falla", f.falla],
        ["Descripción", f.detalle || "Sin especificar"], ["Estado", BADGE_FALLA[f.estado].t],
      ],
    });

  return (
    <ShellDocente menu={MENU_ESTUDIANTE}>
      <h1 className="dd-title">¡Bienvenido!</h1>
      <p className="dd-subtitle">Solicita un laboratorio en casos especiales, firma el acta o reporta una falla.</p>

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
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando actividad…</p>
        ) : visibles.length === 0 ? (
          <SinActividad filtrado={items.length > 0} />
        ) : (
          <div className="dd-list">
            {visibles.map((i) =>
              i.tipo === "reserva" ? (
                <TarjetaReserva key={i.id} r={i.r} onDetalle={() => verReserva(i.r)} />
              ) : i.tipo === "acta" ? (
                <TarjetaActa key={i.id} acta={i} onDetalle={() => verActa(i)} />
              ) : (
                <TarjetaFalla key={i.id} falla={i} nombre={nombre} onDetalle={() => verFalla(i)} />
              ),
            )}
          </div>
        )}
      </section>

      {detalle && (
        <DetalleModal titulo={detalle.titulo} filas={detalle.filas} onClose={() => setDetalle(null)} />
      )}
    </ShellDocente>
  );
}