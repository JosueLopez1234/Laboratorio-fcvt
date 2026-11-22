"use client";

import { useEffect, useState } from "react";
import { Monitor, Package, Check, X, Clock, Plus, ClipboardCheck } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import { LABS } from "@/lib/types/datos";
import { cargarHorarios, type Bloque } from "@/lib/types/horarios";
import { mensajeError, fechaLarga, cargarOcupacionFecha, type OcupacionDia } from "@/lib/servicios/reservas";
import {
  cargarPrestamos, crearPrestamo, cerrarPrestamo, type Prestamo, type EstadoPrestamo,
} from "@/lib/servicios/prestamos";

type Filtro = "todos" | EstadoPrestamo;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todos", t: "Todos" },
  { id: "prestado", t: "Prestados" },
  { id: "devuelto", t: "Devueltos" },
  { id: "cancelado", t: "Cancelados" },
];

const CSS_ESTADO: Record<EstadoPrestamo, string> = {
  prestado: "pendiente", devuelto: "aprobado", cancelado: "finalizado",
};
const BADGE: Record<EstadoPrestamo, { t: string; i: React.ReactNode }> = {
  prestado: { t: "Prestado", i: <Clock size={12} /> },
  devuelto: { t: "Devuelto", i: <Check size={12} /> },
  cancelado: { t: "Cancelado", i: <X size={12} /> },
};

const MSG_FINDE = "La ULEAM no atiende sábados ni domingos. Elige un día de lunes a viernes.";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const aH = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) + Number(m) / 60;
};
const esFinDeSemana = (iso: string) => {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`).getDay();
  return d === 0 || d === 6;
};

type Datos = {
  solicitante: string; institucion: string; contacto: string;
  tipo: "laboratorio" | "equipos"; lab: string; detalle: string;
  fecha: string; inicio: string; fin: string; motivo: string;
};
type Errores = Partial<Record<keyof Datos, string>>;

const inicial = (): Datos => ({
  solicitante: "", institucion: "", contacto: "", tipo: "laboratorio", lab: "",
  detalle: "", fecha: hoyISO(), inicio: "", fin: "", motivo: "",
});

function Grupo({
  id, label, error, children,
}: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="ss-group">
      <label htmlFor={id} className="ss-label">{label}</label>
      {children}
      {error && <p id={`${id}-err`} className="ss-error" role="alert">{error}</p>}
    </div>
  );
}

function validar(d: Datos): Errores {
  const e: Errores = {};
  if (!d.solicitante.trim()) e.solicitante = "Escribe el nombre de quien recibe.";
  if (!d.institucion.trim()) e.institucion = "Indica la institución o entidad.";
  if (!d.fecha) e.fecha = "Indica la fecha.";
  else if (d.fecha < hoyISO()) e.fecha = "La fecha no puede ser anterior a hoy.";
  else if (d.tipo === "laboratorio" && esFinDeSemana(d.fecha)) e.fecha = MSG_FINDE;
  if (d.tipo === "laboratorio") {
    if (!d.inicio) e.inicio = "Indica la hora de inicio.";
    if (!d.fin) e.fin = "Indica la hora de fin.";
    else if (d.inicio && d.fin <= d.inicio) e.fin = "La hora de fin debe ser posterior a la de inicio.";
    if (!d.lab) e.lab = "Elige el laboratorio.";
  } else {
    if (!d.detalle.trim()) e.detalle = "Describe qué equipos se prestan.";
    if (d.inicio && d.fin && d.fin <= d.inicio) e.fin = "La hora de fin debe ser posterior a la de inicio.";
  }
  return e;
}

export default function Prestamos() {
  const [items, setItems] = useState<Prestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [formAbierto, setFormAbierto] = useState(false);
  const [datos, setDatos] = useState<Datos>(inicial);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [horarios, setHorarios] = useState<Record<string, Bloque[][]>>({});
  const [ocupados, setOcupados] = useState<OcupacionDia[]>([]);

  const recargar = () =>
    cargarPrestamos().then(setItems).catch((e) => setError(mensajeError(e)));

  useEffect(() => {
    cargarPrestamos()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
    cargarHorarios().then(setHorarios).catch(() => {});
  }, []);

  useEffect(() => {
    if (!formAbierto || !datos.fecha || esFinDeSemana(datos.fecha)) {
      setOcupados([]);
      return;
    }
    cargarOcupacionFecha(datos.fecha).then(setOcupados).catch(() => setOcupados([]));
  }, [datos.fecha, formAbierto, items]);

  const finde = esFinDeSemana(datos.fecha);
  const hayRango = !!(datos.inicio && datos.fin && datos.fin > datos.inicio);

  const estadoLab = (l: string): "ocupado" | "libre" | null => {
    if (!datos.fecha || finde || !hayRango) return null;
    const a = aH(datos.inicio), b = aH(datos.fin);
    const dia = (new Date(`${datos.fecha}T00:00:00`).getDay() + 6) % 7;
    const clase = dia <= 4 && (horarios[l]?.[dia] ?? []).some(([i, f]) => a < f && i < b);
    const otro = ocupados.some((r) => r.lab === l && a < r.fin && r.ini < b);
    return clase || otro ? "ocupado" : "libre";
  };

  // si el laboratorio elegido pasa a estar ocupado, se deselecciona
  useEffect(() => {
    if (datos.lab && estadoLab(datos.lab) === "ocupado") setDatos((d) => ({ ...d, lab: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.fecha, datos.inicio, datos.fin, horarios, ocupados]);

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const attrs = (k: keyof Datos) => ({
    id: k,
    "aria-invalid": errores[k] ? true : undefined,
    "aria-describedby": errores[k] ? `${k}-err` : undefined,
  });

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const er = validar(datos);
    if (datos.tipo === "laboratorio" && datos.lab && estadoLab(datos.lab) === "ocupado")
      er.lab = `El Laboratorio ${datos.lab} está ocupado en ese horario.`;
    setErrores(er);
    if (Object.keys(er).length) return;
    setGuardando(true);
    setError("");
    try {
      await crearPrestamo(datos);
      setDatos(inicial());
      setFormAbierto(false);
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = async (id: string, estado: "devuelto" | "cancelado") => {
    setError("");
    try {
      await cerrarPrestamo(id, estado, obs);
      setCerrando(null);
      setObs("");
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const contar = (f: Filtro) => (f === "todos" ? items.length : items.filter((i) => i.estado === f).length);
  const visibles = items.filter((i) => filtro === "todos" || i.estado === filtro);

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Préstamos externos</h1>
      <p className="dd-subtitle">Registra los laboratorios y equipos que se prestan a personas o instituciones externas.</p>

      <section className="dd-reservas">
        <div className="dd-reservas__head">
          <h2 className="dd-section-title">Préstamos</h2>
          <button type="button" className="ss-btn ss-btn--primary" onClick={() => setFormAbierto((v) => !v)}>
            <Plus size={16} /> {formAbierto ? "Cerrar formulario" : "Nuevo préstamo"}
          </button>
        </div>

        {formAbierto && (
          <form className="ss-card" onSubmit={guardar} noValidate>
            <h3 className="ss-legend">Datos del préstamo</h3>

            <div className="ss-row">
              <Grupo id="solicitante" label="Quién recibe" error={errores.solicitante}>
                <input className="input" {...attrs("solicitante")} value={datos.solicitante}
                  onChange={set("solicitante")} placeholder="Nombres y apellidos" />
              </Grupo>
              <Grupo id="institucion" label="Institución / entidad" error={errores.institucion}>
                <input className="input" {...attrs("institucion")} value={datos.institucion}
                  onChange={set("institucion")} placeholder="Ej: Colegio Eloy Alfaro" />
              </Grupo>
            </div>

            <Grupo id="contacto" label="Contacto (opcional)">
              <input className="input" id="contacto" value={datos.contacto}
                onChange={set("contacto")} placeholder="Teléfono o correo" />
            </Grupo>

            <div className="ss-group" role="radiogroup" aria-labelledby="tipo-label">
              <span id="tipo-label" className="ss-label">¿Qué se presta?</span>
              <div className="ss-labs">
                {([
                  ["laboratorio", "Un laboratorio", "Uso del espacio", <Monitor key="a" size={18} />],
                  ["equipos", "Equipos", "Cables, proyector, PCs…", <Package key="b" size={18} />],
                ] as const).map(([v, nombre, meta, icono]) => (
                  <button
                    key={v} type="button" role="radio" aria-checked={datos.tipo === v}
                    className={`ss-lab ${datos.tipo === v ? "is-selected" : ""}`}
                    onClick={() => { setDatos((d) => ({ ...d, tipo: v })); setErrores({}); }}
                  >
                    <span className="ss-lab__icon">{icono}</span>
                    <span className="ss-lab__name">{nombre}</span>
                    <span className="ss-lab__meta">{meta}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="ss-row">
              <Grupo id="fecha" label={datos.tipo === "laboratorio" ? "Fecha (lunes a viernes)" : "Fecha"} error={errores.fecha}>
                <input className="input" type="date" min={hoyISO()} {...attrs("fecha")}
                  value={datos.fecha} onChange={set("fecha")} />
              </Grupo>
              <div className="ss-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Grupo id="inicio" label={datos.tipo === "laboratorio" ? "Desde" : "Desde (opcional)"} error={errores.inicio}>
                  <input className="input" type="time" {...attrs("inicio")} value={datos.inicio} onChange={set("inicio")} />
                </Grupo>
                <Grupo id="fin" label={datos.tipo === "laboratorio" ? "Hasta" : "Hasta (opcional)"} error={errores.fin}>
                  <input className="input" type="time" {...attrs("fin")} value={datos.fin} onChange={set("fin")} />
                </Grupo>
              </div>
            </div>

            {datos.tipo === "laboratorio" && (
              <div className="ss-group" role="radiogroup" aria-labelledby="lab-label">
                <span id="lab-label" className="ss-label">Laboratorio</span>
                <p className="dd-section-sub" style={{ marginBottom: 8 }}>
                  {finde
                    ? "Elige una fecha de lunes a viernes para seleccionar un laboratorio."
                    : hayRango
                      ? "Los laboratorios ocupados en ese horario no se pueden seleccionar."
                      : "Indica fecha y horas para ver qué laboratorios están libres."}
                </p>
                <div className="ss-labs">
                  {LABS.map((l: string | number) => {
                    const id = String(l);
                    const activo = datos.lab === id;
                    const estado = estadoLab(id);
                    const bloqueado = estado === "ocupado" || finde;
                    return (
                      <button
                        key={id} type="button" role="radio" aria-checked={activo} disabled={bloqueado}
                        className={`ss-lab ${activo ? "is-selected" : ""} ${bloqueado ? "is-ocupado" : ""}`}
                        onClick={() => {
                          if (bloqueado) return;
                          setDatos((d) => ({ ...d, lab: id }));
                          setErrores((er) => ({ ...er, lab: undefined }));
                        }}
                      >
                        <span className="ss-lab__icon"><Monitor size={18} /></span>
                        <span className="ss-lab__name">Laboratorio {id}</span>
                        {estado && (
                          <span
                            className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={estado === "ocupado"
                              ? { background: "var(--dd-danger-soft)", color: "var(--dd-danger)" }
                              : { background: "var(--dd-ok-bg)", color: "var(--dd-ok-fg)" }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full"
                              style={{ background: estado === "ocupado" ? "var(--dd-danger)" : "var(--dd-ok)" }} />
                            {estado === "ocupado" ? "Ocupado" : "Libre"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errores.lab && <p className="ss-error" role="alert">{errores.lab}</p>}
              </div>
            )}

            <Grupo
              id="detalle"
              label={datos.tipo === "equipos" ? "Equipos prestados" : "Detalle (opcional)"}
              error={errores.detalle}
            >
              <textarea className="input" rows={2} {...attrs("detalle")} value={datos.detalle}
                onChange={set("detalle")}
                placeholder={datos.tipo === "equipos" ? "Ej: 1 proyector, 2 cables HDMI" : "Ej: Capacitación para 30 personas"} />
            </Grupo>

            <Grupo id="motivo" label="Motivo (opcional)">
              <input className="input" id="motivo" value={datos.motivo} onChange={set("motivo")}
                placeholder="Ej: Convenio de vinculación" />
            </Grupo>

            {error && <p className="ss-error" role="alert">{error}</p>}

            <div className="ss-actions">
              <button type="button" className="ss-btn ss-btn--danger"
                onClick={() => { setFormAbierto(false); setErrores({}); }}>Cancelar</button>
              <div className="ss-actions__nav">
                <button type="submit" className="ss-btn ss-btn--primary" disabled={guardando}>
                  <Check size={16} /> {guardando ? "Guardando…" : "Registrar préstamo"}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="dd-chips" role="tablist" aria-label="Filtrar préstamos">
          {FILTROS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filtro === f.id}
              className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
              onClick={() => setFiltro(f.id)}>
              {f.t} ({contar(f.id)})
            </button>
          ))}
        </div>

        {!formAbierto && error && <p className="ss-error" role="alert">{error}</p>}

        {cargando ? (
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando préstamos…</p>
        ) : visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
            <p className="dd-empty__title">No hay préstamos</p>
            <p className="dd-empty__text">
              {items.length > 0 ? "No hay préstamos con este estado." : "Cuando registres un préstamo, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <div className="dd-list">
            {visibles.map((p) => {
              const abierto = cerrando === p.id;
              return (
                <article key={p.id} className="dd-card" data-estado={CSS_ESTADO[p.estado]}>
                  <div className="dd-card__top">
                    <span className="dd-card__avatar">
                      {p.tipo === "laboratorio" ? <Monitor size={20} /> : <Package size={20} />}
                    </span>
                    <div className="dd-card__info">
                      <h3 className="dd-card__name">
                        {p.tipo === "laboratorio" ? `Laboratorio ${p.lab}` : "Préstamo de equipos"}
                      </h3>
                      <p className="dd-card__place">{p.institucion}, recibe {p.solicitante}</p>
                    </div>
                    <span className="dd-badge">{BADGE[p.estado].i}{BADGE[p.estado].t}</span>
                  </div>

                  <p className="tt-meta">
                    {fechaLarga(p.fecha)}
                    {p.inicio && p.fin ? `, ${p.inicio} - ${p.fin}` : ""}
                    {p.contacto ? ` · Contacto: ${p.contacto}` : ""}
                  </p>
                  {p.detalle && <p className="tt-meta"><strong>Detalle:</strong> {p.detalle}</p>}
                  {p.motivo && <p className="tt-meta"><strong>Motivo:</strong> {p.motivo}</p>}
                  {p.obsDevolucion && <p className="tt-meta"><strong>Al cerrar:</strong> {p.obsDevolucion}</p>}

                  {p.estado === "prestado" && !abierto && (
                    <div className="dd-card__actions" style={{ justifyContent: "flex-end" }}>
                      <div className="tt-btns">
                        <button className="dd-btn dd-btn--danger" onClick={() => { setCerrando(p.id); setObs(""); }}>
                          <Check /> Cerrar préstamo
                        </button>
                      </div>
                    </div>
                  )}

                  {abierto && (
                    <div className="tt-reject">
                      <label htmlFor={`obs-${p.id}`} className="ss-label">Observación al cerrar (opcional)</label>
                      <textarea id={`obs-${p.id}`} className="input" rows={2} value={obs}
                        onChange={(e) => setObs(e.target.value)}
                        placeholder="Ej: Se devolvió completo, sin daños" />
                      <div className="tt-btns">
                        <button className="dd-btn dd-btn--ghost" onClick={() => setCerrando(null)}>Volver</button>
                        <button className="dd-btn dd-btn--danger" onClick={() => cerrar(p.id, "cancelado")}>
                          <X /> Cancelar préstamo
                        </button>
                        <button className="dd-btn dd-btn--primary" onClick={() => cerrar(p.id, "devuelto")}>
                          <Check /> Marcar devuelto
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