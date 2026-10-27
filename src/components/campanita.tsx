"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Aviso = {
  id: string;
  titulo: string;
  mensaje: string;
  href: string | null;
  etiqueta_href: string | null;
  leida: boolean;
  creado_en: string;
};

const COLUMNAS = "id, titulo, mensaje, href, etiqueta_href, leida, creado_en";

function hace(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/* Campana con contador, lista de avisos y actualización en tiempo real.
   Lee de la tabla `notificaciones` (la base de datos ya crea los avisos con triggers). */
export default function Campanita() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [toast, setToast] = useState<Aviso | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivo = true;
    let canal: ReturnType<typeof supabase.channel> | null = null;
    let timer: number | undefined;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !vivo) return;

      const { data } = await supabase
        .from("notificaciones").select(COLUMNAS)
        .order("creado_en", { ascending: false }).limit(30);
      if (vivo) setAvisos((data ?? []) as Aviso[]);

      canal = supabase
        .channel(`avisos-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${user.id}` },
          (p) => {
            const nuevo = p.new as Aviso;
            setAvisos((xs) => [nuevo, ...xs].slice(0, 30));
            setToast(nuevo);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setToast(null), 6000);
          },
        )
        .subscribe();
    })();

    return () => {
      vivo = false;
      window.clearTimeout(timer);
      if (canal) supabase.removeChannel(canal);
    };
  }, []);

  /* Cerrar al tocar fuera o con Escape */
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  const sinLeer = avisos.filter((a) => !a.leida).length;

  const marcar = async (id: string) => {
    setAvisos((xs) => xs.map((a) => (a.id === id ? { ...a, leida: true } : a)));
    await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  };

  const marcarTodas = async () => {
    setAvisos((xs) => xs.map((a) => ({ ...a, leida: true })));
    await supabase.from("notificaciones").update({ leida: true }).eq("leida", false);
  };

  return (
    <div ref={raiz} style={{ position: "relative" }}>
      <button
        className="dd-icon-btn"
        aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones"}
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        style={{ position: "relative" }}
      >
        <Bell />
        {sinLeer > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, padding: "0 4px",
              borderRadius: 999, background: "var(--dd-danger)", color: "#fff",
              fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center",
            }}
          >
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 60,
            width: "min(92vw, 360px)", maxHeight: "70vh", overflowY: "auto",
            background: "var(--dd-surface)", color: "var(--dd-text)",
            borderRadius: 16, boxShadow: "0 8px 28px rgba(27,31,94,.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--dd-neutral)" }}>
            <strong style={{ color: "var(--dd-navy)", fontSize: 14 }}>Notificaciones</strong>
            {sinLeer > 0 && (
              <button type="button" className="ss-link" onClick={marcarTodas} style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <CheckCheck size={14} /> Marcar todas
              </button>
            )}
          </div>

          {avisos.length === 0 ? (
            <p style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--dd-mut)" }}>
              No tienes notificaciones.
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {avisos.map((a) => (
                <li
                  key={a.id}
                  style={{
                    padding: "12px 14px", borderBottom: "1px solid var(--dd-bg)",
                    background: a.leida ? "transparent" : "var(--dd-blue-soft)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--dd-navy)" }}>{a.titulo}</p>
                    <span style={{ fontSize: 10, color: "var(--dd-mut)", whiteSpace: "nowrap" }}>{hace(a.creado_en)}</span>
                  </div>
                  <p style={{ marginTop: 2, fontSize: 12, color: "var(--dd-text)" }}>{a.mensaje}</p>
                  <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
                    {a.href && (
                      <Link
                        href={a.href}
                        className="ss-link"
                        onClick={() => { void marcar(a.id); setAbierto(false); }}
                      >
                        {a.etiqueta_href ?? "Abrir"}
                      </Link>
                    )}
                    {!a.leida && (
                      <button type="button" className="ss-link" style={{ color: "var(--dd-mut)" }} onClick={() => marcar(a.id)}>
                        Marcar como leída
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Aviso emergente cuando llega uno nuevo con la app abierta */}
      {toast && !abierto && (
        <div
          role="status"
          style={{
            position: "fixed", top: "calc(env(safe-area-inset-top, 0px) + 64px)", right: 16, zIndex: 70,
            width: "min(92vw, 320px)", padding: "10px 14px", borderRadius: 14,
            background: "var(--dd-navy)", color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,.3)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700 }}>{toast.titulo}</p>
          <p style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{toast.mensaje}</p>
        </div>
      )}
    </div>
  );
}