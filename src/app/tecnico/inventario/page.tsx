import { Pantalla, Etiqueta } from "@/components/ui";

const ITEMS = [
  { p: "Cable HDMI", serie: "HD-2231", modelo: "Ugreen 2m", ent: 20, sal: 14 },
  { p: "Mouse", serie: "MS-0912", modelo: "Logitech B100", ent: 30, sal: 12 },
  { p: "Cable Ethernet", serie: "ET-5510", modelo: "Cat6 3m", ent: 25, sal: 23 },
  { p: "Teclado", serie: "KB-7781", modelo: "Genius KB-110", ent: 15, sal: 5 },
];

export default function Inventario() {
  return (
    <Pantalla titulo="Inventario">
      <div className="flex flex-col gap-3 p-4">
        {ITEMS.map((x) => {
          const total = x.ent - x.sal;
          return (
            <article key={x.serie} className="tarjeta flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <b>{x.p}</b>
                <Etiqueta estado={total < 10 ? "Stock bajo" : "Suficiente"} />
              </div>
              <p className="text-xs text-[var(--mut)]">{x.serie} · {x.modelo}</p>
              <div className="grid grid-cols-3 text-center text-sm">
                <span>Entrada<b className="block">{x.ent}</b></span>
                <span>Salida<b className="block">{x.sal}</b></span>
                <span>Total<b className="block text-[var(--uleam)]">{total}</b></span>
              </div>
            </article>
          );
        })}
      </div>
    </Pantalla>
  );
}
