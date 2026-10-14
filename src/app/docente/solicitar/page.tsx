"use client";
import { useState } from "react";
import Link from "next/link";
import { Monitor, Check, ArrowLeft, ArrowRight, Send } from "lucide-react";
import ShellDocente from "@/components/docente/ShellDocente";
import { Firma } from "@/components/ui";
import { LABS, CARRERAS, PERIODOS } from "@/lib/datos";

/* TODO: reemplazar por el usuario logueado cuando tengas la sesión */
const USUARIO = "Juan Pérez";
/* TODO: si tienes la capacidad real de cada laboratorio, ponla aquí. */
const CAPACIDAD_DEFECTO = 40;

const PASOS = ["Académico", "Horario", "Detalles", "Revisión"];

type Datos = {
  nombre: string; carrera: string; asignatura: string; periodo: string;
  fecha: string; lab: string; inicio: string; fin: string;
  estudiantes: string; actividad: string; cedula: string;
};
type Errores = Partial<Record<keyof Datos, string>>;

const INICIAL: Datos = {
  nombre: USUARIO,
  carrera: CARRERAS[0] ?? "",
  asignatura: "",
  periodo: PERIODOS[0] ?? "",
  fecha: "", lab: "", inicio: "", fin: "",
  estudiantes: "", actividad: "", cedula: "",
};

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function validar(paso: number, d: Datos): Errores {
  const e: Errores = {};
  if (paso === 0) {
    if (!d.asignatura.trim()) e.asignatura = "Escribe el nombre de la asignatura.";
  }
  if (paso === 1) {
    if (!d.fecha) e.fecha = "Elige la fecha de la práctica.";
    else if (d.fecha < hoy()) e.fecha = "La fecha no puede ser anterior a hoy.";
    if (!d.lab) e.lab = "Elige un laboratorio.";
    if (!d.inicio) e.inicio = "Indica la hora de inicio.";
    if (!d.fin) e.fin = "Indica la hora de fin.";
    else if (d.inicio && d.fin <= d.inicio) e.fin = "La hora de fin debe ser posterior a la de inicio.";
  }
  if (paso === 2) {
    const n = Number(d.estudiantes);
    if (!d.estudiantes || !Number.isInteger(n) || n < 1)
      e.estudiantes = "Indica cuántos estudiantes asistirán.";
    else if (n > CAPACIDAD_DEFECTO)
      e.estudiantes = `El laboratorio admite hasta ${CAPACIDAD_DEFECTO} estudiantes.`;
    if (!/^\d{10}$/.test(d.cedula)) e.cedula = "La cédula debe tener 10 dígitos.";
  }
  return e;
}

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

function formatoFecha(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function Solicitar() {
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrores((er) => ({ ...er, [k]: undefined }));
    };

  const ir = (n: number) => {
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siguiente = () => {
    const er = validar(paso, datos);
    setErrores(er);
    if (Object.keys(er).length === 0) ir(paso + 1);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 3) return;
    // TODO: aquí va lo que hacía <Formulario> al enviar (API, localStorage, etc.).
    // La reserva debería quedar con estado "pendiente" en "Mis reservas".
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nueva = () => {
    setDatos(INICIAL);
    setErrores({});
    setPaso(0);
    setEnviado(false);
  };

  const attrs = (k: keyof Datos) => ({
    id: k,
    "aria-invalid": errores[k] ? true : undefined,
    "aria-describedby": errores[k] ? `${k}-err` : undefined,
  });

  if (enviado) {
    return (
      <ShellDocente>
        <div className="ss-card ss-done" role="status">
          <span className="ss-done__icon"><Check size={30} strokeWidth={3} /></span>
          <h1 className="ss-done__title">Solicitud enviada</h1>
          <p className="ss-done__text">
            El técnico revisará tu solicitud del {formatoFecha(datos.fecha)}, de {datos.inicio} a {datos.fin},
            en el Laboratorio {datos.lab}. Verás el estado en Mis reservas.
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={nueva}>Hacer otra solicitud</button>
            <Link href="/" className="ss-btn ss-btn--primary">Ir a mis reservas</Link>
          </div>
        </div>
      </ShellDocente>
    );
  }

  return (
    <ShellDocente>
      <h1 className="dd-title">Solicitar laboratorio</h1>
      <p className="dd-subtitle">Completa los 4 pasos y el técnico revisará tu solicitud.</p>

      <div className="ss-card">
        <ol className="ss-steps" aria-label="Progreso de la solicitud">
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
          {/* Todos los pasos quedan montados (solo se ocultan) para no perder lo escrito ni la firma */}

          {/* Paso 1 */}
          <fieldset className="ss-fieldset" hidden={paso !== 0}>
            <legend className="ss-legend">Datos académicos</legend>
            <Grupo id="nombre" label="Nombres y apellidos">
              <input className="input" id="nombre" value={datos.nombre} readOnly />
            </Grupo>
            <div className="ss-row">
              <Grupo id="carrera" label="Carrera">
                <select className="input" {...attrs("carrera")} value={datos.carrera} onChange={set("carrera")}>
                  {CARRERAS.map((c: string) => <option key={c}>{c}</option>)}
                </select>
              </Grupo>
              <Grupo id="periodo" label="Período académico">
                <select className="input" {...attrs("periodo")} value={datos.periodo} onChange={set("periodo")}>
                  {PERIODOS.map((p: string) => <option key={p}>{p}</option>)}
                </select>
              </Grupo>
            </div>
            <Grupo id="asignatura" label="Asignatura" error={errores.asignatura}>
              <input
                className="input" {...attrs("asignatura")} value={datos.asignatura}
                onChange={set("asignatura")} placeholder="Ej: Programación Web"
              />
            </Grupo>
          </fieldset>

          {/* Paso 2 */}
          <fieldset className="ss-fieldset" hidden={paso !== 1}>
            <legend className="ss-legend">Laboratorio y horario</legend>
            <Grupo id="fecha" label="Fecha de la práctica" error={errores.fecha}>
              <input className="input" type="date" min={hoy()} {...attrs("fecha")} value={datos.fecha} onChange={set("fecha")} />
            </Grupo>

            <div className="ss-group" role="radiogroup" aria-labelledby="lab-label">
              <span id="lab-label" className="ss-label">Laboratorio solicitado</span>
              <div className="ss-labs">
                {LABS.map((l: string | number) => {
                  const id = String(l);
                  const activo = datos.lab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      className={`ss-lab ${activo ? "is-selected" : ""}`}
                      onClick={() => {
                        setDatos((d) => ({ ...d, lab: id }));
                        setErrores((er) => ({ ...er, lab: undefined }));
                      }}
                    >
                      <span className="ss-lab__icon"><Monitor size={18} /></span>
                      <span className="ss-lab__name">Laboratorio {id}</span>
                      <span className="ss-lab__meta">Hasta {CAPACIDAD_DEFECTO} estudiantes</span>
                    </button>
                  );
                })}
              </div>
              {errores.lab && <p className="ss-error" role="alert">{errores.lab}</p>}
            </div>

            <div className="ss-row">
              <Grupo id="inicio" label="Hora de inicio" error={errores.inicio}>
                <input className="input" type="time" {...attrs("inicio")} value={datos.inicio} onChange={set("inicio")} />
              </Grupo>
              <Grupo id="fin" label="Hora de fin" error={errores.fin}>
                <input className="input" type="time" {...attrs("fin")} value={datos.fin} onChange={set("fin")} />
              </Grupo>
            </div>
          </fieldset>

          {/* Paso 3 */}
          <fieldset className="ss-fieldset" hidden={paso !== 2}>
            <legend className="ss-legend">Detalles de la práctica</legend>
            <div className="ss-row">
              <Grupo id="estudiantes" label="N.º de estudiantes" error={errores.estudiantes}>
                <input
                  className="input" type="number" min={1} max={CAPACIDAD_DEFECTO}
                  placeholder={`Máx. ${CAPACIDAD_DEFECTO}`}
                  {...attrs("estudiantes")} value={datos.estudiantes} onChange={set("estudiantes")}
                />
              </Grupo>
              <Grupo id="cedula" label="Cédula del solicitante" error={errores.cedula}>
                <input
                  className="input" inputMode="numeric" maxLength={10} placeholder="10 dígitos"
                  {...attrs("cedula")} value={datos.cedula}
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, "");
                    set("cedula")(e);
                  }}
                />
              </Grupo>
            </div>
            <Grupo id="actividad" label="Actividad a realizar (opcional)">
              <textarea
                className="input" rows={3} {...attrs("actividad")} value={datos.actividad}
                onChange={set("actividad")} placeholder="Ej: Práctica de consultas SQL con el grupo A"
              />
            </Grupo>
            <Firma label="Firma del solicitante" />
          </fieldset>

          {/* Paso 4 */}
          <fieldset className="ss-fieldset" hidden={paso !== 3}>
            <legend className="ss-legend">Revisa tu solicitud</legend>
            <Resumen
              titulo="Datos académicos" onEditar={() => ir(0)}
              filas={[
                ["Solicitante", datos.nombre],
                ["Carrera", datos.carrera],
                ["Asignatura", datos.asignatura],
                ["Período", datos.periodo],
              ]}
            />
            <Resumen
              titulo="Laboratorio y horario" onEditar={() => ir(1)}
              filas={[
                ["Fecha", formatoFecha(datos.fecha)],
                ["Laboratorio", datos.lab ? `Laboratorio ${datos.lab}` : "—"],
                ["Horario", `${datos.inicio || "—"} - ${datos.fin || "—"}`],
              ]}
            />
            <Resumen
              titulo="Detalles" onEditar={() => ir(2)}
              filas={[
                ["Estudiantes", datos.estudiantes || "—"],
                ["Cédula", datos.cedula || "—"],
                ["Actividad", datos.actividad.trim() || "Sin especificar"],
              ]}
            />
          </fieldset>

          <div className="ss-actions">
            <Link href="/" className="ss-btn ss-btn--danger">Cancelar</Link>
            <div className="ss-actions__nav">
              {paso > 0 && (
                <button type="button" className="ss-btn ss-btn--ghost" onClick={() => ir(paso - 1)}>
                  <ArrowLeft size={16} /> Atrás
                </button>
              )}
              {paso < 3 ? (
                <button type="button" className="ss-btn ss-btn--primary" onClick={siguiente}>
                  Siguiente <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" className="ss-btn ss-btn--primary">
                  <Send size={16} /> Enviar solicitud
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ShellDocente>
  );
}

function Resumen({
  titulo, filas, onEditar,
}: { titulo: string; filas: [string, string][]; onEditar: () => void }) {
  return (
    <section className="ss-sum">
      <div className="ss-sum__head">
        <h3 className="ss-sum__title">{titulo}</h3>
        <button type="button" className="ss-link" onClick={onEditar}>Editar</button>
      </div>
      <dl className="ss-sum__list">
        {filas.map(([k, v]) => (
          <div key={k} className="ss-sum__row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}