"use client";
import { useState } from "react";
import Link from "next/link";
import {
  CalendarCheck, LogIn, Wrench, Package, FileSignature,
  ClipboardList, Cog, Boxes, LayoutDashboard,
} from "lucide-react";
import Encabezado from "@/components/Encabezado"; // ajusta la ruta a donde lo tengas

const MENU = {
  Docente: [
    { href: "/docente/solicitar", t: "Solicitar laboratorio", i: CalendarCheck },
    { href: "/docente/ingreso-salida", t: "Ingreso y salida", i: LogIn },
    { href: "/docente/falla", t: "Reportar falla", i: Wrench },
    { href: "/docente/stock", t: "Solicitar stock", i: Package },
  ],
  Estudiante: [
    { href: "/estudiante/acta", t: "Acta de compromiso", i: FileSignature },
    { href: "/estudiante/falla", t: "Reportar falla", i: Wrench },
  ],
  Técnico: [
    { href: "/tecnico/panel", t: "Panel", i: LayoutDashboard },
    { href: "/tecnico/solicitudes", t: "Solicitudes", i: ClipboardList },
    { href: "/tecnico/mantenimiento", t: "Mantenimiento", i: Cog },
    { href: "/tecnico/inventario", t: "Inventario", i: Boxes },
  ],
} as const;

type Rol = keyof typeof MENU;

export default function Home() {
  const [rol, setRol] = useState<Rol>("Docente");

  return (
    <main className="min-h-screen">
      <Encabezado>
        <div className="flex gap-1 rounded-full bg-black/20 p-1">
        {(Object.keys(MENU) as Rol[]).map((r) => (
      <button
        key={r}
        onClick={() => setRol(r)}
        className={`flex-1 rounded-full py-1.5 text-sm ${
          r === rol ? "bg-white font-bold text-[var(--uleam)]" : "text-white"
          }`}
        >
          {r}
        </button>
      ))}
      </div>
      </Encabezado>
      <section className="grid grid-cols-2 gap-4 p-4">
        {MENU[rol].map(({ href, t, i: Icono }) => (
          <Link
            key={href + t}
            href={href}
            className="tarjeta flex flex-col items-center gap-3 px-3 py-6 text-center"
          >
            <Icono size={36} color="var(--uleam)" />
            <span className="text-sm font-medium">{t}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}