import { Pantalla } from "@/components/ui";
import { LABS } from "@/lib/datos";

const HORAS = [8, 9, 10, 11, 12, 13, 14, 15];

export default function Panel() {
  return (
    <Pantalla titulo="Panel del técnico">
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          ["2", "Solicitudes por aprobar"],
          ["2", "Fallas sin resolver"],
          ["2", "Stock bajo"],
        ].map(([n, t]) => (
          <div key={t} className="tarjeta p-3 text-center">
            <b className="block text-3xl text-[var(--uleam)]">{n}</b>
            <span className="text-xs text-[var(--mut)]">{t}</span>
          </div>
        ))}
      </div>

      <section className="tarjeta mx-4 mb-4 overflow-x-auto p-4">
        <b className="text-sm">Ocupación de hoy</b>
        <div className="mt-3 grid min-w-[480px] grid-cols-[54px_repeat(8,1fr)] gap-1 text-center text-xs">
          <div />
          {HORAS.map((h) => <div key={h} className="text-[var(--mut)]">{h}:00</div>)}
          {LABS.map((l, i) => (
            <div key={l} className="contents">
              <div className="py-2 text-[var(--mut)]">Lab {l}</div>
              {HORAS.map((h, j) => (
                <div
                  key={h}
                  className={`rounded py-2 ${(i * 3 + j * 2) % 5 < 2 ? "bg-[var(--uleam)]" : "bg-white"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
    </Pantalla>
  );
}
