import { supabase } from "@/lib/supabase";
import { usuarioId } from "@/lib/sesion";

export type ItemMaterial = { material: string; cantidad: number };

export type MaterialTec = {
  id: string;
  docente: string;
  lab: string;
  periodo: string;
  carrera: string;
  items: ItemMaterial[];
  justificacion?: string;
  fecha: string;         // dd/mm/aaaa
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo?: string;
};

type Fila = {
  id: string; laboratorio_id: string; periodo: string; carrera: string; items: ItemMaterial[];
  justificacion: string | null; estado: MaterialTec["estado"]; motivo_rechazo: string | null;
  creado_en: string; perfiles: { nombre: string } | null;
};

/* ---------- Docente ---------- */
export async function crearSolicitudMaterial(d: {
  lab: string; periodo: string; carrera: string; items: ItemMaterial[]; justificacion: string;
}) {
  const { error } = await supabase.from("solicitudes_material").insert({
    docente_id: await usuarioId(),
    laboratorio_id: d.lab,
    periodo: d.periodo,
    carrera: d.carrera.trim(),
    items: d.items,
    justificacion: d.justificacion.trim() || null,
  });
  if (error) throw error;
}

/* ---------- Técnico ---------- */
export async function cargarMaterialTec(): Promise<MaterialTec[]> {
  const { data, error } = await supabase
    .from("solicitudes_material")
    .select("id, laboratorio_id, periodo, carrera, items, justificacion, estado, motivo_rechazo, creado_en, perfiles(nombre)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    docente: f.perfiles?.nombre ?? "—",
    lab: f.laboratorio_id,
    periodo: f.periodo,
    carrera: f.carrera,
    items: f.items ?? [],
    justificacion: f.justificacion ?? undefined,
    fecha: new Date(f.creado_en).toLocaleDateString("es-EC"),
    estado: f.estado,
    motivo: f.motivo_rechazo ?? undefined,
  }));
}

export async function responderMaterial(id: string, estado: "aprobada" | "rechazada", motivo?: string) {
  const { data, error } = await supabase
    .from("solicitudes_material")
    .update({ estado, motivo_rechazo: estado === "rechazada" ? motivo || null : null })
    .eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo actualizar la solicitud.");
}