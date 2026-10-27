"use client";

import { useSyncExternalStore } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

type Fila = {
  id: string; titulo: string; mensaje: string; href: string | null;
  etiqueta_href: string | null; leida: boolean; creado_en: string;
};

type Estado = { rol: Rol; items: Notif[] };

const COLUMNAS = "id, titulo, mensaje, href, etiqueta_href, leida, creado_en";
const MAX = 50;
const INICIAL: Estado = { rol: "Docente", items: [] };

const aNotif = (f: Fila): Notif => ({
  id: f.id,
  titulo: f.titulo,
  mensaje: f.mensaje,
  fecha: f.creado_en,
  leida: f.leida,
  href: f.href ?? undefined,
  etiquetaHref: f.etiqueta_href ?? undefined,
});

const aRol = (r?: string): Rol =>
  r === "estudiante" ? "Estudiante" : r === "tecnico" || r === "admin" ? "Técnico" : "Docente";

/* ---------- Almacén compartido: una sola carga y una sola conexión en tiempo real
   para todos los componentes (botón de la campana, página de avisos, etc.) ---------- */
let estado: Estado = INICIAL;
const oyentes = new Set<() => void>();
const poner = (p: Partial<Estado>) => {
  estado = { ...estado, ...p };
  oyentes.forEach((f) => f());
};

let canal: RealtimeChannel | null = null;
let uidActual = "";
let cargando = false;
let escuchandoAuth = false;

async function cargar() {
  if (cargando) return;
  cargando = true;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (canal && uidActual === user.id) return; // ya está conectado con este usuario

    const [{ data: perfil }, { data }] = await Promise.all([
      supabase.from("perfiles").select("rol").eq("id", user.id).single(),
      supabase.from("notificaciones").select(COLUMNAS)
        .order("creado_en", { ascending: false }).limit(MAX),
    ]);
    poner({ rol: aRol(perfil?.rol), items: ((data ?? []) as Fila[]).map(aNotif) });

    if (canal) supabase.removeChannel(canal);
    uidActual = user.id;
    canal = supabase
      .channel(`notificaciones-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${user.id}` },
        (p) => poner({ items: [aNotif(p.new as Fila), ...estado.items].slice(0, MAX) }),
      )
      .subscribe();
  } finally {
    cargando = false;
  }
}

function limpiar() {
  if (canal) supabase.removeChannel(canal);
  canal = null;
  uidActual = "";
  poner({ ...INICIAL });
}

function asegurar() {
  if (!escuchandoAuth) {
    escuchandoAuth = true;
    supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") limpiar();
      else if (evento === "SIGNED_IN") setTimeout(() => void cargar(), 0);
    });
  }
  void cargar();
}

const suscribir = (f: () => void) => {
  oyentes.add(f);
  asegurar();
  return () => { oyentes.delete(f); };
};

/* ---------- Acciones ---------- */
const esLocal = (id: string) => id.startsWith("local-");

async function marcarLeida(id: string) {
  poner({ items: estado.items.map((n) => (n.id === id ? { ...n, leida: true } : n)) });
  if (!esLocal(id)) await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
}

async function marcarTodas() {
  poner({ items: estado.items.map((n) => ({ ...n, leida: true })) });
  await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
}

/* Solo para la "alerta de prueba" de la página: se agrega en pantalla, no en la base de datos. */
function agregar(n: Omit<Notif, "id" | "leida" | "fecha">) {
  poner({
    items: [
      { ...n, id: `local-${Date.now()}`, fecha: new Date().toISOString(), leida: false },
      ...estado.items,
    ],
  });
}

export const leerRol = (): Rol => estado.rol;

/* Hook: lista de avisos del usuario que inició sesión + acciones, en tiempo real. */
export function useNotificaciones() {
  const { rol, items } = useSyncExternalStore(suscribir, () => estado, () => INICIAL);
  const noLeidas = items.filter((n) => !n.leida).length;
  return { rol, items, noLeidas, marcarLeida, marcarTodas, agregar };
}