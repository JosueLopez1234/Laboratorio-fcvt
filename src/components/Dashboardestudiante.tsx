"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  ClipboardCheck,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  Monitor,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import ShellDocente, {
  MENU_ESTUDIANTE,
} from "@/components/docente/ShellDocente";

import BannerCarrusel from "@/components/docente/BannerCarrusel";
import { usePerfil } from "@/lib/perfil";

import {
  cargarMisReservas,
  mensajeError,
  type ReservaUI,
  type EstadoUI,
} from "@/lib/reservas";

const BANNERS = [
  {
    src: "/fcvt.jpg",
    text: "Facultad de Ciencias de la Vida y Tecnología",
  },
  {
    src: "/fctv2.jpg",
    text: "Carrera de software",
  },
  {
    src: "/fcvt3.jpg",
    text: "Nuevas oportunidades cada día",
  },
];

const ESTADOS: Record<EstadoUI, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobada",
  "en-curso": "En curso",
  finalizado: "Finalizada",
  rechazado: "Rechazada",
  cancelado: "Cancelada",
};

export default function DashboardEstudiante() {
  const perfil = usePerfil();

  const [reservas, setReservas] = useState<ReservaUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const cargar = async () => {
    setError("");

    try {
      const resultado = await cargarMisReservas();
      setReservas(resultado);
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, []);

  const actualizar = async () => {
    setActualizando(true);
    await cargar();
    setActualizando(false);
  };

  const pendientes = reservas.filter(
    (r) => r.estado === "pendiente"
  ).length;

  const aprobadas = reservas.filter(
    (r) =>
      r.estado === "aprobado" ||
      r.estado === "en-curso" ||
      r.estado === "finalizado"
  ).length;

  const rechazadas = reservas.filter(
    (r) => r.estado === "rechazado"
  ).length;

  const recientes = reservas.slice(0, 4);

  const accesos = [
    {
      href: "/estudiante/solicitar",
      titulo: "Solicitar laboratorio",
      descripcion: "Reserva un espacio para tus prácticas.",
      icono: CalendarCheck,
    },
    {
      href: "/estudiante/reservas",
      titulo: "Mis reservas",
      descripcion: "Consulta y administra tus solicitudes.",
      icono: ClipboardList,
    },
    {
      href: "/estudiante/acta",
      titulo: "Acta de compromiso",
      descripcion: "Registra el compromiso de uso del laboratorio.",
      icono: ClipboardCheck,
    },
    {
      href: "/estudiante/falla",
      titulo: "Reportar falla",
      descripcion: "Informa problemas con los equipos.",
      icono: Wrench,
    },
  ];

  return (
    <ShellDocente menu={MENU_ESTUDIANTE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="dd-title">
            ¡Bienvenido{perfil?.nombre ? `, ${perfil.nombre}` : ""}!
          </h1>

          <p className="dd-subtitle">
            Gestiona tus prácticas, laboratorios y actividades académicas.
          </p>
        </div>

        <button
          type="button"
          className="dd-btn dd-btn--ghost"
          onClick={actualizar}
          disabled={actualizando || cargando}
        >
          <RefreshCw
            className={actualizando ? "animate-spin" : ""}
          />
          Actualizar
        </button>
      </div>

      <BannerCarrusel banners={BANNERS} />

      <section className="ss-card mt-4" style={{ maxWidth: "none" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="dd-section-title">
              ¿Necesitas un laboratorio?
            </h2>

            <p className="dd-section-sub">
              Solicita un espacio para tus clases y prácticas académicas.
            </p>
          </div>

          <Link
            href="/estudiante/solicitar"
            className="ss-btn ss-btn--primary"
          >
            <CalendarCheck size={17} />
            Nueva solicitud
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <div className="dd-reservas__head">
          <div>
            <h2 className="dd-section-title">
              Resumen de mis reservas
            </h2>

            <p className="dd-section-sub">
              Estado actual de tus solicitudes.
            </p>
          </div>
        </div>

        {error && (
          <p className="ss-error" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="tarjeta flex items-center gap-3 p-4">
            <span className="dd-card__avatar">
              <ClipboardList size={21} />
            </span>
            <div>
              <p className="text-sm" style={{ color: "var(--dd-mut)" }}>
                Total de solicitudes
              </p>
              <p className="text-2xl font-bold">
                {cargando ? "—" : reservas.length}
              </p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <span className="dd-card__avatar">
              <Clock size={21} />
            </span>
            <div>
              <p className="text-sm" style={{ color: "var(--dd-mut)" }}>
                Pendientes
              </p>
              <p className="text-2xl font-bold">
                {cargando ? "—" : pendientes}
              </p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <span className="dd-card__avatar">
              <CheckCircle size={21} />
            </span>
            <div>
              <p className="text-sm" style={{ color: "var(--dd-mut)" }}>
                Aprobadas / realizadas
              </p>
              <p className="text-2xl font-bold">
                {cargando ? "—" : aprobadas}
              </p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <span className="dd-card__avatar">
              <XCircle size={21} />
            </span>
            <div>
              <p className="text-sm" style={{ color: "var(--dd-mut)" }}>
                Rechazadas
              </p>
              <p className="text-2xl font-bold">
                {cargando ? "—" : rechazadas}
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="dd-services">
        <h2 className="dd-section-title">
          Servicios para estudiantes
        </h2>

        <p className="dd-section-sub">
          Selecciona el servicio que necesitas.
        </p>

        <div className="dd-services__grid">
          {accesos.map((acceso) => {
            const Icon = acceso.icono;

            return (
              <Link
                key={acceso.href}
                href={acceso.href}
                className="dd-service"
              >
                <span className="dd-service__icon">
                  <Icon size={21} />
                </span>

                <span className="flex-1">
                  <span className="block font-semibold">
                    {acceso.titulo}
                  </span>

                  <span
                    className="mt-1 block text-xs"
                    style={{ color: "var(--dd-mut)" }}
                  >
                    {acceso.descripcion}
                  </span>
                </span>

                <ArrowRight size={16} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="dd-reservas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="dd-section-title">
              Mis últimas solicitudes
            </h2>

            <p className="dd-section-sub">
              Consulta las novedades de tus laboratorios.
            </p>
          </div>

          <Link
            href="/estudiante/reservas"
            className="ss-link"
          >
            Ver todas
            <ArrowRight size={15} className="inline ml-1" />
          </Link>
        </div>

        {cargando ? (
          <p className="dd-section-sub mt-4">
            Cargando tus solicitudes...
          </p>
        ) : error ? (
          <div className="dd-empty" role="status">
            <p className="dd-empty__title">
              No se pudieron cargar las reservas
            </p>

            <p className="dd-empty__text">
              Comprueba tu conexión e inténtalo nuevamente.
            </p>

            <button
              type="button"
              className="ss-btn ss-btn--primary mt-3"
              onClick={actualizar}
            >
              Intentar nuevamente
            </button>
          </div>
        ) : recientes.length === 0 ? (
          <div className="dd-empty">
            <span className="dd-empty__icon">
              <Monitor size={28} />
            </span>

            <p className="dd-empty__title">
              Todavía no tienes solicitudes
            </p>

            <p className="dd-empty__text">
              Cuando solicites un laboratorio, aparecerá aquí.
            </p>

            <Link
              href="/estudiante/solicitar"
              className="ss-btn ss-btn--primary mt-4"
            >
              Solicitar laboratorio
            </Link>
          </div>
        ) : (
          <div className="dd-list">
            {recientes.map((r) => (
              <article
                key={r.id}
                className="dd-card"
                data-estado={r.estado}
              >
                <div className="dd-card__top">
                  <span className="dd-card__avatar">
                    <Monitor size={20} />
                  </span>

                  <div className="dd-card__info">
                    <h3 className="dd-card__name">
                      {r.lab}
                    </h3>

                    <p className="dd-card__place">
                      {r.fecha} · {r.hora}
                    </p>
                  </div>

                  <span className="dd-badge">
                    {ESTADOS[r.estado]}
                  </span>
                </div>

                <div className="dd-card__actions">
                  <span
                    className="text-xs"
                    style={{ color: "var(--dd-mut)" }}
                  >
                    {r.estudiantes} estudiantes
                  </span>

                  <Link
                    href="/estudiante/reservas"
                    className="dd-btn dd-btn--ghost"
                  >
                    <ClipboardList />
                    Consultar
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ShellDocente>
  );
}