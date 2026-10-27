"use client";

import Link from "next/link";
import { CalendarCheck, LogIn, Wrench, Package } from "lucide-react";
import ShellDocente from "@/components/docente/ShellDocente";
import BannerCarrusel from "@/components/docente/BannerCarrusel";
import MisReservas from "@/components/MisReservas";

const MENU = [
  { href: "/docente/solicitar", t: "Reservar laboratorio", i: CalendarCheck },
  { href: "/docente/ingreso-salida", t: "Registrar acceso", i: LogIn },
  { href: "/docente/falla", t: "Reportar incidencia", i: Wrench },
  { href: "/docente/stock", t: "Solicitar material", i: Package },
];

const BANNERS = [
  { src: "/fcvt.jpg", text: "Facultad de Ciencias de la Vida y Tecnología" },
  { src: "/fctv2.jpg", text: "Carrera de software" },
  { src: "/fcvt3.jpg", text: "Nuevas Oportunidades cada día" },
];

export default function DashboardDocente() {
  return (
    <ShellDocente>
      <h1 className="dd-title">¡Bienvenido!</h1>
      <p className="dd-subtitle">Gestión de laboratorios, solicitudes e inventario.</p>

      <BannerCarrusel banners={BANNERS} />

      {/* Solo móvil */}
      <section className="dd-services">
        <h2 className="dd-section-title">Panel de servicios</h2>
        <p className="dd-section-sub">¿Qué necesitas hacer?</p>
        <div className="dd-services__grid">
          {MENU.map(({ href, t, i: Icon }) => (
            <Link key={href} href={href} className="dd-service">
              <span className="dd-service__icon"><Icon size={20} /></span>{t}
            </Link>
          ))}
        </div>
      </section>

      <section className="dd-reservas">
        <div className="dd-reservas__head">
          <h2 className="dd-section-title">Mis reservas</h2>
          <Link href="/docente/reservas" className="dd-link">Ver todas ›</Link>
        </div>
        <MisReservas />
      </section>
    </ShellDocente>
  );
}