"use client";
import { useState } from "react";
import { Pantalla, Etiqueta } from "@/components/ui";

type Sol = { docente: string; lab: string; horario: string; est: number; estado: string };

export default function Solicitudes() {
  const [sol, setSol] = useState<Sol[]>([
    { docente: "Ana Mora", lab: "201", horario: "Lun 06/10 · 08:00–10:00", est: 28, estado: "Pendiente" },
    { docente: "Luis Vera", lab: "103", horario: "Mar 07/10 · 10:00–12:00", est: 35, estado: "Pendiente" },
    { docente: "Rosa Pinto", lab: "204", horario: "Mié 08/10 · 14:00–16:00", est: 22, estado: "Aprobada" },
  ]);

  const resolver = (i: number, estado: string) =>
    setSol((s) => s.map((x, k) => (k === i ? { ...x, estado } : x)));

  return (
    <Pantalla titulo="Solicitudes">
      <div className="flex flex-col gap-3 p-4">
        {sol.map((s, i) => (
          <article key={i} className="tarjeta flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <b>{s.docente}</b>
              <Etiqueta estado={s.estado} />
            </div>
            <p className="text-sm text-[var(--mut)]">
              Lab {s.lab} · {s.horario} · {s.est} estudiantes
            </p>
            {s.estado === "Pendiente" && (
              <div className="flex gap-2">
                <button className="btn !py-2" onClick={() => resolver(i, "Aprobada")}>Aprobar</button>
                <button
                  className="w-full rounded-full border border-gray-300 py-2 font-bold"
                  onClick={() => resolver(i, "Rechazada")}
                >
                  Rechazar
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </Pantalla>
  );
}
