"use client";
import { Pantalla, Campo, Sel, Firma, Formulario, Etiqueta } from "@/components/ui";
import { LABS, PERIODOS } from "@/lib/datos";

const FALLAS = [
  ["PC 14", "Lab 201", "Sin acceso a internet", "Abierta"],
  ["PC 03", "Lab 103", "Pantalla azul", "En reparación"],
  ["Proyector", "Lab 204", "No enciende", "Resuelta"],
];

export default function Mantenimiento() {
  return (
    <Pantalla titulo="Mantenimiento">
      <section className="flex flex-col gap-2 p-4 pb-0">
        <h2 className="text-sm font-bold">Fallas reportadas</h2>
        {FALLAS.map(([eq, lab, f, e]) => (
          <div key={eq} className="tarjeta flex items-center justify-between p-3 text-sm">
            <span><b>{eq}</b> · {lab}<br /><span className="text-[var(--mut)]">{f}</span></span>
            <Etiqueta estado={e} />
          </div>
        ))}
      </section>

      <Formulario ok="Mantenimiento guardado" boton="Guardar mantenimiento">
        <h2 className="text-sm font-bold">Registrar mantenimiento</h2>
        <Campo label="Técnico responsable"><input className="input" required /></Campo>
        <Sel label="Período académico" opciones={PERIODOS} />
        <Sel label="Laboratorio" opciones={LABS} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="PC N.º"><input className="input" required /></Campo>
          <Campo label="Fecha"><input className="input" type="date" required /></Campo>
        </div>
        <Sel label="Estado final" opciones={["Reparado", "En espera de repuesto", "Dado de baja"]} />
        <Campo label="Falla reportada"><textarea className="input" rows={2} /></Campo>
        <Campo label="Diagnóstico y reparación realizada"><textarea className="input" rows={3} /></Campo>
        <Campo label="Repuestos utilizados"><input className="input" /></Campo>
        <Firma label="Firma del técnico" />
      </Formulario>
    </Pantalla>
  );
}
