"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, ArrowRight, Send } from "lucide-react";
import ShellDocente, { type ItemMenu } from "@/components/docente/ShellDocente";
import { CARRERAS, PERIODOS } from "@/lib/datos";
import { crearFalla } from "@/lib/fallas";
import { mensajeError } from "@/lib/reservas";
import { usePerfil } from "@/lib/perfil";

const PASOS = ["Equipo", "Falla", "Revisión"];

const FALLAS = [
  "No enciende", "Pantalla azul", "Sin acceso a internet",
  "Mouse/teclado no responde", "Computadora hackeada", "Daño físico visible",
  "Problema con proyector o pantalla", "Otros",
];

type Datos = {
  fecha: string; equipo: string; aula: string; carrera: string; periodo: string; descripcion: string;
};
type Errores = Partial<Record<"fecha" | "equipo" | "aula" | "tipos" | "descripcion", string>>;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatoFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const inicial = (): Datos => ({
  fecha: hoyISO(), equipo: "", aula: "",
  carrera: CARRERAS[0] ?? "", periodo: PERIODOS[0] ?? "", descripcion: "",
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

export default function FormFalla({ menu }: { menu?: ItemMenu[] }) {
  const perfil = usePerfil();
  const nombre = perfil?.nombre ?? "";
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>(inicial);
  const [tipos, setTipos] = useState<string[]>([]);
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const toggle = (t: string) => {
    setTipos((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setErrores((er) => ({ ...er, tipos: undefined, descripcion: undefined }));
  };

  const validar = (p: number): Errores => {
    const e: Errores = {};
    if (p === 0) {
      if (!datos.fecha) e.fecha = "Indica la fecha de la falla.";
      else if (datos.fecha > hoyISO()) e.fecha = "La fecha no puede ser futura.";
      if (!datos.equipo.trim()) e.equipo = "Indica el número del equipo.";
      if (!datos.aula.trim()) e.aula = "Indica el aula o laboratorio.";
    }
    if (p === 1) {
      if (tipos.length === 0) e.tipos = "Elige al menos un tipo de falla.";
      if (tipos.includes("Otros") && !datos.descripcion.trim())
        e.descripcion = "Describe el problema, ya que elegiste Otros.";
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
      await crearFalla({
        equipo: datos.equipo, aula: datos.aula, carrera: datos.carrera,
        periodo: datos.periodo, tipos, descripcion: datos.descripcion,
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
    setTipos([]);
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
      <ShellDocente menu={menu}>
        <div className="ss-card ss-done" role="status">
          <span className="ss-done__icon"><Check size={30} strokeWidth={3} /></span>
          <h1 className="ss-done__title">Reporte enviado</h1>
          <p className="ss-done__text">
            Registramos la falla del equipo {datos.equipo} en {datos.aula}. El técnico la revisará.
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={nuevo}>Reportar otra falla</button>
            <Link href="/" className="ss-btn ss-btn--primary">Volver al dashboard</Link>
          </div>
        </div>
      </ShellDocente>
    );
  }

  return (
    <ShellDocente menu={menu}>
      <h1 className="dd-title">Reportar incidencia</h1>
      <p className="dd-subtitle">Cuéntanos qué equipo falló y el técnico lo revisará.</p>

      <div className="ss-card">
        <ol className="ss-steps ss-steps--3" aria-label="Progreso del reporte">
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
            <legend className="ss-legend">¿Dónde está el equipo?</legend>
            <div className="ss-row">
              <Grupo id="nombre" label="Nombres y apellidos">
                <input className="input" id="nombre" value={nombre} readOnly />
              </Grupo>
              <Grupo id="fecha" label="Fecha de la falla" error={errores.fecha}>
                <input
                  className="input" type="date" max={hoyISO()}
                  {...attrs("fecha")} value={datos.fecha} onChange={set("fecha")}
                />
              </Grupo>
            </div>
            <div className="ss-row">
              <Grupo id="equipo" label="PC N.º / equipo" error={errores.equipo}>
                <input
                  className="input" {...attrs("equipo")} value={datos.equipo}
                  onChange={set("equipo")} placeholder="Ej: PC-12"
                />
              </Grupo>
              <Grupo id="aula" label="Aula" error={errores.aula}>
                <input
                  className="input" {...attrs("aula")} value={datos.aula}
                  onChange={set("aula")} placeholder="Ej: Laboratorio 203"
                />
              </Grupo>
            </div>
            <div className="ss-row">
              <Grupo id="carrera" label="Carrera">
                <select className="input" id="carrera" value={datos.carrera} onChange={set("carrera")}>
                  {CARRERAS.map((c: string) => <option key={c}>{c}</option>)}
                </select>
              </Grupo>
              <Grupo id="periodo" label="Período académico">
                <select className="input" id="periodo" value={datos.periodo} onChange={set("periodo")}>
                  {PERIODOS.map((p: string) => <option key={p}>{p}</option>)}
                </select>
              </Grupo>
            </div>
          </fieldset>

          {/* Paso 2 */}
          <fieldset className="ss-fieldset" hidden={paso !== 1}>
            <legend className="ss-legend">¿Qué falla tiene?</legend>
            <div className="ss-group">
              <span id="tipos-label" className="ss-label">Puedes elegir más de una</span>
              <div className="ss-mats" role="group" aria-labelledby="tipos-label">
                {FALLAS.map((t) => {
                  const activo = tipos.includes(t);
                  return (
                    <div key={t} className={`ss-mat ${activo ? "is-selected" : ""}`}>
                      <button
                        type="button" role="checkbox" aria-checked={activo}
                        className="ss-mat__main" onClick={() => toggle(t)}
                      >
                        <span className="ss-mat__check">{activo && <Check size={12} strokeWidth={3} />}</span>
                        <span className="ss-mat__name">{t}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {errores.tipos && <p className="ss-error" role="alert">{errores.tipos}</p>}
            </div>

            <Grupo
              id="descripcion"
              label={tipos.includes("Otros") ? "Descripción del problema" : "Descripción del problema (opcional)"}
              error={errores.descripcion}
            >
              <textarea
                className="input" rows={4} {...attrs("descripcion")} value={datos.descripcion}
                onChange={set("descripcion")} placeholder="Ej: Se apaga sola a los 10 minutos de encenderla"
              />
            </Grupo>
          </fieldset>

          {/* Paso 3 */}
          <fieldset className="ss-fieldset" hidden={paso !== 2}>
            <legend className="ss-legend">Revisa tu reporte</legend>

            <section className="ss-sum">
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Equipo</h3>
                <button type="button" className="ss-link" onClick={() => ir(0)}>Editar</button>
              </div>
              <dl className="ss-sum__list">
                <Fila k="Reportado por" v={nombre || "—"} />
                <Fila k="Fecha" v={formatoFecha(datos.fecha)} />
                <Fila k="Equipo" v={datos.equipo || "—"} />
                <Fila k="Aula" v={datos.aula || "—"} />
                <Fila k="Carrera" v={datos.carrera} />
                <Fila k="Período" v={datos.periodo} />
              </dl>
            </section>

            <section className="ss-sum">
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Falla</h3>
                <button type="button" className="ss-link" onClick={() => ir(1)}>Editar</button>
              </div>
              <dl className="ss-sum__list">
                <Fila k="Tipo" v={tipos.join(", ") || "—"} />
                <Fila k="Descripción" v={datos.descripcion.trim() || "Sin especificar"} />
              </dl>
            </section>
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
                  <Send size={16} /> {enviando ? "Enviando…" : "Enviar reporte"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ShellDocente>
  );
}