import { supabase } from "@/lib/supabase";

/** Cuántas fallas abiertas y solicitudes de material pendientes hay (para el Dashboard del técnico). */
export async function contarPendientes() {
  const [m, f] = await Promise.all([
    supabase.from("solicitudes_material").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("fallas").select("id", { count: "exact", head: true }).eq("estado", "abierta"),
  ]);
  return { material: m.count ?? 0, fallas: f.count ?? 0 };
}