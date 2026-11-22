import { supabase } from "@/lib/servicios/supabase";

export async function registrarAcceso(d: {
  lab: string;
  fecha: string;
  entrada: string;
  salida: string;
  enOrden: boolean;
  observaciones: string;
  pcs: string[];
  firmaUrl?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const { error } = await supabase.from("accesos").insert({
    docente_id: user.id,
    laboratorio_id: d.lab,
    fecha: d.fecha,
    hora_entrada: d.entrada,
    hora_salida: d.salida,
    equipos_en_orden: d.enOrden,
    observaciones: d.observaciones.trim() || null,
    pcs: d.pcs,
    firma_url: d.firmaUrl ?? null,
  });
  if (error) throw error;
}
export type AccesoTec = {
  id: string;
  docente: string;
  lab: string;
  fecha: string;
  entrada: string;
  salida: string;
  enOrden: boolean;
  observaciones?: string;
  pcs: string[];
};

export async function cargarAccesos(): Promise<AccesoTec[]> {
  const { data, error } = await supabase
    .from("accesos")
    .select("id, laboratorio_id, fecha, hora_entrada, hora_salida, equipos_en_orden, observaciones, pcs, perfiles(nombre)")
    .order("fecha", { ascending: false })
    .order("hora_entrada", { ascending: false })
    .limit(300);
  if (error) throw error;
  return ((data ?? []) as unknown as {
    id: string; laboratorio_id: string; fecha: string; hora_entrada: string; hora_salida: string;
    equipos_en_orden: boolean; observaciones: string | null; pcs: string[] | null;
    perfiles: { nombre: string } | null;
  }[]).map((f) => ({
    id: f.id,
    docente: f.perfiles?.nombre ?? "—",
    lab: f.laboratorio_id,
    fecha: f.fecha,
    entrada: f.hora_entrada.slice(0, 5),
    salida: f.hora_salida.slice(0, 5),
    enOrden: f.equipos_en_orden,
    observaciones: f.observaciones ?? undefined,
    pcs: f.pcs ?? [],
  }));
}