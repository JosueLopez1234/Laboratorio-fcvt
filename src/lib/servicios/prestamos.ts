import { supabase } from "@/lib/servicios/supabase";

export type EstadoPrestamo = "prestado" | "devuelto" | "cancelado";

export type Prestamo = {
  id: string;
  solicitante: string;
  institucion: string;
  contacto?: string;
  tipo: "laboratorio" | "equipos";
  lab?: string;
  detalle?: string;
  fecha: string;
  inicio?: string;
  fin?: string;
  motivo?: string;
  estado: EstadoPrestamo;
  obsDevolucion?: string;
};

type Fila = {
  id: string; solicitante: string; institucion: string; contacto: string | null;
  tipo: "laboratorio" | "equipos"; laboratorio_id: string | null; detalle: string | null;
  fecha: string; hora_inicio: string | null; hora_fin: string | null; motivo: string | null;
  estado: EstadoPrestamo; obs_devolucion: string | null;
};

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : undefined);

export async function cargarPrestamos(): Promise<Prestamo[]> {
  const { data, error } = await supabase
    .from("prestamos")
    .select("*")
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Fila[]).map((f) => ({
    id: f.id,
    solicitante: f.solicitante,
    institucion: f.institucion,
    contacto: f.contacto ?? undefined,
    tipo: f.tipo,
    lab: f.laboratorio_id ?? undefined,
    detalle: f.detalle ?? undefined,
    fecha: f.fecha,
    inicio: hhmm(f.hora_inicio),
    fin: hhmm(f.hora_fin),
    motivo: f.motivo ?? undefined,
    estado: f.estado,
    obsDevolucion: f.obs_devolucion ?? undefined,
  }));
}

export async function crearPrestamo(d: {
  solicitante: string; institucion: string; contacto: string;
  tipo: "laboratorio" | "equipos"; lab: string; detalle: string;
  fecha: string; inicio: string; fin: string; motivo: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  const { error } = await supabase.from("prestamos").insert({
    registrado_por: user.id,
    solicitante: d.solicitante.trim(),
    institucion: d.institucion.trim(),
    contacto: d.contacto.trim() || null,
    tipo: d.tipo,
    laboratorio_id: d.tipo === "laboratorio" ? d.lab : null,
    detalle: d.detalle.trim() || null,
    fecha: d.fecha,
    hora_inicio: d.inicio || null,
    hora_fin: d.fin || null,
    motivo: d.motivo.trim() || null,
  });
  if (error) throw error;
}

export async function cerrarPrestamo(id: string, estado: "devuelto" | "cancelado", obs: string) {
  const { data, error } = await supabase
    .from("prestamos")
    .update({
      estado,
      obs_devolucion: obs.trim() || null,
      devuelto_en: estado === "devuelto" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("estado", "prestado")
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo actualizar el préstamo.");
}