"use client";

import ShellDocente from "@/components/docente/ShellDocente";
import MisReservas from "@/components/MisReservas";

export default function Reservas() {
  return (
    <ShellDocente>
      <h1 className="dd-title">Mis reservas</h1>
      <p className="dd-subtitle">Revisa el estado de tus solicitudes de laboratorio.</p>
      <section className="dd-reservas">
        <MisReservas />
      </section>
    </ShellDocente>
  );
}