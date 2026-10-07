"use client";
import { Pantalla, Campo, Sel, Chips, Firma, Formulario } from "@/components/ui";
import { LABS, PERIODOS } from "@/lib/datos";

export default function Stock() {
  return (
    <Pantalla titulo="Solicitar stock">
      <Formulario ok="Solicitud de stock enviada" boton="Enviar solicitud">
        <Campo label="Nombre y apellidos"><input className="input" required /></Campo>
        <Campo label="Fecha de solicitud"><input className="input" type="date" required /></Campo>
        <Sel label="Laboratorio" opciones={LABS} />
        <Sel label="Período académico" opciones={PERIODOS} />
        <Campo label="Carrera / asignatura"><input className="input" required /></Campo>
        <Campo label="Cantidad solicitada"><input className="input" type="number" min={1} required /></Campo>
        <Chips
          leyenda="Material solicitado"
          opciones={[
            "Cable HDMI", "Cable Ethernet", "Cable VGA", "Cable de poder para proyector",
            "Disco duro", "Mouse", "Teclado", "Otros",
          ]}
        />
        <Campo label="Justificación del pedido"><textarea className="input" rows={3} /></Campo>
        <Firma label="Firma del solicitante" />
      </Formulario>
    </Pantalla>
  );
}
