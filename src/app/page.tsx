"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarCheck, LogIn, Wrench, Package, FileSignature,
  ClipboardList, Cog, Boxes, LayoutDashboard,
} from "lucide-react";
import Encabezado from "@/components/Encabezado";

import DashboardDocente from "@/components/DashboardDocente";



const MENU = {
  Docente: [
    { href: "/docente/solicitar", t: "Reservar Laboratorio", i: CalendarCheck },
    { href: "/docente/ingreso-salida", t: "Registrar acceso", i: LogIn },
    { href: "/docente/falla", t: "Reportar incidencia", i: Wrench },
    { href: "/docente/stock", t: "Solicitar material", i: Package },
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
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/app_logo.png"
            alt="Logo de la aplicación"
            width={200}
            height={200}
            priority
          />
        </div>
      </main>
    );
  }

   const selectorRol = (
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
  );

  if (rol === "Docente") {
    return (
      <>
        {/* barra temporal para cambiar de rol mientras desarrollas */}
        <div className="home-role-switch bg-[var(--uleam)]">{selectorRol}</div>
        <DashboardDocente />
      </>
    );
  }

  return (
    <main className="min-h-screen">
      <Encabezado>{selectorRol}</Encabezado>
      <section className="grid grid-cols-2 gap-4 p-4">
        {MENU[rol].map(({ href, t, i: Icono }) => (
          <Link
            key={href + t}
            href={href}
            className="tarjeta flex flex-col items-center gap-3 px-3 py-6 text-center"
          >
            <Icono size={36} style={{ color: "var(--uleam)" }} />
            <span className="text-sm font-medium">{t}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}