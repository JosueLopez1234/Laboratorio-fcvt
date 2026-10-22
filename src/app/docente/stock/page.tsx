"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, ArrowRight, Send, Minus, Plus } from "lucide-react";
import ShellDocente from "@/components/docente/ShellDocente";
import { Firma } from "@/components/ui";
import { LABS, PERIODOS } from "@/lib/datos";
import { crearSolicitudMaterial } from "@/lib/material";
import { mensajeError } from "@/lib/reservas";
import { usePerfil } from "@/lib/perfil";

const PASOS = ["Solicitud", "Materiales", "Revisión"];

const MATERIALES = [
  "Cable HDMI", "Cable Ethernet", "Cable VGA", "Cable de poder para proyector",
  "Disco duro", "Mouse", "Teclado", "Otros",
];
const MAX_CANT = 99;

type Datos = { lab: string; periodo: string; carrera: string; justificacion: string; otros: string };
type Errores = Partial<Record<"lab" | "carrera" | "materiales" | "otros", string>>;

const hoy = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const INICIAL: Datos = { lab: "", periodo: PERIODOS[0] ?? "", carrera: "", justificacion: "", otros: "" };

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

export default function Stock() {
  const perfil = usePerfil();
  const nombre = perfil?.nombre ?? "";
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>(INICIAL);
  const [mats, setMats] = useState<Record<string, number>>({});
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [fecha] = useState(hoy);

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const toggle = (m: string) => {
    setMats((prev) => {
      const n = { ...prev };
      if (m in n) delete n[m];
      else n[m] = 1;
      return n;
    });
    setErrores((er) => ({ ...er, materiales: undefined }));
  };

  const cambiar = (m: string, delta: number) =>
    setMats((prev) => ({ ...prev, [m]: Math.min(MAX_CANT, Math.max(1, (prev[m] ?? 1) + delta)) }));

  const validar = (p: number): Errores => {
    const e: Errores = {};
    if (p === 0) {
      if (!datos.lab) e.lab = "Elige el laboratorio que recibirá el material.";
      if (!datos.carrera.trim()) e.carrera = "Escribe la carrera o la asignatura.";
    }
    if (p === 1) {
      if (Object.keys(mats).length === 0) e.materiales = "Elige al menos un material.";
      if ("Otros" in mats && !datos.otros.trim()) e.otros = "Indica qué otro material necesitas.";
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

  const lista = Object.entries(mats);
  const totalUnidades = lista.reduce((s, [, c]) => s + c, 0);
  const nombreMat = (m: string) => (m === "Otros" ? `Otros: ${datos.otros.trim() || "—"}` : m);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 2 || enviando) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      await crearSolicitudMaterial({
        lab: datos.lab,
        periodo: datos.periodo,
        carrera: datos.carrera,
        items: lista.map(([m, c]) => ({ material: nombreMat(m), cantidad: c })),
        justificacion: datos.justificacion,
      });
      setEnviado(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorEnvio(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const nueva = () => {
    setDatos(INICIAL);
    setMats({});
    setErrores({});
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
          <h1 className="ss-done__title">Solicitud de material enviada</h1>
          <p className="ss-done__text">
            Pediste {totalUnidades} {totalUnidades === 1 ? "unidad" : "unidades"} para el Laboratorio {datos.lab}.
            El técnico revisará tu solicitud.
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={nueva}>Hacer otra solicitud</button>
            <Link href="/" className="ss-btn ss-btn--primary">Volver al dashboard</Link>
          </div>
        </div>
      </ShellDocente>
    );
  }

  return (
    <ShellDocente>
      <h1 className="dd-title">Solicitar material</h1>
      <p className="dd-subtitle">Pide cables y equipos para tu laboratorio en 3 pasos.</p>

      <div className="ss-card">
        <ol className="ss-steps ss-steps--3" aria-label="Progreso de la solicitud">
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
            <legend className="ss-legend">Datos de la solicitud</legend>
            <div className="ss-row">
              <Grupo id="nombre" label="Nombre y apellidos">
                <input className="input" id="nombre" value={nombre} readOnly />
              </Grupo>
              <Grupo id="fecha" label="Fecha de solicitud">
                <input className="input" id="fecha" value={fecha} readOnly />
              </Grupo>
            </div>
            <div className="ss-row">
              <Grupo id="lab" label="Laboratorio" error={errores.lab}>
                <select className="input" {...attrs("lab")} value={datos.lab} onChange={set("lab")}>
                  <option value="">Selecciona un laboratorio</option>
                  {LABS.map((l: string | number) => (
                    <option key={String(l)} value={String(l)}>Laboratorio {l}</option>
                  ))}
                </select>
              </Grupo>
              <Grupo id="periodo" label="Período académico">
                <select className="input" id="periodo" value={datos.periodo} onChange={set("periodo")}>
                  {PERIODOS.map((p: string) => <option key={p}>{p}</option>)}
                </select>
              </Grupo>
            </div>
            <Grupo id="carrera" label="Carrera / asignatura" error={errores.carrera}>
              <input
                className="input" {...attrs("carrera")} value={datos.carrera} onChange={set("carrera")}
                placeholder="Ej: Ingeniería en Software / Redes"
              />
            </Grupo>
          </fieldset>

          {/* Paso 2 */}
          <fieldset className="ss-fieldset" hidden={paso !== 1}>
            <legend className="ss-legend">¿Qué material necesitas?</legend>
            <div className="ss-group">
              <span id="mats-label" className="ss-label">Toca los que necesites y ajusta la cantidad</span>
              <div className="ss-mats" role="group" aria-labelledby="mats-label">
                {MATERIALES.map((m) => {
                  const activo = m in mats;
                  return (
                    <div key={m} className={`ss-mat ${activo ? "is-selected" : ""}`}>
                      <button
                        type="button" role="checkbox" aria-checked={activo}
                        className="ss-mat__main" onClick={() => toggle(m)}
                      >
                        <span className="ss-mat__check">{activo && <Check size={12} strokeWidth={3} />}</span>
                        <span className="ss-mat__name">{m}</span>
                      </button>
                      {activo && (
                        <div className="ss-qty" role="group" aria-label={`Cantidad de ${m}`}>
                          <button type="button" aria-label="Disminuir cantidad" onClick={() => cambiar(m, -1)}>
                            <Minus size={14} />
                          </button>
                          <span aria-live="polite">{mats[m]}</span>
                          <button type="button" aria-label="Aumentar cantidad" onClick={() => cambiar(m, 1)}>
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {errores.materiales && <p className="ss-error" role="alert">{errores.materiales}</p>}
            </div>

            {"Otros" in mats && (
              <Grupo id="otros" label="¿Qué otro material?" error={errores.otros}>
                <input
                  className="input" {...attrs("otros")} value={datos.otros} onChange={set("otros")}
                  placeholder="Ej: Adaptador USB-C a HDMI"
                />
              </Grupo>
            )}

            <Grupo id="justificacion" label="Justificación del pedido (opcional)">
              <textarea
                className="input" rows={3} id="justificacion" value={datos.justificacion}
                onChange={set("justificacion")} placeholder="Ej: Los cables del laboratorio están dañados"
              />
            </Grupo>
          </fieldset>

          {/* Paso 3 */}
          <fieldset className="ss-fieldset" hidden={paso !== 2}>
            <legend className="ss-legend">Revisa y firma</legend>

            <section className="ss-sum">
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Solicitud</h3>
                <button type="button" className="ss-link" onClick={() => ir(0)}>Editar</button>
              </div>
              <dl className="ss-sum__list">
                <Fila k="Solicitante" v={nombre || "—"} />
                <Fila k="Fecha" v={fecha} />
                <Fila k="Laboratorio" v={datos.lab ? `Laboratorio ${datos.lab}` : "—"} />
                <Fila k="Período" v={datos.periodo} />
                <Fila k="Carrera / asignatura" v={datos.carrera || "—"} />
              </dl>
            </section>

            <section className="ss-sum">
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Materiales ({totalUnidades})</h3>
                <button type="button" className="ss-link" onClick={() => ir(1)}>Editar</button>
              </div>
              <dl className="ss-sum__list">
                {lista.map(([m, c]) => <Fila key={m} k={`× ${c}`} v={nombreMat(m)} />)}
                <Fila k="Justificación" v={datos.justificacion.trim() || "Sin especificar"} />
              </dl>
            </section>

            <Firma label="Firma del solicitante" />
          </fieldset>

          {errorEnvio && <p className="ss-error" role="alert">{errorEnvio}</p>}

          <div className="ss-actions">
            <Link href="/" className="ss-btn ss-btn--danger">Cancelar</Link>
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
                  <Send size={16} /> {enviando ? "Enviando…" : "Enviar solicitud"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ShellDocente>
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