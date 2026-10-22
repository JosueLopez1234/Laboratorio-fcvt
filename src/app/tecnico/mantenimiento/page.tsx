"use client";

import { useEffect, useState } from "react";
import { Wrench, Check, X, Clock, ArrowLeft, ArrowRight, Send, Plus, ClipboardCheck } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import { Firma } from "@/components/ui";
import { LABS, PERIODOS } from "@/lib/datos";
import {
  cargarFallas, marcarEnReparacion, guardarMantenimiento,
  type FallaTec, type EstadoFalla,
} from "@/lib/fallas";
import { mensajeError } from "@/lib/reservas";
import { usePerfil } from "@/lib/perfil";

type Estado = EstadoFalla;
type Paso = "done" | "current" | "todo";
type EstadoFinal = "Reparado" | "En espera de repuesto" | "Dado de baja";

const PASOS: Record<Estado, Paso[]> = {
  abierta: ["done", "current", "todo", "todo"],
  reparacion: ["done", "done", "current", "todo"],
  resuelta: ["done", "done", "done", "done"],
  baja: ["done", "done", "done", "done"],
};
const ETIQUETAS = ["Reporte", "Revisión", "Reparación", "Cierre"];

/* data-estado reutiliza los colores que ya existen en globals.css */
const CSS_ESTADO: Record<Estado, string> = {
  abierta: "pendiente",
  reparacion: "en-curso",
  resuelta: "aprobado",
  baja: "finalizado",
};

const BADGE: Record<Estado, { t: string; i: React.ReactNode }> = {
  abierta: { t: "Abierta", i: <Clock size={12} /> },
  reparacion: { t: "En reparación", i: <Wrench size={12} /> },
  resuelta: { t: "Resuelta", i: <Check size={12} /> },
  baja: { t: "Dado de baja", i: <X size={12} /> },
};

const A_ESTADO: Record<EstadoFinal, Estado> = {
  Reparado: "resuelta",
  "En espera de repuesto": "reparacion",
  "Dado de baja": "baja",
};

type Filtro = "todas" | "abierta" | "reparacion" | "cerradas";
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "abierta", t: "Abiertas" },
  { id: "reparacion", t: "En reparación" },
  { id: "cerradas", t: "Cerradas" },
];

const coincide = (f: FallaTec, filtro: Filtro) =>
  filtro === "todas" ||
  (filtro === "cerradas" ? f.estado === "resuelta" || f.estado === "baja" : f.estado === filtro);

/* ============================ Formulario ============================ */

const PASOS_FORM = ["Equipo", "Trabajo", "Revisión"];

type Datos = {
  tecnico: string; periodo: string; lab: string; equipo: string; fecha: string;
  final: "" | EstadoFinal; falla: string; diagnostico: string; repuestos: string;
};
type Errores = Partial<Record<keyof Datos, string>>;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatoFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/* El aula de una falla reportada es texto libre ("Laboratorio 203", "203"…): se extrae el número. */
const numeroLab = (aula: string) => aula.match(/\d{3}/)?.[0] ?? "";

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

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="ss-sum__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

function FormMantenimiento({
  base, tecnicoNombre, onGuardar, onCancelar,
}: {
  base: FallaTec | null;
  tecnicoNombre: string;
  onGuardar: (d: Datos, id: string | null) => Promise<void>;
  onCancelar: () => void;
}) {
  const [paso, setPaso] = useState(0);
  const [d, setD] = useState<Datos>({
    tecnico: tecnicoNombre, periodo: PERIODOS[0] ?? "", lab: base ? numeroLab(base.aula) : "",
    equipo: base?.equipo ?? "", fecha: hoyISO(), final: "",
    falla: base?.falla ?? "", diagnostico: "", repuestos: "",
  });
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setD((x) => ({ ...x, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const attrs = (k: keyof Datos) => ({
    id: k,
    "aria-invalid": errores[k] ? true : undefined,
    "aria-describedby": errores[k] ? `${k}-err` : undefined,
  });

  const validar = (p: number): Errores => {
    const e: Errores = {};
    if (p === 0) {
      if (!d.tecnico.trim()) e.tecnico = "Escribe el nombre del técnico responsable.";
      if (!d.lab) e.lab = "Elige el laboratorio.";
      if (!d.equipo.trim()) e.equipo = "Indica el equipo.";
      if (!d.fecha) e.fecha = "Indica la fecha.";
      else if (d.fecha > hoyISO()) e.fecha = "La fecha no puede ser futura.";
    }
    if (p === 1) {
      if (!d.final) e.final = "Elige el estado final del equipo.";
      if (!d.diagnostico.trim()) e.diagnostico = "Describe el diagnóstico y lo que hiciste.";
      if (d.final === "En espera de repuesto" && !d.repuestos.trim())
        e.repuestos = "Indica qué repuesto estás esperando.";
    }
    return e;
  };

  const ir = (n: number) => {
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siguiente = () => {
    const er = validar(paso);
    setErrores(er);
    if (Object.keys(er).length === 0) ir(paso + 1);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 2 || enviando) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      await onGuardar(d, base?.id ?? null);
    } catch (err) {
      setErrorEnvio(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <div className="ss-card">
      <ol className="ss-steps ss-steps--3" aria-label="Progreso del registro">
        {PASOS_FORM.map((p, i) => (
          <li
            key={p}
            className={`ss-step ${i < paso ? "is-done" : i === paso ? "is-current" : ""}`}
            aria-current={i === paso ? "step" : undefined}
          >
            <span className="ss-step__dot">{i < paso ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
            <span className="ss-step__label">{p}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={enviar} noValidate>
        {/* Paso 1 */}
        <fieldset className="ss-fieldset" hidden={paso !== 0}>
          <legend className="ss-legend">¿Qué equipo atendiste?</legend>
          <Grupo id="tecnico" label="Técnico responsable" error={errores.tecnico}>
            <input className="input" {...attrs("tecnico")} value={d.tecnico} onChange={set("tecnico")} placeholder="Nombres y apellidos" />
          </Grupo>
          <div className="ss-row">
            <Grupo id="lab" label="Laboratorio" error={errores.lab}>
              <select className="input" {...attrs("lab")} value={d.lab} onChange={set("lab")}>
                <option value="">Selecciona un laboratorio</option>
                {LABS.map((l: string | number) => (
                  <option key={String(l)} value={String(l)}>Laboratorio {l}</option>
                ))}
              </select>
            </Grupo>
            <Grupo id="periodo" label="Período académico">
              <select className="input" id="periodo" value={d.periodo} onChange={set("periodo")}>
                {PERIODOS.map((p: string) => <option key={p}>{p}</option>)}
              </select>
            </Grupo>
          </div>
          <div className="ss-row">
            <Grupo id="equipo" label="PC N.º / equipo" error={errores.equipo}>
              <input className="input" {...attrs("equipo")} value={d.equipo} onChange={set("equipo")} placeholder="Ej: PC 14" />
            </Grupo>
            <Grupo id="fecha" label="Fecha del mantenimiento" error={errores.fecha}>
              <input className="input" type="date" max={hoyISO()} {...attrs("fecha")} value={d.fecha} onChange={set("fecha")} />
            </Grupo>
          </div>
        </fieldset>

        {/* Paso 2 */}
        <fieldset className="ss-fieldset" hidden={paso !== 1}>
          <legend className="ss-legend">¿Qué hiciste?</legend>
          <div className="ss-group" role="radiogroup" aria-labelledby="final-label">
            <span id="final-label" className="ss-label">Estado final del equipo</span>
            <div className="ss-labs">
              {([
                ["Reparado", "El equipo ya funciona", <Check key="a" size={18} />],
                ["En espera de repuesto", "Falta un repuesto", <Clock key="b" size={18} />],
                ["Dado de baja", "Ya no se puede reparar", <X key="c" size={18} />],
              ] as [EstadoFinal, string, React.ReactNode][]).map(([v, meta, icono]) => (
                <button
                  key={v} type="button" role="radio" aria-checked={d.final === v}
                  className={`ss-lab ${d.final === v ? "is-selected" : ""}`}
                  onClick={() => {
                    setD((x) => ({ ...x, final: v }));
                    setErrores((er) => ({ ...er, final: undefined, repuestos: undefined }));
                  }}
                >
                  <span className="ss-lab__icon">{icono}</span>
                  <span className="ss-lab__name">{v}</span>
                  <span className="ss-lab__meta">{meta}</span>
                </button>
              ))}
            </div>
            {errores.final && <p className="ss-error" role="alert">{errores.final}</p>}
          </div>
          <Grupo id="falla" label="Falla reportada (opcional)">
            <textarea className="input" rows={2} id="falla" value={d.falla} onChange={set("falla")} placeholder="Ej: No enciende" />
          </Grupo>
          <Grupo id="diagnostico" label="Diagnóstico y reparación realizada" error={errores.diagnostico}>
            <textarea
              className="input" rows={3} {...attrs("diagnostico")} value={d.diagnostico}
              onChange={set("diagnostico")} placeholder="Ej: La fuente de poder estaba dañada, se cambió por una nueva"
            />
          </Grupo>
          <Grupo
            id="repuestos"
            label={d.final === "En espera de repuesto" ? "Repuesto que se espera" : "Repuestos utilizados (opcional)"}
            error={errores.repuestos}
          >
            <input className="input" {...attrs("repuestos")} value={d.repuestos} onChange={set("repuestos")} placeholder="Ej: Fuente de poder 500 W" />
          </Grupo>
        </fieldset>

        {/* Paso 3 */}
        <fieldset className="ss-fieldset" hidden={paso !== 2}>
          <legend className="ss-legend">Revisa y firma</legend>

          <section className="ss-sum">
            <div className="ss-sum__head">
              <h3 className="ss-sum__title">Equipo</h3>
              <button type="button" className="ss-link" onClick={() => ir(0)}>Editar</button>
            </div>
            <dl className="ss-sum__list">
              <Fila k="Técnico" v={d.tecnico || "—"} />
              <Fila k="Laboratorio" v={d.lab ? `Laboratorio ${d.lab}` : "—"} />
              <Fila k="Período" v={d.periodo} />
              <Fila k="Equipo" v={d.equipo || "—"} />
              <Fila k="Fecha" v={formatoFecha(d.fecha)} />
            </dl>
          </section>

          <section className="ss-sum">
            <div className="ss-sum__head">
              <h3 className="ss-sum__title">Trabajo realizado</h3>
              <button type="button" className="ss-link" onClick={() => ir(1)}>Editar</button>
            </div>
            <dl className="ss-sum__list">
              <Fila k="Estado final" v={d.final || "—"} />
              <Fila k="Falla" v={d.falla.trim() || "Sin especificar"} />
              <Fila k="Diagnóstico" v={d.diagnostico.trim() || "—"} />
              <Fila k="Repuestos" v={d.repuestos.trim() || "Ninguno"} />
            </dl>
          </section>

          <Firma label="Firma del técnico" />
        </fieldset>

        {errorEnvio && <p className="ss-error" role="alert">{errorEnvio}</p>}

        <div className="ss-actions">
          <button type="button" className="ss-btn ss-btn--danger" onClick={onCancelar}>Cancelar</button>
          <div className="ss-actions__nav">
            {paso > 0 && (
              <button type="button" className="ss-btn ss-btn--ghost" onClick={() => ir(paso - 1)}>
                <ArrowLeft size={16} /> Atrás
              </button>
            )}
            {paso < 2 ? (
              <button type="button" className="ss-btn ss-btn--primary" onClick={siguiente}>
                Siguiente <ArrowRight size={16} />
              </button>
            ) : (
              <button type="submit" className="ss-btn ss-btn--primary" disabled={enviando}>
                <Send size={16} /> {enviando ? "Guardando…" : "Guardar mantenimiento"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

/* ============================== Página ============================== */

export default function Mantenimiento() {
  const perfil = usePerfil();
  const [items, setItems] = useState<FallaTec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [vista, setVista] = useState<"lista" | "form" | "ok">("lista");
  const [base, setBase] = useState<FallaTec | null>(null);
  const [guardado, setGuardado] = useState<Datos | null>(null);

  const recargar = () =>
    cargarFallas().then(setItems).catch((e) => setError(mensajeError(e)));

  useEffect(() => {
    recargar().finally(() => setCargando(false));
  }, []);

  const contar = (f: Filtro) => items.filter((i) => coincide(i, f)).length;
  const visibles = items.filter((i) => coincide(i, filtro));

  const abrirForm = (f: FallaTec | null) => {
    setBase(f);
    setVista("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const marcarReparacion = async (id: string) => {
    setError("");
    try {
      await marcarEnReparacion(id);
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, estado: "reparacion" } : x)));
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const guardar = async (d: Datos, id: string | null) => {
    await guardarMantenimiento(id, {
      lab: d.lab, periodo: d.periodo, equipo: d.equipo,
      estado: A_ESTADO[d.final as EstadoFinal],
      falla: d.falla, diagnostico: d.diagnostico, repuestos: d.repuestos,
    });
    await recargar();
    setGuardado(d);
    setVista("ok");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (vista === "ok" && guardado) {
    return (
      <ShellDocente menu={MENU_TECNICO}>
        <div className="ss-card ss-done" role="status">
          <span className="ss-done__icon"><Check size={30} strokeWidth={3} /></span>
          <h1 className="ss-done__title">Mantenimiento guardado</h1>
          <p className="ss-done__text">
            Registraste el trabajo en {guardado.equipo}, Laboratorio {guardado.lab}. Estado final: {guardado.final}.
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={() => abrirForm(null)}>Registrar otro</button>
            <button type="button" className="ss-btn ss-btn--primary" onClick={() => setVista("lista")}>Volver a las fallas</button>
          </div>
        </div>
      </ShellDocente>
    );
  }

  if (vista === "form") {
    return (
      <ShellDocente menu={MENU_TECNICO}>
        <h1 className="dd-title">Registrar mantenimiento</h1>
        <p className="dd-subtitle">
          {base ? `Equipo ${base.equipo}, ${base.aula}.` : "Registra una reparación o una revisión."}
        </p>
        <FormMantenimiento
          base={base} tecnicoNombre={perfil?.nombre ?? ""}
          onGuardar={guardar} onCancelar={() => setVista("lista")}
        />
      </ShellDocente>
    );
  }

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Mantenimiento</h1>
      <p className="dd-subtitle">Atiende las fallas reportadas y registra cada reparación.</p>

      <section className="dd-reservas">
        <div className="dd-reservas__head">
          <h2 className="dd-section-title">Fallas reportadas</h2>
          <button type="button" className="ss-btn ss-btn--primary" onClick={() => abrirForm(null)}>
            <Plus size={16} /> Registrar mantenimiento
          </button>
        </div>

        <div className="dd-chips" role="tablist" aria-label="Filtrar fallas">
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
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando fallas…</p>
        ) : visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
            <p className="dd-empty__title">No hay fallas</p>
            <p className="dd-empty__text">
              {items.length > 0 ? "No hay fallas con este estado." : "Cuando alguien reporte una falla, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <div className="dd-list">
            {visibles.map((f) => {
              const pasos = PASOS[f.estado];
              const meta = [f.fecha, f.aula, f.falla, `Reportó\n${f.quien}`];
              const abierta = f.estado === "abierta" || f.estado === "reparacion";
              return (
                <article key={f.id} className="dd-card" data-estado={CSS_ESTADO[f.estado]}>
                  <div className="dd-card__top">
                    <span className="dd-card__avatar"><Wrench size={20} /></span>
                    <div className="dd-card__info">
                      <h3 className="dd-card__name">{f.equipo}</h3>
                      <p className="dd-card__place">{f.aula}, {f.falla}</p>
                    </div>
                    <span className="dd-badge">{BADGE[f.estado].i}{BADGE[f.estado].t}</span>
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

                  {f.diagnostico && <p className="tt-meta">Diagnóstico: {f.diagnostico}</p>}

                  {abierta && (
                    <div className="dd-card__actions" style={{ justifyContent: "flex-end" }}>
                      <div className="tt-btns">
                        {f.estado === "abierta" && (
                          <button className="dd-btn dd-btn--ghost" onClick={() => marcarReparacion(f.id)}>
                            <Wrench /> Marcar en reparación
                          </button>
                        )}
                        <button className="dd-btn dd-btn--primary" onClick={() => abrirForm(f)}>
                          <Check /> Registrar mantenimiento
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