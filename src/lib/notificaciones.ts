"use client";

import { useCallback, useEffect, useState } from "react";

export type Rol = "Docente" | "Estudiante" | "Técnico";

export type Notif = {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string; // ISO
  leida: boolean;
  href?: string;
  etiquetaHref?: string;
};

const ROLES: Rol[] = ["Docente", "Estudiante", "Técnico"];
const EVENTO = "notif-cambio";

const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

/* ---------- DATOS FALSOS (reemplazar por fetch cuando haya backend) ---------- */
const MOCK: Record<Rol, Omit<Notif, "leida">[]> = {
  Docente: [
    { id: "d1", titulo: "Reserva aprobada", mensaje: "Tu reserva del Laboratorio 105 fue aprobada.", fecha: hace(20), href: "/", etiquetaHref: "Ver reserva" },
    { id: "d2", titulo: "Solicitud de material rechazada", mensaje: "Disco duro × 3: el técnico indicó que no hay stock.", fecha: hace(60 * 26), href: "/docente/stock", etiquetaHref: "Ver solicitud" },
    { id: "d3", titulo: "Recordatorio de práctica", mensaje: "Mañana tienes práctica en el Laboratorio 203, 10:00 - 12:00.", fecha: hace(60 * 30) },
  ],
  Estudiante: [
    { id: "e1", titulo: "Falla en atención", mensaje: "El técnico está revisando la PC-07 del Laboratorio 105.", fecha: hace(35), href: "/", etiquetaHref: "Ver reporte" },
    { id: "e2", titulo: "Acta registrada", mensaje: "Tu acta de compromiso quedó firmada con 12 estudiantes.", fecha: hace(60 * 48) },
  ],
  Técnico: [
    { id: "t1", titulo: "Nueva solicitud de laboratorio", mensaje: "Juan Pérez pidió el Laboratorio 203 el 14 Oct, 10:00 - 12:00.", fecha: hace(5), href: "/tecnico/solicitudes", etiquetaHref: "Revisar" },
    { id: "t2", titulo: "Nueva falla reportada", mensaje: "PC-12 del Laboratorio 203 no enciende.", fecha: hace(50), href: "/tecnico/mantenimiento", etiquetaHref: "Ver falla" },
    { id: "t3", titulo: "Nueva solicitud de material", mensaje: "Cable HDMI × 2, Mouse × 1 para el Laboratorio 105.", fecha: hace(60 * 24), href: "/tecnico/solicitudes", etiquetaHref: "Revisar" },
  ],
};

const clave = (rol: Rol) => `notificaciones-${rol}`;

function leer(rol: Rol): Notif[] {
  try {
    const guardado = localStorage.getItem(clave(rol));
    if (guardado) return JSON.parse(guardado) as Notif[];
  } catch {}
  return MOCK[rol].map((n) => ({ ...n, leida: false }));
}

function guardar(rol: Rol, items: Notif[]) {
  try {
    localStorage.setItem(clave(rol), JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event(EVENTO));
}

export function leerRol(): Rol {
  try {
    const r = localStorage.getItem("rol-temporal");
    if (r && (ROLES as string[]).includes(r)) return r as Rol;
  } catch {}
  return "Docente";
}

/* Hook: lista de avisos del rol actual + acciones. Se sincroniza entre componentes. */
export function useNotificaciones() {
  const [rol, setRol] = useState<Rol>("Docente");
  const [items, setItems] = useState<Notif[]>([]);

  const recargar = useCallback(() => {
    const r = leerRol();
    setRol(r);
    setItems(leer(r));
  }, []);

  useEffect(() => {
    recargar();
    window.addEventListener(EVENTO, recargar);
    window.addEventListener("storage", recargar);
    return () => {
      window.removeEventListener(EVENTO, recargar);
      window.removeEventListener("storage", recargar);
    };
  }, [recargar]);

  const marcarLeida = (id: string) =>
    guardar(rol, items.map((n) => (n.id === id ? { ...n, leida: true } : n)));

  const marcarTodas = () => guardar(rol, items.map((n) => ({ ...n, leida: true })));

  const agregar = (n: Omit<Notif, "id" | "leida" | "fecha">) =>
    guardar(rol, [
      { ...n, id: `local-${Date.now()}`, fecha: new Date().toISOString(), leida: false },
      ...items,
    ]);

  const noLeidas = items.filter((n) => !n.leida).length;

  return { rol, items, noLeidas, marcarLeida, marcarTodas, agregar };
}