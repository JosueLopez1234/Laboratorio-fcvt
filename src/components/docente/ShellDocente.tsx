"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell, User, House, Plus, ClipboardCheck, CalendarCheck, LogIn, Wrench, Package, Menu,
  ClipboardList, Cog, Boxes,
  type LucideIcon,
  CalendarDays,
} from "lucide-react";
import BotonCampana from "@/components/Botoncampana";
import BotonPerfil from "../BotonPerfil";
export type ItemMenu = { href: string; t: string; i: LucideIcon };

const MENU: ItemMenu[] = [
  { href: "/docente/solicitar",      t: "Reservar laboratorio", i: CalendarCheck },
  { href: "/docente/ingreso-salida", t: "Registrar acceso",     i: LogIn },
  { href: "/docente/falla",          t: "Reportar incidencia",  i: Wrench },
  { href: "/docente/stock",          t: "Solicitar material",   i: Package },
];

/* Mismo marco del dashboard (sidebar en escritorio, header + bottom nav en móvil).
   Las páginas del docente solo ponen su contenido como children. */
/* Menú del estudiante */
export const MENU_ESTUDIANTE: ItemMenu[] = [
  { href: "/estudiante/acta",  t: "Acta de compromiso", i: ClipboardCheck },
  { href: "/estudiante/falla", t: "Reportar falla",     i: Wrench },
];

/* Menú del técnico (el "Panel" es el propio Dashboard, por eso no se repite) */
export const MENU_TECNICO: ItemMenu[] = [
  { href: "/tecnico/solicitudes", t: "Solicitudes", i: ClipboardList },
  { href: "/tecnico/mantenimiento", t: "Mantenimiento", i: Cog },
  { href: "/tecnico/inventario", t: "Inventario", i: Boxes },
  { href: "/tecnico/horarios", t: "Horarios", i: CalendarDays },
];

/* Sin `menu` usa el del docente. Para otro rol, pásale su propio menú.
   En móvil, con menú propio, la barra de abajo muestra Inicio + los 2 primeros ítems. */
export default function ShellDocente({
  children, menu = MENU,
}: { children: React.ReactNode; menu?: ItemMenu[] }) {
  const [colapsado, setColapsado] = useState(false);
  const pathname = usePathname();
  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className={`dd-app ${colapsado ? "is-collapsed" : ""}`}>
      {/* Móvil */}
      <header className="dd-header">
        <Image className="dd-header__logo" src="/faviconnn.png" alt="FCVT" width={1080} height={1080} />
        <div className="dd-header__actions">
          <button className="dd-icon-btn" aria-label="Notificaciones"><Bell /></button>
          <button className="dd-icon-btn" aria-label="Perfil"><User /></button>
        </div>
      </header>

      {/* Escritorio */}
      <aside className="dd-sidebar" aria-label="Navegación principal">
        <Image className="dd-sidebar__logo" src="/faviconnn.png" alt="FCVT" width={1080} height={1080} />
        <Image className="dd-sidebar__logo-mini" src="/faviconnn.png" alt="FCVT" width={1080} height={1080} />
        <button
          className="dd-icon-btn dd-sidebar__toggle"
          aria-label={colapsado ? "Expandir menú" : "Contraer menú"}
          aria-expanded={!colapsado}
          onClick={() => setColapsado((c) => !c)}
        >
          <Menu />
        </button>
        <p className="dd-sidebar__hint">¿Qué necesitas hacer?</p>
        <nav className="dd-nav">
          {[{ href: "/", t: "Dashboard", i: House }, ...menu].map(({ href, t, i: Icon }) => (
            <Link
              key={href}
              href={href}
              title={t}
              aria-label={t}
              aria-current={esActivo(href) ? "page" : undefined}
            >
              <Icon />
              <span className="dd-nav__label">{t}</span>
            </Link>
          ))}
        </nav>
        <Image className="dd-sidebar__footer" src="/uleam_white.png" alt="ULEAM" width={1834} height={1577} />
        <Image className="dd-sidebar__footer-mini" src="/uleam_white.png" alt="ULEAM" width={1834} height={1577} />
      </aside>

      <div className="dd-topbar">
        <BotonCampana />
        <BotonPerfil />
      </div>

      <main className="dd-main">{children}</main>

      {/* Móvil */}
      <nav className="dd-bottom-nav" aria-label="Navegación principal">
        {menu === MENU ? (
          <>
            <Link href="/docente" aria-current={pathname === "/" || pathname === "/docente" ? "page" : undefined} aria-label="Inicio"><House /></Link>
            <Link href="/docente/solicitar" aria-current={esActivo("/docente/solicitar") ? "page" : undefined} aria-label="Nueva reserva"><Plus /></Link>
            <Link href="/docente/reservas" aria-current={esActivo("/docente/reservas") ? "page" : undefined} aria-label="Mis reservas"><ClipboardCheck /></Link>
          </>
        ) : (
          [{ href: "/", t: "Inicio", i: House }, ...menu.slice(0, 2)].map(({ href, t, i: Icon }) => (
            <Link key={href} href={href} aria-label={t} aria-current={esActivo(href) ? "page" : undefined}>
              <Icon />
            </Link>
          ))
        )}
      </nav>
    </div>
  );
}