"use client";
import { Pantalla, Campo, Sel, Chips, Formulario } from "@/components/ui";
import { CARRERAS, PERIODOS } from "@/lib/datos";
export default function FormFalla() {
  return (
    <Pantalla titulo="Reportar falla de equipo">
      <Formulario ok="Reporte enviado" boton="Enviar reporte">
        <Campo label="Nombres y apellidos"><input className="input" required /></Campo>
        <Campo label="Fecha"><input className="input" type="date" required /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="PC N.º / equipo"><input className="input" required /></Campo>
          <Campo label="Aula"><input className="input" required /></Campo>
        </div>
        <Sel label="Carrera" opciones={CARRERAS} />
        <Sel label="Período académico" opciones={PERIODOS} />
        <Chips
          leyenda="Tipo de falla"
          opciones={[
            "No enciende", "Pantalla azul", "Sin acceso a internet",
            "Mouse/teclado no responde", "Computadora hackeada", "Daño físico visible",
            "Problema con proyector o pantalla", "Otros",
          ]}
        />
        <Campo label="Descripción del problema"><textarea className="input" rows={3} /></Campo>
      </Formulario>
    </Pantalla>
  );
}
