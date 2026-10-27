"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Check, ArrowLeft, ArrowRight, Send } from "lucide-react";
import ShellDocente from "@/components/docente/ShellDocente";
import { Firma } from "@/components/ui";
import { LABS, CARRERAS, PERIODOS } from "@/lib/datos";
import {
  crearReserva, choqueConClase, mensajeError, cargarOcupacionFecha, type OcupacionDia,
} from "@/lib/reservas";
import { cargarHorarios, type Bloque } from "@/lib/horarios";
import { usePerfil } from "@/lib/perfil";

/* TODO: si tienes la capacidad real de cada laboratorio, ponla aquí. */
const CAPACIDAD_DEFECTO = 40;

const PASOS = ["Académico", "Horario", "Detalles", "Revisión"];

const MSG_FINDE = "La ULEAM no atiende sábados ni domingos. Elige un día de lunes a viernes.";

type Datos = {
  nombre: string; carrera: string; asignatura: string; periodo: string;
  fecha: string; lab: string; inicio: string; fin: string;
  estudiantes: string; actividad: string; cedula: string;
};
type Errores = Partial<Record<keyof Datos, string>>;

const INICIAL: Datos = {
  nombre: "",
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

const aH = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) + Number(m) / 60;
};

/** true si la fecha ISO cae en sábado o domingo */
const esFinDeSemana = (iso: string) => {
  if (!iso) return false;
  const d = new Date(`${iso}T00:00:00`).getDay(); // 0 = domingo, 6 = sábado
  return d === 0 || d === 6;
};

function validar(paso: number, d: Datos): Errores {
  const e: Errores = {};
  if (paso === 0) {
    if (!d.asignatura.trim()) e.asignatura = "Escribe el nombre de la asignatura.";
  }
  if (paso === 1) {
    if (!d.fecha) e.fecha = "Elige la fecha de la práctica.";
    else if (d.fecha < hoy()) e.fecha = "La fecha no puede ser anterior a hoy.";
    else if (esFinDeSemana(d.fecha)) e.fecha = MSG_FINDE;
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
  const perfil = usePerfil();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState("");
  const [horarios, setHorarios] = useState<Record<string, Bloque[][]>>({});
  const [reservasDia, setReservasDia] = useState<OcupacionDia[]>([]);

  useEffect(() => {
    cargarHorarios().then(setHorarios).catch(() => {});
  }, []);

  useEffect(() => {
    if (!datos.fecha || esFinDeSemana(datos.fecha)) {
      setReservasDia([]);
      return;
    }
    cargarOcupacionFecha(datos.fecha).then(setReservasDia).catch(() => setReservasDia([]));
  }, [datos.fecha]);

  const finde = esFinDeSemana(datos.fecha);
  const hayRango = !!(datos.inicio && datos.fin && datos.fin > datos.inicio);
  const textoOcupado = hayRango ? "Ocupado" : "Ocupado ahora";
  const textoLibre = hayRango ? "Libre" : "Libre ahora";

  /** "ocupado" | "libre" | null (si aún no hay datos suficientes para saberlo) */
  const estadoLab = (l: string): "ocupado" | "libre" | null => {
    if (!datos.fecha || esFinDeSemana(datos.fecha)) return null;
    let a: number, b: number;
    if (hayRango) {
      a = aH(datos.inicio);
      b = aH(datos.fin);
    } else if (datos.fecha === hoy()) {
      const n = new Date();
      a = n.getHours() + n.getMinutes() / 60;
      b = a + 0.01; // "ahora"
    } else {
      return null;
    }
    const dia = (new Date(`${datos.fecha}T00:00:00`).getDay() + 6) % 7; // 0 = lunes
    const clase = dia <= 4 && (horarios[l]?.[dia] ?? []).some(([i, f]) => a < f && i < b);
    const reserva = reservasDia.some((r) => r.lab === l && a < r.fin && r.ini < b);
    return clase || reserva ? "ocupado" : "libre";
  };

  // Si el laboratorio elegido pasa a ocupado (o la fecha cae en fin de semana), se deselecciona
  useEffect(() => {
    if (datos.lab && (esFinDeSemana(datos.fecha) || estadoLab(datos.lab) === "ocupado")) {
      setDatos((d) => ({ ...d, lab: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datos.fecha, datos.inicio, datos.fin, horarios, reservasDia]);

  const set = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const valor = e.target.value;
      setDatos((d) => ({ ...d, [k]: valor }));
      setErrores((er) => ({
        ...er,
        [k]: k === "fecha" && esFinDeSemana(valor) ? MSG_FINDE : undefined,
      }));
    };

  const ir = (n: number) => {
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siguiente = async () => {
    const er = validar(paso, datos);
    if (paso === 1 && datos.lab && estadoLab(datos.lab) === "ocupado") {
      er.lab = `El Laboratorio ${datos.lab} está ocupado en ese horario. Elige otro.`;
    }
    if (Object.keys(er).length === 0 && paso === 1) {
      try {
        const choque = await choqueConClase(datos.lab, datos.fecha, datos.inicio, datos.fin);
        if (choque) er.lab = choque;
      } catch { /* si falla la consulta, el técnico lo verá al aprobar */ }
    }
    setErrores(er);
    if (Object.keys(er).length === 0) ir(paso + 1);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 3 || enviando) return;
    setEnviando(true);
    setErrorEnvio("");
    try {
      await crearReserva({
        lab: datos.lab, fecha: datos.fecha, inicio: datos.inicio, fin: datos.fin,
        carrera: datos.carrera, periodo: datos.periodo, asignatura: datos.asignatura,
        estudiantes: Number(datos.estudiantes), actividad: datos.actividad,
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
    setErrores({});
    setErrorEnvio("");
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
            <Link href="/docente/reservas" className="ss-btn ss-btn--primary">Ir a mis reservas</Link>
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
              <input className="input" id="nombre" value={perfil?.nombre ?? ""} readOnly />
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
            <Grupo id="fecha" label="Fecha de la práctica (lunes a viernes)" error={errores.fecha}>
              <input className="input" type="date" min={hoy()} {...attrs("fecha")} value={datos.fecha} onChange={set("fecha")} />
            </Grupo>

            <div className="ss-row">
              <Grupo id="inicio" label="Hora de inicio" error={errores.inicio}>
                <input className="input" type="time" {...attrs("inicio")} value={datos.inicio} onChange={set("inicio")} />
              </Grupo>
              <Grupo id="fin" label="Hora de fin" error={errores.fin}>
                <input className="input" type="time" {...attrs("fin")} value={datos.fin} onChange={set("fin")} />
              </Grupo>
            </div>

            <div className="ss-group" role="radiogroup" aria-labelledby="lab-label">
              <span id="lab-label" className="ss-label">Laboratorio solicitado</span>
              {finde ? (
                <p className="dd-section-sub" style={{ marginBottom: 8 }}>
                  Elige una fecha de lunes a viernes para poder seleccionar un laboratorio.
                </p>
              ) : hayRango ? (
                <p className="dd-section-sub" style={{ marginBottom: 8 }}>
                  Los laboratorios ocupados en ese horario no se pueden seleccionar.
                </p>
              ) : null}
              <div className="ss-labs">
                {LABS.map((l: string | number) => {
                  const id = String(l);
                  const activo = datos.lab === id;
                  const estado = estadoLab(id);
                  const bloqueado = estado === "ocupado" || finde;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      disabled={bloqueado}
                      className={`ss-lab ${activo ? "is-selected" : ""} ${bloqueado ? "is-ocupado" : ""}`}
                      onClick={() => {
                        if (bloqueado) return;
                        setDatos((d) => ({ ...d, lab: id }));
                        setErrores((er) => ({ ...er, lab: undefined }));
                      }}
                    >
                      <span className="ss-lab__icon"><Monitor size={18} /></span>
                      <span className="ss-lab__name">Laboratorio {id}</span>
                      <span className="ss-lab__meta">Hasta {CAPACIDAD_DEFECTO} estudiantes</span>
                      {estado && (
                        <span
                          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={
                            estado === "ocupado"
                              ? { background: "var(--dd-danger-soft)", color: "var(--dd-danger)" }
                              : { background: "var(--dd-ok-bg)", color: "var(--dd-ok-fg)" }
                          }
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: estado === "ocupado" ? "var(--dd-danger)" : "var(--dd-ok)" }}
                          />
                          {estado === "ocupado" ? textoOcupado : textoLibre}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {errores.lab && <p className="ss-error" role="alert">{errores.lab}</p>}
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
                ["Solicitante", perfil?.nombre ?? "—"],
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

          {errorEnvio && <p className="ss-error" role="alert">{errorEnvio}</p>}

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