"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PerfilBasico = { id: string; nombre: string };

/* Devuelve el usuario que inició sesión (null mientras carga).
   Si ya tienes tu propio hook/contexto de sesión, úsalo en su lugar. */
export function usePerfil() {
  const [perfil, setPerfil] = useState<PerfilBasico | null>(null);
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("perfiles").select("id, nombre").eq("id", user.id).single();
      if (data) setPerfil(data as PerfilBasico);
    })();
  }, []);
  return perfil;
}