"use client";
import { useState } from "react";
import Link from "next/link";
import { Monitor, Check, ArrowLeft, ArrowRight, Save, TriangleAlert, X, Clock } from "lucide-react";
import ShellDocente from "@/components/docente/ShellDocente";
import { Firma } from "@/components/layouts/ui";
import { LABS } from "@/lib/types/datos";
import { usePerfil } from "@/lib/perfil/perfil";
import { registrarAcceso } from "@/lib/servicios/accesos";
import { mensajeError } from "@/lib/servicios/reservas";
import { subirFirma } from "@/lib/types/firmas";

const PASOS = ["Registro", "Revisión"];
const MAX_PCS = 40;

type Datos = {
  fecha: string; lab: string; entrada: string; salida: string;
  orden: "" | "si" | "no"; observaciones: string;
};
type Errores = Partial<Record<"fecha" | "lab" | "entrada" | "salida" | "orden" | "observaciones", string>>;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const ahoraHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const formatoFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const inicial = (): Datos => ({
  fecha: hoyISO(), lab: "", entrada: "", salida: "", orden: "", observaciones: "",
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

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="ss-sum__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export default function IngresoSalida() {
  const perfil = usePerfil();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>(inicial);
  const [pcs, setPcs] = useState<string[]>([]);
  const [pcTexto, setPcTexto] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [firma, setFirma] = useState<string | null>(null);
  const [errFirma, setErrFirma] = useState("");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const ponerAhora = (k: "entrada" | "salida") => {
    setDatos((d) => ({ ...d, [k]: ahoraHHMM() }));
    setErrores((er) => ({ ...er, [k]: undefined }));
  };

  const elegirOrden = (v: "si" | "no") => {
    setDatos((d) => ({ ...d, orden: v }));
    setErrores((er) => ({ ...er, orden: undefined, observaciones: undefined }));
  };

  /* ---- chips de máquinas ---- */
  const agregarPcs = (txt: string) => {
    const nuevas = txt.split(/[,;\n]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (!nuevas.length) return;
    setPcs((prev) => Array.from(new Set([...prev, ...nuevas])).slice(0, MAX_PCS));
    setPcTexto("");
  };
  const quitarPc = (pc: string) => setPcs((prev) => prev.filter((p) => p !== pc));

  const validar = (): Errores => {
    const e: Errores = {};
    if (!datos.fecha) e.fecha = "Indica la fecha.";
    else if (datos.fecha > hoyISO()) e.fecha = "La fecha no puede ser futura.";
    if (!datos.lab) e.lab = "Elige el laboratorio.";
    if (!datos.entrada) e.entrada = "Indica la hora de entrada.";
    if (!datos.salida) e.salida = "Indica la hora de salida.";
    else if (datos.entrada && datos.salida <= datos.entrada)
      e.salida = "La hora de salida debe ser posterior a la de entrada.";
    if (!datos.orden) e.orden = "Indica si los equipos quedaron en orden.";
    if (datos.orden === "no" && !datos.observaciones.trim())
      e.observaciones = "Describe qué pasó con los equipos.";
    return e;
  };

  const alCambiarFirma = (f: string | null) => {
    setFirma(f);
    if (f) setErrFirma("");
  };

  const ir = (n: number) => {
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siguiente = () => {
    // si dejó una máquina escrita sin pulsar Enter, la agregamos
    if (pcTexto.trim()) agregarPcs(pcTexto);
    const er = validar();
    setErrores(er);
    if (Object.keys(er).length === 0) ir(1);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 1 || enviando) return;
    if (!firma) {
      setErrFirma("Firma en el recuadro antes de guardar.");
      return;
    }
    setEnviando(true);
    setErrorEnvio("");
    try {
      const firmaUrl = await subirFirma(firma);
      await registrarAcceso({
        lab: datos.lab, fecha: datos.fecha, entrada: datos.entrada, salida: datos.salida,
        enOrden: datos.orden === "si", observaciones: datos.observaciones,
        pcs, firmaUrl,
      });
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorEnvio(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const nuevo = () => {
    setDatos(inicial());
    setPcs([]);
    setPcTexto("");
    setErrores({});
    setFirma(null);
    setErrFirma("");
    setErrorEnvio("");
    setPaso(0);
    setEnviado(false);
  };

  const attrs = (k: keyof Errores) => ({
    id: k,
    "aria-invalid": errores[k] ? true : undefined,
    "aria-describedby": errores[k] ? `${k}-err` : undefined,
  });

  if (enviado) {
    return (
      <ShellDocente>
        <div className="ss-card ss-done" role="status">
          <span className="ss-done__icon"><Check size={30} strokeWidth={3} /></span>
          <h1 className="ss-done__title">Registro guardado</h1>
          <p className="ss-done__text">
            Quedó registrado tu uso del Laboratorio {datos.lab} el {formatoFecha(datos.fecha)},
            de {datos.entrada} a {datos.salida}.
            {pcs.length > 0 && ` Máquinas usadas: ${pcs.join(", ")}.`}
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={nuevo}>Hacer otro registro</button>
            <Link href="/" className="ss-btn ss-btn--primary">Volver al dashboard</Link>
          </div>
        </div>
      </ShellDocente>
    );
  }

  return (
    <ShellDocente>
      <h1 className="dd-title">Registrar acceso</h1>
      <p className="dd-subtitle">Anota cuándo usaste el laboratorio, qué máquinas ocuparon y cómo quedaron los equipos.</p>

      <div className="ss-card">
        <ol
          className="ss-steps" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          aria-label="Progreso del registro"
        >
          {PASOS.map((p, i) => (
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
            <legend className="ss-legend">Datos del ingreso</legend>
            <div className="ss-row">
              <Grupo id="docente" label="Docente">
                <input className="input" id="docente" value={perfil?.nombre ?? ""} readOnly />
              </Grupo>
              <Grupo id="fecha" label="Fecha" error={errores.fecha}>
                <input
                  className="input" type="date" max={hoyISO()}
                  {...attrs("fecha")} value={datos.fecha} onChange={set("fecha")}
                />
              </Grupo>
            </div>

            <div className="ss-group" role="radiogroup" aria-labelledby="lab-label">
              <span id="lab-label" className="ss-label">Laboratorio</span>
              <div className="ss-labs">
                {LABS.map((l: string | number) => {
                  const id = String(l);
                  const activo = datos.lab === id;
                  return (
                    <button
                      key={id} type="button" role="radio" aria-checked={activo}
                      className={`ss-lab ${activo ? "is-selected" : ""}`}
                      onClick={() => {
                        setDatos((d) => ({ ...d, lab: id }));
                        setErrores((er) => ({ ...er, lab: undefined }));
                      }}
                    >
                      <span className="ss-lab__icon"><Monitor size={18} /></span>
                      <span className="ss-lab__name">Laboratorio {id}</span>
                    </button>
                  );
                })}
              </div>
              {errores.lab && <p className="ss-error" role="alert">{errores.lab}</p>}
            </div>

            <div className="ss-row">
              <Grupo id="entrada" label="Hora de entrada" error={errores.entrada}>
                <input className="input" type="time" {...attrs("entrada")} value={datos.entrada} onChange={set("entrada")} />
                <button type="button" className="ss-link" style={{ marginTop: 6 }} onClick={() => ponerAhora("entrada")}>
                  <Clock size={12} style={{ display: "inline", marginRight: 4 }} />Usar hora actual
                </button>
              </Grupo>
              <Grupo id="salida" label="Hora de salida" error={errores.salida}>
                <input className="input" type="time" {...attrs("salida")} value={datos.salida} onChange={set("salida")} />
                <button type="button" className="ss-link" style={{ marginTop: 6 }} onClick={() => ponerAhora("salida")}>
                  <Clock size={12} style={{ display: "inline", marginRight: 4 }} />Usar hora actual
                </button>
              </Grupo>
            </div>

            <Grupo id="pcTexto" label="Máquinas utilizadas (opcional)">
              <input
                className="input" id="pcTexto" value={pcTexto}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/[,;]$/.test(v)) agregarPcs(v);
                  else setPcTexto(v);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarPcs(pcTexto);
                  } else if (e.key === "Backspace" && !pcTexto && pcs.length) {
                    setPcs((p) => p.slice(0, -1));
                  }
                }}
                onBlur={() => pcTexto.trim() && agregarPcs(pcTexto)}
                placeholder="Escribe PC-01 y pulsa Enter"
              />
              {pcs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {pcs.map((pc) => (
                    <span
                      key={pc}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 6px 4px 10px", borderRadius: 999,
                        background: "var(--dd-blue-soft)", color: "var(--dd-blue)",
                        fontSize: 12, fontWeight: 700,
                      }}
                    >
                      {pc}
                      <button
                        type="button" aria-label={`Quitar ${pc}`} onClick={() => quitarPc(pc)}
                        style={{ display: "grid", placeItems: "center", width: 18, height: 18, borderRadius: 999, background: "#fff" }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="dd-section-sub" style={{ marginTop: 6 }}>
                {pcs.length} máquina{pcs.length === 1 ? "" : "s"} agregada{pcs.length === 1 ? "" : "s"}.
              </p>
            </Grupo>

            <div className="ss-group" role="radiogroup" aria-labelledby="orden-label">
              <span id="orden-label" className="ss-label">¿Los equipos quedaron en orden?</span>
              <div className="ss-labs">
                <button
                  type="button" role="radio" aria-checked={datos.orden === "si"}
                  className={`ss-lab ${datos.orden === "si" ? "is-selected" : ""}`}
                  onClick={() => elegirOrden("si")}
                >
                  <span className="ss-lab__icon"><Check size={18} /></span>
                  <span className="ss-lab__name">Sí, todo en orden</span>
                  <span className="ss-lab__meta">Sin novedades</span>
                </button>
                <button
                  type="button" role="radio" aria-checked={datos.orden === "no"}
                  className={`ss-lab ${datos.orden === "no" ? "is-selected" : ""}`}
                  onClick={() => elegirOrden("no")}
                >
                  <span className="ss-lab__icon"><TriangleAlert size={18} /></span>
                  <span className="ss-lab__name">No, hay novedades</span>
                  <span className="ss-lab__meta">Cuéntanos qué pasó</span>
                </button>
              </div>
              {errores.orden && <p className="ss-error" role="alert">{errores.orden}</p>}
            </div>

            {datos.orden === "no" && (
              <p className="ss-error" style={{ marginTop: -4, marginBottom: 16 }}>
                Si un equipo falló, también{" "}
                <Link href="/docente/falla" className="ss-link">reporta la falla</Link>{" "}
                para que el técnico lo atienda.
              </p>
            )}

            <Grupo
              id="observaciones"
              label={datos.orden === "no" ? "Observaciones" : "Observaciones (opcional)"}
              error={errores.observaciones}
            >
              <textarea
                className="input" rows={3} {...attrs("observaciones")} value={datos.observaciones}
                onChange={set("observaciones")} placeholder="Ej: La PC-07 no tenía mouse al entrar"
              />
            </Grupo>
          </fieldset>

          {/* Paso 2 */}
          <fieldset className="ss-fieldset" hidden={paso !== 1}>
            <legend className="ss-legend">Revisa y firma</legend>
            <section className="ss-sum">
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Registro</h3>
                <button type="button" className="ss-link" onClick={() => ir(0)}>Editar</button>
              </div>
              <dl className="ss-sum__list">
                <Fila k="Docente" v={perfil?.nombre ?? "—"} />
                <Fila k="Fecha" v={formatoFecha(datos.fecha)} />
                <Fila k="Laboratorio" v={datos.lab ? `Laboratorio ${datos.lab}` : "—"} />
                <Fila k="Horario" v={`${datos.entrada || "—"} - ${datos.salida || "—"}`} />
                <Fila k="Máquinas" v={pcs.length ? pcs.join(", ") : "No indicadas"} />
                <Fila k="Equipos" v={datos.orden === "si" ? "En orden" : datos.orden === "no" ? "Con novedades" : "—"} />
                <Fila k="Observaciones" v={datos.observaciones.trim() || "Sin observaciones"} />
              </dl>
            </section>
            <Firma label="Firma" onChange={alCambiarFirma} />
            {errFirma && <p className="ss-error" role="alert">{errFirma}</p>}
          </fieldset>

          {errorEnvio && <p className="ss-error" role="alert">{errorEnvio}</p>}

          <div className="ss-actions">
            <Link href="/" className="ss-btn ss-btn--danger">Cancelar</Link>
            <div className="ss-actions__nav">
              {paso > 0 && (
                <button type="button" className="ss-btn ss-btn--ghost" onClick={() => ir(0)}>
                  <ArrowLeft size={16} /> Atrás
                </button>
              )}
              {paso === 0 ? (
                <button type="button" className="ss-btn ss-btn--primary" onClick={siguiente}>
                  Siguiente <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" className="ss-btn ss-btn--primary" disabled={enviando}>
                  <Save size={16} /> {enviando ? "Guardando…" : "Guardar registro"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ShellDocente>
  );
}