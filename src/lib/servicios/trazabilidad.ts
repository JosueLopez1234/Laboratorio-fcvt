import { supabase } from "@/lib/servicios/supabase";

export type UsoAcceso = {
  id: string; docente: string; lab: string; fecha: string; entrada: string; salida: string;
  enOrden: boolean; observaciones?: string;
};
export type UsoActa = {
  id: string; fecha: string; carrera: string; estudiante: string; cedula: string; presentadaPor: string;
};
export type HistorialPcDatos = { accesos: UsoAcceso[]; actas: UsoActa[] };

/* "pc 14", "PC-14", "Pc  14" -> "PC-14" para comparar sin importar cómo se escribió */
export const normalizarPc = (s: string) =>
  s.trim().toUpperCase().replace(/[\s_-]+/g, "-");

export async function cargarHistorialPc(equipo: string, lab?: string): Promise<HistorialPcDatos> {
  const objetivo = normalizarPc(equipo);

  let qa = supabase
    .from("accesos")
    .select("id, laboratorio_id, fecha, hora_entrada, hora_salida, equipos_en_orden, observaciones, pcs, perfiles(nombre)")
    .order("fecha", { ascending: false })
    .order("hora_entrada", { ascending: false })
    .limit(300);
  if (lab) qa = qa.eq("laboratorio_id", lab);

  const [ra, rc] = await Promise.all([
    qa,
    supabase
      .from("actas")
      .select("id, fecha, carrera, estudiantes, perfiles(nombre)")
      .order("fecha", { ascending: false })
      .limit(150),
  ]);
  if (ra.error) throw ra.error;
  if (rc.error) throw rc.error;

  const accesos = ((ra.data ?? []) as unknown as {
    id: string; laboratorio_id: string; fecha: string; hora_entrada: string; hora_salida: string;
    equipos_en_orden: boolean; observaciones: string | null; pcs: string[] | null;
    perfiles: { nombre: string } | null;
  }[])
    .filter((a) => (a.pcs ?? []).some((p) => normalizarPc(p) === objetivo))
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      docente: a.perfiles?.nombre ?? "—",
      lab: a.laboratorio_id,
      fecha: a.fecha,
      entrada: a.hora_entrada.slice(0, 5),
      salida: a.hora_salida.slice(0, 5),
      enOrden: a.equipos_en_orden,
      observaciones: a.observaciones ?? undefined,
    }));

  const actas: UsoActa[] = [];
  for (const ac of (rc.data ?? []) as unknown as {
    id: string; fecha: string; carrera: string;
    estudiantes: { cedula: string; nombre: string; pc?: string }[] | null;
    perfiles: { nombre: string } | null;
  }[]) {
    for (const e of ac.estudiantes ?? []) {
      if (e.pc && normalizarPc(e.pc) === objetivo) {
        actas.push({
          id: `${ac.id}-${e.cedula}`,
          fecha: ac.fecha,
          carrera: ac.carrera,
          estudiante: e.nombre,
          cedula: e.cedula,
          presentadaPor: ac.perfiles?.nombre ?? "—",
        });
      }
    }
  }

  return { accesos, actas: actas.slice(0, 8) };
}