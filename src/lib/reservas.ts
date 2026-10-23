import { supabase } from "@/lib/supabase";

/* ---------- Tipos ---------- */
export type EstadoUI = "pendiente" | "aprobado" | "en-curso" | "finalizado" | "rechazado" | "cancelado";

export type ReservaUI = {
  id: string;
  lab: string;
  fecha: string;       // "14 Oct 2026"
  hora: string;        // "10:00 - 12:00"
  estudiantes: number;
  solicitante: string;
  estado: EstadoUI;
  motivo?: string;
};

export type SolicitudTec = {
  id: string;
  docente: string;
  lab: string;
  fecha: string;       // ISO "2026-10-14"
  inicio: string;      // "08:00"
  fin: string;
  est: number;
  estado: "pendiente" | "aprobado" | "rechazado";
  motivo?: string;
};

type Fila = {
  id: string;
  laboratorio_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estudiantes: number;
  estado: "pendiente" | "aprobada" | "rechazada" | "cancelada" | "finalizada";
  motivo_rechazo: string | null;
  perfiles: { nombre: string } | null;
};

const COLUMNAS = "id, laboratorio_id, fecha, hora_inicio, hora_fin, estudiantes, estado, motivo_rechazo, perfiles(nombre)";

/* ---------- Utilidades ---------- */
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[Number(m) - 1]} ${y}`;
};
const hhmm = (t: string) => t.slice(0, 5);
const aHoras = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) + Number(m) / 60;
};

export function mensajeError(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : "";
  if (msg.includes("clase en ese horario")) return "El laboratorio tiene clase en ese horario.";
  if (msg.includes("reservas_sin_cruce")) return "Ya hay una reserva aprobada en ese laboratorio y horario.";
  if (msg.includes("row-level security")) return "Tu cuenta no tiene permiso para esta acción.";
  if (msg.includes("reservas_solo_laborables")) return "Solo se pueden reservar de lunes a viernes.";
  return msg || "Ocurrió un error. Intenta de nuevo.";
}

async function uid() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  return user.id;
}

/* ---------- Docente ---------- */
export async function crearReserva(d: {
  lab: string; fecha: string; inicio: string; fin: string;
  carrera: string; periodo: string; asignatura: string; estudiantes: number; actividad: string;
}) {
  const { error } = await supabase.from("reservas").insert({
    docente_id: await uid(),
    laboratorio_id: d.lab,
    fecha: d.fecha,
    hora_inicio: d.inicio,
    hora_fin: d.fin,
    carrera: d.carrera,
    periodo: d.periodo,
    asignatura: d.asignatura.trim(),
    estudiantes: d.estudiantes,
    actividad: d.actividad.trim() || null,
  });
  if (error) throw error;
}

/** Avisa antes de enviar si el horario choca con una clase fija. Devuelve el mensaje o null. */
export async function choqueConClase(lab: string, fecha: string, inicio: string, fin: string) {
  const dia = ((new Date(`${fecha}T00:00:00`).getDay() + 6) % 7) + 1; // 1 = lunes
  if (dia > 5) return null;
  const { data, error } = await supabase
    .from("horarios")
    .select("hora_inicio, hora_fin, asignatura")
    .eq("laboratorio_id", lab)
    .eq("dia", dia);
  if (error) throw error;
  const a = aHoras(inicio), b = aHoras(fin);
  const c = (data ?? []).find((h) => a < h.hora_fin && h.hora_inicio < b);
  return c
    ? `El Laboratorio ${lab} tiene clase de ${c.asignatura} de ${c.hora_inicio}:00 a ${c.hora_fin}:00 ese día.`
    : null;
}

export async function cargarMisReservas(): Promise<ReservaUI[]> {
  const { data, error } = await supabase
    .from("reservas")
    .select(COLUMNAS)
    .eq("docente_id", await uid())
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false });
  if (error) throw error;

  const ahora = new Date();
  return ((data ?? []) as unknown as Fila[]).map((f) => {
    let estado: EstadoUI;
    if (f.estado === "aprobada" || f.estado === "finalizada") {
      const ini = new Date(`${f.fecha}T${f.hora_inicio}`);
      const fin = new Date(`${f.fecha}T${f.hora_fin}`);
      estado = f.estado === "finalizada" || ahora > fin ? "finalizado" : ahora >= ini ? "en-curso" : "aprobado";
    } else {
      estado = f.estado === "rechazada" ? "rechazado" : f.estado === "cancelada" ? "cancelado" : "pendiente";
    }
    return {
      id: f.id,
      lab: `Laboratorio ${f.laboratorio_id}`,
      fecha: fechaLarga(f.fecha),
      hora: `${hhmm(f.hora_inicio)} - ${hhmm(f.hora_fin)}`,
      estudiantes: f.estudiantes,
      solicitante: f.perfiles?.nombre ?? "—",
      estado,
      motivo: f.motivo_rechazo ?? undefined,
    };
  });
}

export async function cancelarReserva(id: string) {
  const { data, error } = await supabase
    .from("reservas").update({ estado: "cancelada" }).eq("id", id).eq("estado", "pendiente").select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo cancelar. Puede que ya haya sido respondida.");
}

/* ---------- Técnico ---------- */
export async function cargarSolicitudes(): Promise<SolicitudTec[]> {
  const { data, error } = await supabase
    .from("reservas")
    .select(COLUMNAS)
    .in("estado", ["pendiente", "aprobada", "rechazada"])
    .order("fecha")
    .order("hora_inicio");
  if (error) throw error;
  return ((data ?? []) as unknown as Fila[]).map((f) => ({
    id: f.id,
    docente: f.perfiles?.nombre ?? "—",
    lab: f.laboratorio_id,
    fecha: f.fecha,
    inicio: hhmm(f.hora_inicio),
    fin: hhmm(f.hora_fin),
    est: f.estudiantes,
    estado: f.estado === "aprobada" ? "aprobado" : f.estado === "rechazada" ? "rechazado" : "pendiente",
    motivo: f.motivo_rechazo ?? undefined,
  }));
}

export async function responderReserva(id: string, estado: "aprobada" | "rechazada", motivo?: string) {
  const { data, error } = await supabase
    .from("reservas")
    .update({ estado, motivo_rechazo: estado === "rechazada" ? motivo || null : null })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("No se pudo actualizar la solicitud.");
}

/** Reservas aprobadas de hoy: [laboratorio, horaInicio, horaFin, docente] */
export type OcupacionHoy = { lab: string; ini: number; fin: number; docente: string; asignatura: string };

export async function cargarReservasHoy(): Promise<OcupacionHoy[]> {
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase
    .from("reservas")
    .select("laboratorio_id, hora_inicio, hora_fin, asignatura, perfiles(nombre)")
    .eq("estado", "aprobada")
    .eq("fecha", hoy);
  if (error) throw error;
  return ((data ?? []) as unknown as {
    laboratorio_id: string; hora_inicio: string; hora_fin: string;
    asignatura: string; perfiles: { nombre: string } | null;
  }[]).map((f) => ({
    lab: f.laboratorio_id,
    ini: aHoras(f.hora_inicio),
    fin: aHoras(f.hora_fin),
    docente: f.perfiles?.nombre ?? "—",
    asignatura: f.asignatura,
  }));
}

export type OcupacionDia = { lab: string; ini: number; fin: number };

/** Reservas aprobadas de una fecha (solo lab y horas, sin datos personales). */
export async function cargarOcupacionFecha(fecha: string): Promise<OcupacionDia[]> {
  const { data, error } = await supabase.rpc("ocupacion_fecha", { p_fecha: fecha });
  if (error) throw error;
  return ((data ?? []) as { laboratorio_id: string; hora_inicio: string; hora_fin: string }[]).map((r) => ({
    lab: r.laboratorio_id,
    ini: aHoras(r.hora_inicio),
    fin: aHoras(r.hora_fin),
  }));
}