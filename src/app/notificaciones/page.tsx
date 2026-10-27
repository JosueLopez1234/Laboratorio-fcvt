"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, Check, CheckCheck, Send, Clock, BellOff } from "lucide-react";
import ShellDocente, { MENU_ESTUDIANTE, MENU_TECNICO } from "@/components/docente/ShellDocente";
import { useNotificaciones } from "@/lib/notificaciones";
import {
  estadoPermiso, pedirPermiso, programarAlerta, esApp, type PermisoAlertas,
} from "@/lib/alertasLocales";

type Filtro = "no-leidas" | "todas" | "leidas";
const FILTROS: { id: Filtro; t: string }[] = [
  { id: "no-leidas", t: "No leídas" },
  { id: "todas", t: "Todas" },
  { id: "leidas", t: "Leídas" },
];
const RETARDOS = [
  { s: 10, t: "En 10 segundos" },
  { s: 30, t: "En 30 segundos" },
  { s: 60, t: "En 1 minuto" },
];

const formatoFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-EC", { dateStyle: "short", timeStyle: "medium" });

export default function Notificaciones() {
  const { rol, items, noLeidas, marcarLeida, marcarTodas, agregar } = useNotificaciones();
  const [filtro, setFiltro] = useState<Filtro>("no-leidas");
  const [permiso, setPermiso] = useState<PermisoAlertas>("pendiente");
  const [retardo, setRetardo] = useState(10);
  const [aviso, setAviso] = useState("");
  const [app, setApp] = useState(false);

  useEffect(() => {
    estadoPermiso().then(setPermiso);
    setApp(esApp());
  }, []);

  const menu = rol === "Estudiante" ? MENU_ESTUDIANTE : rol === "Técnico" ? MENU_TECNICO : undefined;

  const visibles = items.filter((n) =>
    filtro === "todas" ? true : filtro === "leidas" ? n.leida : !n.leida,
  );
  const contar = (f: Filtro) =>
    f === "todas" ? items.length : items.filter((n) => (f === "leidas" ? n.leida : !n.leida)).length;

  const activar = async () => setPermiso(await pedirPermiso());

  const probar = async () => {
    setAviso("");
    try {
      await programarAlerta("Alerta de prueba", "Si ves esto, las notificaciones funcionan en este dispositivo.", retardo);
      agregar({ titulo: "Alerta de prueba", mensaje: "Programaste una alerta local de prueba." });
      setAviso(`Alerta programada. Llegará en ${retardo} segundos; puedes cerrar la app para comprobarlo.`);
    } catch {
      setAviso("No se pudo programar la alerta. Revisa el permiso de notificaciones del dispositivo.");
    }
  };

  const estados: Record<PermisoAlertas, { t: string; color: string }> = {
    concedido: { t: "Permiso de alertas del dispositivo concedido", color: "var(--dd-ok-fg)" },
    denegado: { t: "Alertas bloqueadas en este dispositivo", color: "var(--dd-danger)" },
    pendiente: { t: "Desactivadas en este dispositivo", color: "var(--dd-mut)" },
    "no-disponible": { t: "Este navegador no admite notificaciones", color: "var(--dd-mut)" },
  };

  return (
    <ShellDocente menu={menu}>
      <h1 className="dd-title">Notificaciones</h1>
      <p className="dd-subtitle">
        Gestiona aquí tus avisos: reservas, solicitudes, fallas y recordatorios. La campanita muestra los pendientes.
      </p>

      {/* Tarjeta de notificaciones del sistema */}
      <section className="ss-card" style={{ maxWidth: "none" }} aria-label="Notificaciones del sistema">
        <div className="flex items-start gap-3">
          <span className="dd-card__avatar" style={{ background: "var(--dd-blue-soft)", color: "var(--dd-blue)" }}>
            <BellRing size={20} />
          </span>
          <div>
            <h2 className="dd-section-title">Notificaciones del sistema</h2>
            <p className="dd-section-sub">Recibe avisos aunque tengas la app en segundo plano.</p>
          </div>
        </div>

        <p className="mt-4 flex items-center gap-2 text-sm font-semibold" style={{ color: estados[permiso].color }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: estados[permiso].color }} />
          {estados[permiso].t}
        </p>

        {permiso === "concedido" ? (
          <div className="mt-3 grid gap-3 sm:flex sm:items-center">
            <label className="flex items-center gap-2 sm:w-auto">
              <Clock size={18} style={{ color: "var(--dd-mut)" }} />
              <select
                className="input" aria-label="Cuándo enviar la alerta de prueba"
                value={retardo} onChange={(e) => setRetardo(Number(e.target.value))}
              >
                {RETARDOS.map((r) => <option key={r.s} value={r.s}>{r.t}</option>)}
              </select>
            </label>
            <button type="button" className="ss-btn ss-btn--ghost" onClick={probar}>
              <Send size={16} /> Probar alerta local
            </button>
          </div>
        ) : permiso === "denegado" ? (
          <p className="mt-2 text-xs" style={{ color: "var(--dd-mut)" }}>
            Actívalas desde los ajustes del teléfono: Aplicaciones, FCVT, Notificaciones.
          </p>
        ) : permiso === "pendiente" ? (
          <button type="button" className="ss-btn ss-btn--primary mt-3" onClick={activar}>
            <Bell size={16} /> Activar notificaciones
          </button>
        ) : null}

        {permiso === "concedido" && (
          <p className="mt-3 text-xs" style={{ color: "var(--dd-mut)" }}>
            {app
              ? "La prueba local solo comprueba que este teléfono muestra alertas. Para recibir avisos de otras personas hará falta conectar un servidor de envío (FCM)."
              : "En el navegador la alerta de prueba solo aparece con esta pestaña abierta."}
          </p>
        )}
        {aviso && <p className="mt-2 text-xs font-semibold" role="status" style={{ color: "var(--dd-navy)" }}>{aviso}</p>}
      </section>

      {/* Pestañas + marcar todas */}
      <section className="dd-reservas">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="dd-chips" style={{ marginTop: 0 }} role="tablist" aria-label="Filtrar avisos">
            {FILTROS.map((f) => (
              <button
                key={f.id} role="tab" aria-selected={filtro === f.id}
                className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.t} ({contar(f.id)})
              </button>
            ))}
          </div>
          <button type="button" className="dd-btn dd-btn--ghost" onClick={marcarTodas} disabled={noLeidas === 0}
            style={noLeidas === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
            <CheckCheck /> Marcar todas leídas
          </button>
        </div>

        {visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><BellOff size={28} /></span>
            <p className="dd-empty__title">
              {filtro === "no-leidas" ? "Estás al día" : "No hay avisos"}
            </p>
            <p className="dd-empty__text">
              {filtro === "no-leidas"
                ? "No tienes avisos sin leer."
                : "Cuando haya novedades en tus reservas o solicitudes, aparecerán aquí."}
            </p>
          </div>
        ) : (
          <ul className="dd-list" aria-label="Lista de avisos">
            {visibles.map((n) => (
              <li key={n.id} className="dd-card" style={{ opacity: n.leida ? 0.75 : 1 }}>
                <div className="dd-card__top">
                  <span
                    className="dd-card__avatar"
                    style={n.leida ? undefined : { background: "var(--dd-blue-soft)", color: "var(--dd-blue)" }}
                  >
                    <Bell size={18} />
                  </span>
                  <div className="dd-card__info">
                    <h3 className="dd-card__name">{n.titulo}</h3>
                    <p className="text-[13px]" style={{ color: "var(--dd-text)", marginTop: 2 }}>{n.mensaje}</p>
                  </div>
                  <time className="dd-card__place" dateTime={n.fecha} style={{ flexShrink: 0 }}>
                    {formatoFecha(n.fecha)}
                  </time>
                </div>
                {(n.href || !n.leida) && (
                  <div className="mt-3 flex items-center gap-4 pl-[46px]">
                    {n.href && (
                      <Link href={n.href} className="ss-link" onClick={() => marcarLeida(n.id)}>
                        {n.etiquetaHref ?? "Abrir"}
                      </Link>
                    )}
                    {!n.leida && (
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "var(--dd-mut)" }} onClick={() => marcarLeida(n.id)}>
                        <Check size={14} /> Marcar leída
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </ShellDocente>
  );
}