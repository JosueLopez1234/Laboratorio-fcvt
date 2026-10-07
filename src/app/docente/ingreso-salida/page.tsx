"use client";
import { Pantalla, Campo, Sel, Firma, Formulario } from "@/components/ui";
import { LABS } from "@/lib/datos";

export default function IngresoSalida() {
  return (
    <Pantalla titulo="Ingreso y salida">
      <Formulario ok="Registro guardado" boton="Guardar registro">
        <Campo label="Fecha"><input className="input" type="date" required /></Campo>
        <Campo label="Docente"><input className="input" required /></Campo>
        <Sel label="Laboratorio" opciones={LABS} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Hora de entrada"><input className="input" type="time" required /></Campo>
          <Campo label="Hora de salida"><input className="input" type="time" required /></Campo>
        </div>
        <Sel label="¿Equipos en orden?" opciones={["Sí", "No — reportar falla"]} />
        <Campo label="Observaciones"><textarea className="input" rows={3} /></Campo>
        <Firma label="Firma" />
      </Formulario>
    </Pantalla>
  );
}
