"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type RolApp = "estudiante" | "docente" | "tecnico" | "admin";
export type Perfil = { id: string; nombre: string; rol: RolApp };

export const ETIQUETA_ROL: Record<RolApp, string> = {
  estudiante: "Estudiante",
  docente: "Docente",
  tecnico: "Técnico",
  admin: "Administrador",
};

type Resultado = { error?: string; confirmar?: boolean };

type Ctx = {
  session: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  entrar: (correo: string, clave: string) => Promise<Resultado>;
  registrar: (nombre: string, correo: string, clave: string) => Promise<Resultado>;
  salir: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

function mensaje(e: AuthError): string {
  switch (e.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "user_already_exists":
    case "email_exists":
      return "Ese correo ya tiene una cuenta. Inicia sesión.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de entrar.";
    case "weak_password":
      return "La contraseña es muy débil. Usa al menos 8 caracteres.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Demasiados intentos. Espera unos minutos.";
    default:
      return "No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo.";
  }
}

/* Puente temporal: las notificaciones de ejemplo (lib/notificaciones.ts) todavía leen el rol
   desde localStorage. Cuando se conecten a la tabla `notificaciones`, esto se elimina. */
function sincronizarRolTemporal(p: Perfil | null) {
  try {
    if (!p) localStorage.removeItem("rol-temporal");
    else
      localStorage.setItem(
        "rol-temporal",
        p.rol === "docente" ? "Docente" : p.rol === "estudiante" ? "Estudiante" : "Técnico",
      );
    window.dispatchEvent(new Event("notif-cambio"));
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);
  const perfilRef = useRef<Perfil | null>(null);

  useEffect(() => {
    let activo = true;

    const cargarPerfil = async (s: Session | null) => {
      let p: Perfil | null = null;
      if (s) {
        const { data } = await supabase
          .from("perfiles")
          .select("id, nombre, rol")
          .eq("id", s.user.id)
          .maybeSingle();
        p = (data as Perfil | null) ?? null;
      }
      if (!activo) return;
      perfilRef.current = p;
      setPerfil(p);
      sincronizarRolTemporal(p);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s);
      if (s && perfilRef.current?.id !== s.user.id) setCargando(true);
      // Las consultas se difieren: hacerlas dentro del callback puede bloquear la librería.
      setTimeout(async () => {
        await cargarPerfil(s);
        if (activo) setCargando(false);
      }, 0);
    });

    return () => {
      activo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (correo: string, clave: string): Promise<Resultado> => {
    const { error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    return error ? { error: mensaje(error) } : {};
  }, []);

  const registrar = useCallback(
    async (nombre: string, correo: string, clave: string): Promise<Resultado> => {
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim(),
        password: clave,
        options: { data: { nombre: nombre.trim() } },
      });
      if (error) return { error: mensaje(error) };
      return data.session ? {} : { confirmar: true };
    },
    [],
  );

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const valor = useMemo(
    () => ({ session, perfil, cargando, entrar, registrar, salir }),
    [session, perfil, cargando, entrar, registrar, salir],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}