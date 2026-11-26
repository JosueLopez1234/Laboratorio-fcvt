"use client";
import { useSyncExternalStore } from "react";

export type EstadoConexion = "ok" | "sin-internet" | "servidor-caido";

type Snap = { estado: EstadoConexion; restablecida: boolean };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""; // ajusta si tu variable se llama distinto
const CADA_MS = 15000;

/* ---------- Comprobación ---------- */
async function conTimeout(url: string, init: RequestInit, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

async function comprobar(): Promise<EstadoConexion> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "sin-internet";

  // 1) ¿Responde el servidor (Supabase)?
  try {
    const r = await conTimeout(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_KEY },
    });
    if (r.ok) return "ok";
  } catch {}

  // 2) El servidor no respondió: ¿hay internet en general?
  try {
    await conTimeout("https://www.gstatic.com/generate_204", { mode: "no-cors" });
    return "servidor-caido";
  } catch {
    return "sin-internet";
  }
}

/* ---------- Estado compartido (una sola comprobación para toda la app) ---------- */
let snap: Snap = { estado: "ok", restablecida: false };
const oyentes = new Set<() => void>();
let timer: number | undefined;
let timerAviso: number | undefined;

const poner = (s: Snap) => {
  if (s.estado === snap.estado && s.restablecida === snap.restablecida) return;
  snap = s;
  oyentes.forEach((f) => f());
};

const revisar = async () => {
  const nuevo = await comprobar();
  if (snap.estado !== "ok" && nuevo === "ok") {
    poner({ estado: "ok", restablecida: true });
    window.clearTimeout(timerAviso);
    timerAviso = window.setTimeout(() => poner({ estado: "ok", restablecida: false }), 3000);
  } else {
    poner({ estado: nuevo, restablecida: nuevo === "ok" ? snap.restablecida : false });
  }
};

const alOffline = () => poner({ estado: "sin-internet", restablecida: false });
const alOnline = () => revisar();
const alVolver = () => {
  if (document.visibilityState === "visible") revisar();
};

function iniciar() {
  revisar();
  timer = window.setInterval(revisar, CADA_MS);
  window.addEventListener("offline", alOffline);
  window.addEventListener("online", alOnline);
  document.addEventListener("visibilitychange", alVolver);
}

function detener() {
  window.clearInterval(timer);
  window.clearTimeout(timerAviso);
  window.removeEventListener("offline", alOffline);
  window.removeEventListener("online", alOnline);
  document.removeEventListener("visibilitychange", alVolver);
}

function suscribir(fn: () => void) {
  oyentes.add(fn);
  if (oyentes.size === 1) iniciar();
  return () => {
    oyentes.delete(fn);
    if (oyentes.size === 0) detener();
  };
}

const SERVIDOR: Snap = { estado: "ok", restablecida: false };

export function useConexion() {
  return useSyncExternalStore(suscribir, () => snap, () => SERVIDOR);
}

/** Texto para avisar al usuario cuando no puede enviar. */
export function mensajeSinRed(estado: EstadoConexion): string {
  return estado === "servidor-caido"
    ? "El sistema no responde en este momento. Lo que escribiste se conserva; podrás enviar cuando vuelva."
    : "Sin internet. Lo que escribiste se conserva; podrás enviar cuando vuelva la conexión.";
}