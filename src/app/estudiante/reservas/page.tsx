
"use client";

import ShellDocente, {
  MENU_ESTUDIANTE,
} from "@/components/docente/ShellDocente";

import MisReservas from "@/components/MisReservas";

export default function ReservasEstudiante() {
  return (
    <ShellDocente menu={MENU_ESTUDIANTE}>
      <h1 className="dd-title">
        Mis reservas
      </h1>

      <p className="dd-subtitle">
        Consulta tus solicitudes de laboratorio,
        revisa las respuestas del técnico y administra
        tus reservas.
      </p>

      <section className="dd-reservas">
        <MisReservas rutaFalla="/estudiante/falla" />
      </section>
    </ShellDocente>
  );
}
