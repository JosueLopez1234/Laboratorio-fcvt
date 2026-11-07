import { supabase } from "@/lib/servicios/supabase";

export async function crearActa(d: {
  carrera: string;
  periodo: string;
  fecha: string;
  estudiantes: { cedula: string; nombre: string }[];
  firmaUrl?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");

  const { error } = await supabase.from("actas").insert({
    estudiante_id: user.id,
    carrera: d.carrera,
    periodo: d.periodo,
    fecha: d.fecha,
    estudiantes: d.estudiantes,
    firma_url: d.firmaUrl ?? null,
  });
  if (error) throw error;
}