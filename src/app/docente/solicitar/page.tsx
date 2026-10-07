"use client";
import { Pantalla, Campo, Sel, Firma, Formulario } from "@/components/ui";
import { LABS, CARRERAS, PERIODOS } from "@/lib/datos";

export default function Solicitar() {
  return (
    <Pantalla titulo="Solicitar laboratorio">
      <Formulario ok="Solicitud enviada al técnico" boton="Enviar solicitud">
        <Campo label="Nombres y apellidos"><input className="input" required /></Campo>
        <Campo label="Fecha de solicitud"><input className="input" type="date" required /></Campo>
        <Sel label="Carrera" opciones={CARRERAS} />
        <Campo label="Asignatura"><input className="input" required /></Campo>
        <Sel label="Período académico" opciones={PERIODOS} />
        <Sel label="Laboratorio solicitado" opciones={LABS.map((l) => "Laboratorio " + l)} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Hora de inicio"><input className="input" type="time" required /></Campo>
          <Campo label="Hora de fin"><input className="input" type="time" required /></Campo>
        </div>
        <Campo label="N.º de estudiantes"><input className="input" type="number" min={1} max={40} required /></Campo>
        <Campo label="Actividad a realizar"><textarea className="input" rows={3} /></Campo>
        <Campo label="Cédula del solicitante"><input className="input" inputMode="numeric" maxLength={10} required /></Campo>
        <Firma label="Firma del solicitante" />
      </Formulario>
    </Pantalla>
  );
}
