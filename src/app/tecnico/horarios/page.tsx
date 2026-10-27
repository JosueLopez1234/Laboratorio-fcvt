"use client";

import { Fragment, useEffect, useState } from "react";
import { CalendarX } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import { LABS } from "@/lib/datos";
import { DIAS, HORA_INICIO, cargarHorarios, type Bloque } from "@/lib/horarios";
import { cargarReservasHoy, type OcupacionHoy } from "@/lib/reservas";

const ALTO_FILA = 64;
const RECESO = 12; // la fila 12:00-13:00 no tiene clases en los horarios impresos

const TONOS = [
  { bg: "#e3e7ff", bd: "#2d3ae0" },
  { bg: "#dcf5e4", bd: "#2fb15d" },
  { bg: "#fff0c7", bd: "#e0a21a" },
  { bg: "#ece6fb", bd: "#7c5ce0" },
  { bg: "#ffe9ea", bd: "#e0525c" },
  { bg: "#d9f3f3", bd: "#1aa3a3" },
];
const tono = (materia: string) =>
  TONOS[[...materia].reduce((s, c) => s + c.charCodeAt(0), 0) % TONOS.length];

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default function Horarios() {
  const [lab, setLab] = useState(LABS[0]);
  const [diaMovil, setDiaMovil] = useState(0);
  const [hoy, setHoy] = useState(-1); // 0 = lunes ... 4 = viernes
  const [datos, setDatos] = useState<Record<string, Bloque[][]>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState<Date | null>(null);
  const [reservasHoy, setReservasHoy] = useState<OcupacionHoy[]>([]);

  useEffect(() => {
    const d = new Date().getDay(); // 0 = domingo
    if (d >= 1 && d <= 5) {
      setHoy(d - 1);
      setDiaMovil(d - 1);
    }
  }, []);

  useEffect(() => {
    cargarHorarios()
      .then(setDatos)
      .catch(() => setError("No se pudieron cargar los horarios."))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    setAhora(new Date());
    const t = window.setInterval(() => setAhora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    cargarReservasHoy().then(setReservasHoy).catch(() => {});
  }, []);

  const semana: Bloque[][] = datos[lab] ?? [[], [], [], [], []];
  const horaFin = Math.max(17, ...semana.flat().map((b) => b[1]));
  const horas = Array.from({ length: horaFin - HORA_INICIO }, (_, i) => HORA_INICIO + i);
  const clases = semana.reduce((n, d) => n + d.length, 0);
  const horasOcupadas = semana.flat().reduce((n, b) => n + (b[1] - b[0]), 0);

  const diaHoy = ahora ? ahora.getDay() - 1 : -1; // 0 = lunes ... 4 = viernes
  const horaDec = ahora ? ahora.getHours() + ahora.getMinutes() / 60 : -1;

  const esActual = (d: number, ini: number, fin: number) =>
    d === diaHoy && horaDec >= ini && horaDec < fin;

  // Ocupación de un laboratorio ahora mismo (clase fija o reserva aprobada)
  const ocupacionAhora = (l: string) => {
    if (!ahora) return null;
    const clase =
      diaHoy >= 0 && diaHoy <= 4
        ? (datos[l] ?? [[], [], [], [], []])[diaHoy].find(([i, f]) => horaDec >= i && horaDec < f)
        : undefined;
    if (clase) return `Clase de ${clase[2]} (${hh(clase[0])} - ${hh(clase[1])})`;
    const r = reservasHoy.find((x) => x.lab === l && horaDec >= x.ini && horaDec < x.fin);
    if (r) return `Reserva de ${r.docente}: ${r.asignatura}`;
    return null;
  };

  const ocupadoLab = ocupacionAhora(lab);

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Horarios</h1>
      <p className="dd-subtitle">Clases fijas de cada laboratorio, de lunes a viernes.</p>

      <section className="dd-reservas">
        <div className="dd-chips" role="tablist" aria-label="Elegir laboratorio">
          {LABS.map((l) => (
            <button
              key={l} role="tab" aria-selected={lab === l}
              className={`dd-chip ${lab === l ? "is-active" : ""}`}
              onClick={() => setLab(l)}
            >
              Laboratorio {l}
              {ocupacionAhora(l) && (
                <span
                  className="ml-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ background: "var(--dd-danger)" }}
                  aria-label="Ocupado ahora"
                />
              )}
            </button>
          ))}
        </div>
        <p className="dd-section-sub" style={{ marginTop: 10 }}>
          {clases} clases por semana, {horasOcupadas} horas ocupadas.
        </p>

        {ahora && (
          <div
            role="status"
            className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold"
            style={
              ocupadoLab
                ? { background: "var(--dd-danger-soft)", color: "var(--dd-danger)" }
                : { background: "var(--dd-ok-bg)", color: "var(--dd-ok-fg)" }
            }
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: ocupadoLab ? "var(--dd-danger)" : "var(--dd-ok)" }}
            />
            {ocupadoLab ? `Ocupado ahora: ${ocupadoLab}` : "Libre en este momento"}
          </div>
        )}

        {error && <p className="ss-error" role="alert">{error}</p>}
        {cargando && <p className="dd-section-sub" style={{ marginTop: 10 }}>Cargando horarios…</p>}

        {/* ---------- Escritorio y tablet: cuadrícula semanal ---------- */}
        <div className="mt-3 hidden overflow-x-auto md:block">
          <div
            className="grid min-w-[880px] overflow-hidden"
            style={{
              gridTemplateColumns: "104px repeat(5, minmax(0, 1fr))",
              gridTemplateRows: `44px repeat(${horas.length}, ${ALTO_FILA}px)`,
              background: "var(--dd-surface)",
              borderRadius: "var(--dd-radius-card)",
              boxShadow: "var(--dd-shadow)",
            }}
            role="table"
            aria-label={`Horario semanal del Laboratorio ${lab}`}
          >
            <div
              className="flex items-center px-3 text-xs font-bold"
              style={{ gridColumn: 1, gridRow: 1, color: "var(--dd-navy)", background: "#e8eaf3" }}
            >
              Franja horaria
            </div>
            {DIAS.map((d, i) => (
              <div
                key={d}
                className="flex items-center justify-center text-sm font-bold"
                style={{
                  gridColumn: i + 2, gridRow: 1,
                  background: i === hoy ? "var(--dd-blue)" : "#e8eaf3",
                  color: i === hoy ? "#fff" : "var(--dd-navy)",
                }}
              >
                {d}
              </div>
            ))}

            {horas.map((h, r) => (
              <Fragment key={h}>
                <div
                  className="flex items-start px-3 pt-2 text-xs font-semibold"
                  style={{
                    gridColumn: 1, gridRow: r + 2, color: "var(--dd-mut)",
                    borderTop: "1px solid var(--dd-neutral)",
                  }}
                >
                  {hh(h)}-{hh(h + 1).slice(0, 5)}
                </div>
                {DIAS.map((d, i) => (
                  <div
                    key={d}
                    style={{
                      gridColumn: i + 2, gridRow: r + 2,
                      borderTop: "1px solid var(--dd-neutral)",
                      borderLeft: "1px solid var(--dd-neutral)",
                      background: h === RECESO ? "var(--dd-bg)" : undefined,
                    }}
                  />
                ))}
              </Fragment>
            ))}

            {semana.flatMap((bloques, d) =>
              bloques.map(([ini, fin, materia, docente]) => {
                const t = tono(materia);
                const activo = esActual(d, ini, fin);
                return (
                  <article
                    key={`${d}-${ini}`}
                    role="row"
                    className="z-[1] m-1 overflow-hidden rounded-xl px-3 py-2"
                    style={{
                      gridColumn: d + 2,
                      gridRow: `${ini - HORA_INICIO + 2} / span ${fin - ini}`,
                      background: t.bg,
                      borderLeft: `4px solid ${t.bd}`,
                      color: "var(--dd-navy)",
                      boxShadow: activo ? "0 0 0 2px var(--dd-danger)" : undefined,
                    }}
                  >
                    {activo && (
                      <span className="mb-1 inline-block rounded-full bg-[var(--dd-danger)] px-2 py-0.5 text-[9px] font-bold text-white">
                        EN CURSO
                      </span>
                    )}
                    <h3 className="text-[13px] font-bold leading-tight">{materia}</h3>
                    <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--dd-text)" }}>{docente}</p>
                    <p className="mt-1 text-[10px] font-semibold" style={{ color: "var(--dd-mut)" }}>
                      {hh(ini)} - {hh(fin)}
                    </p>
                  </article>
                );
              }),
            )}
          </div>
        </div>

        {/* ---------- Móvil: un día a la vez ---------- */}
        <div className="md:hidden">
          <div className="dd-chips" role="tablist" aria-label="Elegir día">
            {DIAS.map((d, i) => (
              <button
                key={d} role="tab" aria-selected={diaMovil === i}
                className={`dd-chip ${diaMovil === i ? "is-active" : ""}`}
                onClick={() => setDiaMovil(i)}
              >
                {d}{i === hoy ? " (hoy)" : ""}
              </button>
            ))}
          </div>

          {semana[diaMovil].length === 0 ? (
            <div className="dd-empty" role="status">
              <span className="dd-empty__icon"><CalendarX size={28} /></span>
              <p className="dd-empty__title">Sin clases este día</p>
              <p className="dd-empty__text">El laboratorio está libre todo el día.</p>
            </div>
          ) : (
            <ul className="dd-list">
              {semana[diaMovil].map(([ini, fin, materia, docente]) => {
                const t = tono(materia);
                const activo = esActual(diaMovil, ini, fin);
                return (
                  <li
                    key={ini}
                    className="rounded-2xl px-4 py-3"
                    style={{
                      background: t.bg,
                      borderLeft: `5px solid ${t.bd}`,
                      color: "var(--dd-navy)",
                      boxShadow: activo ? "0 0 0 2px var(--dd-danger)" : undefined,
                    }}
                  >
                    {activo && (
                      <span className="mb-1 inline-block rounded-full bg-[var(--dd-danger)] px-2 py-0.5 text-[9px] font-bold text-white">
                        EN CURSO
                      </span>
                    )}
                    <p className="text-[11px] font-bold" style={{ color: "var(--dd-mut)" }}>
                      {hh(ini)} - {hh(fin)}
                    </p>
                    <h3 className="mt-0.5 text-sm font-bold leading-tight">{materia}</h3>
                    <p className="mt-1 text-xs" style={{ color: "var(--dd-text)" }}>{docente}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </ShellDocente>
  );
}