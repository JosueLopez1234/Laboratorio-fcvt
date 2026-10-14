"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell, User, House, Plus, ClipboardCheck, CalendarCheck, LogIn, Wrench, Package,
  Monitor, Eye, Download, TriangleAlert, Clock, Check, Play, Menu, X, CalendarX,
} from "lucide-react";

type Estado = "pendiente" | "aprobado" | "en-curso" | "finalizado";
type Paso = "done" | "current" | "todo";

type Reserva = {
  id: number;
  lab: string;
  lugar: string;
  fecha: string;
  hora: string;
  estudiantes: number;
  solicitante: string;
  estado: Estado;
};

/* ---------- BASE DE DATOS FALSA (solo para ver los estados) ----------
   Pon USAR_MOCK en false para ver el mensaje "Aún no hay reservas".
   Cuando tengas la API real, reemplaza RESERVAS por tu fetch. */
const USAR_MOCK = true;

const MOCK: Reserva[] = [
  { id: 1, lab: "Laboratorio 203", lugar: "Facultad de Ciencias de la Vida y Tecnología", fecha: "14 Oct 2026", hora: "10:00 - 12:00", estudiantes: 25, solicitante: "Juan Pérez", estado: "pendiente" },
  { id: 2, lab: "Laboratorio 105", lugar: "Facultad de Ciencias de la Vida y Tecnología", fecha: "15 Oct 2026", hora: "08:00 - 10:00", estudiantes: 20, solicitante: "Juan Pérez", estado: "aprobado" },
  { id: 3, lab: "Laboratorio 203", lugar: "Facultad de Ciencias de la Vida y Tecnología", fecha: "13 Oct 2026", hora: "10:00 - 12:00", estudiantes: 25, solicitante: "Juan Pérez", estado: "en-curso" },
  { id: 4, lab: "Laboratorio 301", lugar: "Facultad de Ciencias de la Vida y Tecnología", fecha: "09 Oct 2026", hora: "14:00 - 16:00", estudiantes: 18, solicitante: "Juan Pérez", estado: "finalizado" },
];

const RESERVAS: Reserva[] = USAR_MOCK ? MOCK : [];

const PASOS: Record<Estado, Paso[]> = {
  pendiente:  ["done", "done", "current", "todo"],
  aprobado:   ["done", "done", "done", "todo"],
  "en-curso": ["done", "done", "done", "current"],
  finalizado: ["done", "done", "done", "done"],
};

const BADGE: Record<Estado, { t: string; i: React.ReactNode }> = {
  pendiente:  { t: "Pendiente",  i: <Clock size={12} /> },
  aprobado:   { t: "Aprobado",   i: <Check size={12} /> },
  "en-curso": { t: "En curso",   i: <Play size={12} /> },
  finalizado: { t: "Finalizado", i: <Check size={12} /> },
};

type Filtro = "todas" | Estado;
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "en-curso", t: "En curso" },
  { id: "finalizado", t: "Finalizadas" },
];

const MENU = [
  { href: "/docente/solicitar",      t: "Reservar laboratorio", i: CalendarCheck },
  { href: "/docente/ingreso-salida", t: "Registrar acceso",     i: LogIn },
  { href: "/docente/falla",          t: "Reportar incidencia",  i: Wrench },
  { href: "/docente/stock",          t: "Solicitar material",   i: Package },
];

const BANNERS = [
  { src: "/fcvt.jpg", text: "Facultad de Ciencias de la Vida y Tecnología" },
  { src: "/fctv2.jpg", text: "Carrera de software" },
  { src: "/fcvt3.jpg", text: "Nuevas Oportunidades cada día" },
  
];

function Accion({ estado }: { estado: Estado }) {
  if (estado === "pendiente")
    return <button className="dd-btn dd-btn--danger"><X /> Cancelar reserva</button>;
  if (estado === "en-curso")
    return <button className="dd-btn dd-btn--primary"><TriangleAlert /> Reportar inconveniente</button>;
  return <button className="dd-btn dd-btn--primary"><Download /> Descargar comprobante</button>;
}

export function TarjetaReserva({ reserva }: { reserva: Reserva }) {
  const { estado } = reserva;
  const pasos = PASOS[estado];
  const etiquetas = ["Solicitud", "Revisión", "Aprobación", "Uso"];
  const meta = [
    reserva.fecha,
    reserva.hora,
    `${reserva.estudiantes} estudiantes`,
    `Solicitante\n${reserva.solicitante}`,
  ];

  return (
    <article className="dd-card" data-estado={estado}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Monitor size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name">{reserva.lab}</h3>
          <p className="dd-card__place">{reserva.lugar}</p>
        </div>
        <span className="dd-badge">{BADGE[estado].i}{BADGE[estado].t}</span>
      </div>

      <div className="dd-steps">
        {etiquetas.map((e, k) => (
          <div key={e} className={`dd-step is-${pasos[k]}`}>
            <span className="dd-step__meta" style={{ whiteSpace: "pre-line" }}>{meta[k]}</span>
            <span className="dd-step__dot">{pasos[k] === "done" && <Check />}</span>
            <span className="dd-step__label">{e}</span>
          </div>
        ))}
      </div>

      <div className="dd-card__actions">
        <button className="dd-btn dd-btn--ghost"><Eye /> Ver detalles</button>
        <Accion estado={estado} />
      </div>
    </article>
  );
}

function SinReservas({ filtrado }: { filtrado: boolean }) {
  return (
    <div className="dd-empty" role="status">
      <span className="dd-empty__icon"><CalendarX size={28} /></span>
      <p className="dd-empty__title">Aún no hay reservas</p>
      <p className="dd-empty__text">
        {filtrado
          ? "No tienes reservas con este estado."
          : "Cuando reserves un laboratorio, aparecerá aquí."}
      </p>
    </div>
  );
}

export default function DashboardDocente() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [colapsado, setColapsado] = useState(false); // sidebar: false = completo, true = solo íconos
  const [bannerActual, setBannerActual] = useState(0);
  const pathname = usePathname();
  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    if (BANNERS.length < 2) return;

    const timer = window.setInterval(() => {
      setBannerActual((actual) => (actual + 1) % BANNERS.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const contar = (f: Filtro) =>
    f === "todas" ? RESERVAS.length : RESERVAS.filter((r) => r.estado === f).length;
  const visibles = filtro === "todas" ? RESERVAS : RESERVAS.filter((r) => r.estado === filtro);

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
          {[{ href: "/", t: "Dashboard", i: House }, ...MENU].map(({ href, t, i: Icon }) => (
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
        <button className="dd-icon-btn" aria-label="Notificaciones"><Bell /></button>
        <button className="dd-icon-btn" aria-label="Perfil"><User /></button>
      </div>

      <main className="dd-main">
        <h1 className="dd-title">¡Bienvenido!</h1>
        <p className="dd-subtitle">Gestión de laboratorios, solicitudes e inventario.</p>

        <div className="dd-banner" aria-label="Carrusel de imágenes">
          {BANNERS.map((banner, index) => (
            <div
              key={banner.src}
              className={`dd-banner__slide ${index === bannerActual ? "is-active" : ""}`}
              style={{ backgroundImage: `url(${banner.src})` }}
              aria-hidden={index !== bannerActual}
            >
              <p className="dd-banner__text">{banner.text}</p>
            </div>
          ))}
        </div>
        <div className="dd-dots" aria-label="Seleccionar imagen del carrusel">
          {BANNERS.map((banner, index) => (
            <button
              key={banner.src}
              type="button"
              className={`dd-dot ${index === bannerActual ? "is-active" : ""}`}
              aria-label={`Mostrar imagen ${index + 1}: ${banner.text}`}
              aria-pressed={index === bannerActual}
              onClick={() => setBannerActual(index)}
            />
          ))}
        </div>

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

          <div className="dd-chips" role="tablist" aria-label="Filtrar reservas">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filtro === f.id}
                className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.t} ({contar(f.id)})
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <SinReservas filtrado={RESERVAS.length > 0} />
          ) : (
            <div className="dd-list">
              {visibles.map((r) => <TarjetaReserva key={r.id} reserva={r} />)}
            </div>
          )}
        </section>
      </main>

      {/* Móvil */}
      <nav className="dd-bottom-nav" aria-label="Navegación principal">
        <Link href="/docente" aria-current="page" aria-label="Inicio"><House /></Link>
        <Link href="/docente/solicitar" aria-label="Nueva reserva"><Plus /></Link>
        <Link href="/docente/reservas" aria-label="Mis reservas"><ClipboardCheck /></Link>
      </nav>
    </div>
  );
}
