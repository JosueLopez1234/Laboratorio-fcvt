"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ArrowLeft, ArrowRight, Send, Plus, X } from "lucide-react";
import ShellDocente, { MENU_ESTUDIANTE } from "@/components/docente/ShellDocente";
import { Firma } from "@/components/ui";
import { CARRERAS, PERIODOS } from "@/lib/datos";

const MAX_EST = 40;
const PASOS = ["Datos", "Estudiantes", "Firma"];

const COMPROMISOS = [
  "Usar el equipo solo para fines académicos.",
  "No comer ni beber en el laboratorio.",
  "No mover ni desconectar equipos.",
  "No instalar programas sin autorización.",
  "No visitar páginas de juegos o de contenido inapropiado.",
  "Reportar los daños de inmediato.",
  "Responder por los daños causados por mal uso.",
];

type Fila = { id: number; cedula: string; nombre: string };
type Datos = { carrera: string; fecha: string; periodo: string };
type ErroresDatos = Partial<Record<keyof Datos, string>>;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const formatoFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

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

function FilaResumen({ k, v }: { k: string; v: string }) {
  return (
    <div className="ss-sum__row">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

export default function Acta() {
  const sig = useRef(6); // próximo id de fila
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState<Datos>({ carrera: CARRERAS[0] ?? "", fecha: hoyISO(), periodo: PERIODOS[0] ?? "" });
  const [filas, setFilas] = useState<Fila[]>(
    Array.from({ length: 5 }, (_, i) => ({ id: i + 1, cedula: "", nombre: "" })),
  );
  const [acepto, setAcepto] = useState(false);
  const [errDatos, setErrDatos] = useState<ErroresDatos>({});
  const [errFilas, setErrFilas] = useState<Record<number, string>>({});
  const [errGeneral, setErrGeneral] = useState("");
  const [errAcepto, setErrAcepto] = useState("");
  const [enviado, setEnviado] = useState(false);

  const llenas = filas.filter((f) => f.cedula.trim() || f.nombre.trim());

  const setDato = (k: keyof Datos) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDatos((d) => ({ ...d, [k]: e.target.value }));
      setErrDatos((er) => ({ ...er, [k]: undefined }));
    };

  const setFila = (id: number, k: "cedula" | "nombre", v: string) => {
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [k]: k === "cedula" ? v.replace(/\D/g, "") : v } : f)));
    setErrFilas((er) => {
      const n = { ...er };
      delete n[id];
      return n;
    });
    setErrGeneral("");
  };

  const agregar = () => {
    if (filas.length >= MAX_EST) return;
    setFilas((fs) => [...fs, { id: sig.current++, cedula: "", nombre: "" }]);
  };
  const quitar = (id: number) => setFilas((fs) => (fs.length > 1 ? fs.filter((f) => f.id !== id) : fs));

  const validarDatos = () => {
    const e: ErroresDatos = {};
    if (!datos.fecha) e.fecha = "Indica la fecha del compromiso.";
    else if (datos.fecha > hoyISO()) e.fecha = "La fecha no puede ser futura.";
    setErrDatos(e);
    return Object.keys(e).length === 0;
  };

  const validarFilas = () => {
    const e: Record<number, string> = {};
    const vistas = new Set<string>();
    for (const f of llenas) {
      if (!/^\d{10}$/.test(f.cedula)) e[f.id] = "La cédula debe tener 10 dígitos.";
      else if (vistas.has(f.cedula)) e[f.id] = "Esta cédula ya está en la lista.";
      else if (!f.nombre.trim()) e[f.id] = "Falta el nombre y apellidos.";
      vistas.add(f.cedula);
    }
    setErrFilas(e);
    const general = llenas.length === 0 ? "Agrega al menos un estudiante." : "";
    setErrGeneral(general);
    return Object.keys(e).length === 0 && !general;
  };

  const ir = (n: number) => {
    setPaso(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const siguiente = () => {
    if (paso === 0 && validarDatos()) ir(1);
    else if (paso === 1 && validarFilas()) ir(2);
  };

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (paso !== 2) return;
    if (!acepto) {
      setErrAcepto("Debes aceptar el compromiso para firmar el acta.");
      return;
    }
    // TODO: aquí va lo que hacía <Formulario> al firmar (API, localStorage, etc.).
    // Guarda solo las filas completas: `llenas`.
    setEnviado(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nueva = () => {
    sig.current = 6;
    setDatos({ carrera: CARRERAS[0] ?? "", fecha: hoyISO(), periodo: PERIODOS[0] ?? "" });
    setFilas(Array.from({ length: 5 }, (_, i) => ({ id: i + 1, cedula: "", nombre: "" })));
    setAcepto(false);
    setErrDatos({}); setErrFilas({}); setErrGeneral(""); setErrAcepto("");
    setPaso(0);
    setEnviado(false);
  };

  if (enviado) {
    return (
      <ShellDocente menu={MENU_ESTUDIANTE}>
        <div className="ss-card ss-done" role="status">
          <span className="ss-done__icon"><Check size={30} strokeWidth={3} /></span>
          <h1 className="ss-done__title">Acta firmada</h1>
          <p className="ss-done__text">
            Quedó registrada el acta de {datos.carrera} con {llenas.length}{" "}
            {llenas.length === 1 ? "estudiante" : "estudiantes"}.
          </p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={nueva}>Hacer otra acta</button>
            <Link href="/" className="ss-btn ss-btn--primary">Volver al inicio</Link>
          </div>
        </div>
      </ShellDocente>
    );
  }

  return (
    <ShellDocente menu={MENU_ESTUDIANTE}>
      <h1 className="dd-title">Acta de compromiso</h1>
      <p className="dd-subtitle">Registra a los estudiantes del grupo y firma el compromiso de uso del laboratorio.</p>

      <div className="ss-card">
        <ol className="ss-steps ss-steps--3" aria-label="Progreso del acta">
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
            <legend className="ss-legend">Datos del grupo</legend>
            <Grupo id="carrera" label="Carrera">
              <select className="input" id="carrera" value={datos.carrera} onChange={setDato("carrera")}>
                {CARRERAS.map((c: string) => <option key={c}>{c}</option>)}
              </select>
            </Grupo>
            <div className="ss-row">
              <Grupo id="periodo" label="Período académico">
                <select className="input" id="periodo" value={datos.periodo} onChange={setDato("periodo")}>
                  {PERIODOS.map((p: string) => <option key={p}>{p}</option>)}
                </select>
              </Grupo>
              <Grupo id="fecha" label="Fecha del compromiso" error={errDatos.fecha}>
                <input
                  className="input" type="date" id="fecha" max={hoyISO()}
                  aria-invalid={errDatos.fecha ? true : undefined}
                  aria-describedby={errDatos.fecha ? "fecha-err" : undefined}
                  value={datos.fecha} onChange={setDato("fecha")}
                />
              </Grupo>
            </div>
          </fieldset>

          {/* Paso 2 */}
          <fieldset className="ss-fieldset" hidden={paso !== 1}>
            <legend className="ss-legend">Estudiantes del grupo</legend>
            <p className="ss-count">
              {llenas.length} de {MAX_EST} estudiantes. Las filas vacías no se guardan.
            </p>

            <div className="ss-stus">
              {filas.map((f, i) => (
                <div key={f.id}>
                  <div className="ss-stu">
                    <span className="ss-stu__n">{i + 1}</span>
                    <div className="ss-stu__fields">
                      <input
                        className="input" placeholder="Cédula" inputMode="numeric" maxLength={10}
                        aria-label={`Cédula del estudiante ${i + 1}`}
                        aria-invalid={errFilas[f.id] ? true : undefined}
                        value={f.cedula} onChange={(e) => setFila(f.id, "cedula", e.target.value)}
                      />
                      <input
                        className="input" placeholder="Nombre y apellidos"
                        aria-label={`Nombre del estudiante ${i + 1}`}
                        aria-invalid={errFilas[f.id] ? true : undefined}
                        value={f.nombre} onChange={(e) => setFila(f.id, "nombre", e.target.value)}
                      />
                    </div>
                    <button
                      type="button" className="ss-stu__x" aria-label={`Quitar estudiante ${i + 1}`}
                      onClick={() => quitar(f.id)} disabled={filas.length === 1}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {errFilas[f.id] && <p className="ss-error ss-stu__err" role="alert">{errFilas[f.id]}</p>}
                </div>
              ))}
            </div>

            {errGeneral && <p className="ss-error" role="alert">{errGeneral}</p>}

            <button
              type="button" className="ss-btn ss-btn--ghost ss-add"
              onClick={agregar} disabled={filas.length >= MAX_EST}
            >
              <Plus size={16} /> {filas.length >= MAX_EST ? `Máximo ${MAX_EST} estudiantes` : "Agregar estudiante"}
            </button>
          </fieldset>

          {/* Paso 3 */}
          <fieldset className="ss-fieldset" hidden={paso !== 2}>
            <legend className="ss-legend">Compromiso y firma</legend>

            <section className="ss-sum">
              <h3 className="ss-sum__title">Me comprometo a:</h3>
              <ul className="ss-rules">
                {COMPROMISOS.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </section>

            <label className="ss-check">
              <input
                type="checkbox" checked={acepto}
                onChange={(e) => { setAcepto(e.target.checked); setErrAcepto(""); }}
              />
              <span>Leí el compromiso y lo acepto en nombre del grupo.</span>
            </label>
            {errAcepto && <p className="ss-error" role="alert">{errAcepto}</p>}

            <section className="ss-sum" style={{ marginTop: 16 }}>
              <div className="ss-sum__head">
                <h3 className="ss-sum__title">Resumen del acta</h3>
                <button type="button" className="ss-link" onClick={() => ir(1)}>Editar estudiantes</button>
              </div>
              <dl className="ss-sum__list">
                <FilaResumen k="Carrera" v={datos.carrera} />
                <FilaResumen k="Período" v={datos.periodo} />
                <FilaResumen k="Fecha" v={formatoFecha(datos.fecha)} />
                <FilaResumen k="Estudiantes" v={String(llenas.length)} />
              </dl>
            </section>

            <Firma label="Firma de quien presenta el acta" />
          </fieldset>

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
                <button type="submit" className="ss-btn ss-btn--primary">
                  <Send size={16} /> Firmar acta
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </ShellDocente>
  );
}