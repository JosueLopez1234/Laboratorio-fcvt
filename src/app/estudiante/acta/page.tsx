"use client";
import { useState } from "react";
import { Pantalla, Campo, Sel, Firma, Formulario } from "@/components/ui";
import { CARRERAS, PERIODOS } from "@/lib/datos";

export default function Acta() {
  const [n, setN] = useState(5);

  return (
    <Pantalla titulo="Acta de compromiso">
      <div className="tarjeta m-4 p-4 text-sm">
        Me comprometo a usar el equipo solo para fines académicos, no comer ni beber, no mover ni
        desconectar equipos, no instalar programas sin autorización, no visitar páginas de juegos o
        contenido inapropiado, reportar daños de inmediato y responder por daños por mal uso.
      </div>
      <Formulario ok="Acta firmada" boton="Firmar acta">
        <Sel label="Carrera" opciones={CARRERAS} />
        <Campo label="Fecha del compromiso"><input className="input" type="date" required /></Campo>
        <Sel label="Período académico" opciones={PERIODOS} />

        <div className="flex flex-col gap-2">
          <div className="text-sm font-bold">Estudiantes ({n} de 40)</div>
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="grid grid-cols-[28px_1fr] items-center gap-2">
              <span className="text-sm text-gray-500">{i + 1}</span>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Cédula" inputMode="numeric" maxLength={10} />
                <input className="input" placeholder="Nombre y apellidos" />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="self-start rounded-full border border-gray-300 px-4 py-1.5 text-sm"
            onClick={() => (n < 40 ? setN(n + 1) : alert("El acta admite hasta 40 estudiantes"))}
          >
            + Agregar estudiante
          </button>
        </div>

        <Firma label="Firma de quien presenta el acta" />
      </Formulario>
    </Pantalla>
  );
}
