import { supabase } from "@/lib/supabase";
import { usuarioId } from "@/lib/sesion";

export type EstadoFalla = "abierta" | "reparacion" | "resuelta" | "baja";

export type FallaTec = {
  id: string;
  equipo: string;
  aula: string;          // texto libre que escribió quien reportó, p. ej. "Laboratorio 203"
  falla: string;         // tipos elegidos o descripción
  fecha: string;         // dd/mm/aaaa (fecha en que se creó el reporte)
  quien: string;
  estado: EstadoFalla;
  diagnostico?: string;
};

type Fila = {
  id: string; equipo: string; aula: string; tipos: string[]; descripcion: string | null;
  estado: EstadoFalla; diagnostico: string | null; creado_en: string;
  reportante: { nombre: string } | null;
};

/* ---------- Docente / estudiante ---------- */
export async function crearFalla(d: {
  equipo: string; aula: string; carrera: string; periodo: string;
  tipos: string[]; descripcion: string;
}) {
  const { error } = await supabase.from("fallas").insert({
    reportado_por: await usuarioId(),
    equipo: d.equipo.trim(),
    aula: d.aula.trim(),
    carrera: d.carrera,
    periodo: d.periodo,
    tipos: d.tipos,
    descripcion: d.descripcion.trim() || null,
  });
  if (error) throw error;
}

/* ---------- Técnico ---------- */
export async function cargarFallas(): Promise<FallaTec[]> {
  const { data, error } = await supabase
    .from("fallas")
    .select("id, equipo, aula, tipos, descripcion, estado, diagnostico, creado_en, reportante:perfiles!reportado_por(nombre)")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    equipo: f.equipo,
    aula: f.aula,
    falla: f.tipos?.join(", ") || f.descripcion || "Mantenimiento",
    fecha: new Date(f.creado_en).toLocaleDateString("es-EC"),
    quien: f.reportante?.nombre ?? "—",
    estado: f.estado,
    diagnostico: f.diagnostico ?? undefined,
  }));
}

export async function marcarEnReparacion(id: string) {
  const { data, error } = await supabase
    .from("fallas").update({ estado: "reparacion", tecnico_id: await usuarioId() })
    .eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo actualizar la falla.");
}

/** Con id: cierra o actualiza una falla reportada. Sin id: registra un mantenimiento nuevo. */
export async function guardarMantenimiento(
  id: string | null,
  d: { lab: string; periodo: string; equipo: string; estado: EstadoFalla;
       falla: string; diagnostico: string; repuestos: string },
) {
  const tecnico = await usuarioId();
  const comunes = {
    estado: d.estado,
    tecnico_id: tecnico,
    diagnostico: d.diagnostico.trim(),
    repuestos: d.repuestos.trim() || null,
  };
  if (id) {
    const { data, error } = await supabase.from("fallas").update(comunes).eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("No se pudo guardar el mantenimiento.");
  } else {
    const { error } = await supabase.from("fallas").insert({
      ...comunes,
      reportado_por: tecnico,
      equipo: d.equipo.trim(),
      aula: `Laboratorio ${d.lab}`,
      periodo: d.periodo,
      tipos: [],
      descripcion: d.falla.trim() || null,
    });
    if (error) throw error;
  }
}