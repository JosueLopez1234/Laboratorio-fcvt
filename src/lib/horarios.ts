import { supabase } from "@/lib/supabase";

/* [hora inicio, hora fin, asignatura, docente]: misma forma que antes,
   así la pantalla de horarios casi no cambia. */
export type Bloque = [number, number, string, string];

export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const HORA_INICIO = 7;

type Fila = {
  laboratorio_id: string;
  dia: number; // 1 = lunes ... 5 = viernes
  hora_inicio: number;
  hora_fin: number;
  asignatura: string;
  docente: string;
};

/** Devuelve { "103": [lunes[], martes[], ...], "201": [...] } leyendo la tabla `horarios`. */
export async function cargarHorarios(): Promise<Record<string, Bloque[][]>> {
  const { data, error } = await supabase
    .from("horarios")
    .select("laboratorio_id, dia, hora_inicio, hora_fin, asignatura, docente")
    .order("hora_inicio");
  if (error) throw error;

  const porLab: Record<string, Bloque[][]> = {};
  for (const f of (data ?? []) as Fila[]) {
    const semana = (porLab[f.laboratorio_id] ??= [[], [], [], [], []]);
    semana[f.dia - 1]?.push([f.hora_inicio, f.hora_fin, f.asignatura, f.docente]);
  }
  return porLab;
}