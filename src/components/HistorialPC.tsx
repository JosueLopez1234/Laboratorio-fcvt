"use client";

import { useEffect, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { fechaLarga, mensajeError } from "@/lib/servicios/reservas";
import { cargarHistorialPc, type HistorialPcDatos } from "@/lib/servicios/trazabilidad";

export default function HistorialPc({ equipo, lab }: { equipo: string; lab?: string }) {
  const [datos, setDatos] = useState<HistorialPcDatos | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    cargarHistorialPc(equipo, lab)
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(mensajeError(e)));
    return () => { vivo = false; };
  }, [equipo, lab]);

  if (error) return <p className="ss-error" role="alert">{error}</p>;
  if (!datos) return <p className="dd-section-sub" style={{ marginTop: 10 }}>Buscando historial de {equipo}…</p>;

  const vacio = datos.accesos.length === 0 && datos.actas.length === 0;

  return (
    <div className="tt-reject" aria-label={`Historial de uso de ${equipo}`}>
      <p className="ss-label" style={{ marginBottom: 0 }}>Historial de uso de {equipo}</p>

      {vacio && (
        <p className="dd-section-sub">
          No hay registros de uso para esta máquina. Revisa que se haya escrito igual en los accesos y actas
          (por ejemplo PC-14).
        </p>
      )}

      {datos.accesos.length > 0 && (
        <>
          <p className="tt-meta"><strong>Accesos de docentes (más recientes primero)</strong></p>
          {datos.accesos.map((a) => (
            <p key={a.id} className="tt-meta" style={{ marginTop: 4 }}>
              {a.enOrden ? <Check size={11} style={{ display: "inline", marginRight: 4 }} />
                : <TriangleAlert size={11} style={{ display: "inline", marginRight: 4 }} />}
              {fechaLarga(a.fecha)}, {a.entrada} - {a.salida} · Lab {a.lab} · {a.docente}
              {!a.enOrden && a.observaciones ? ` · Novedad: ${a.observaciones}` : ""}
            </p>
          ))}
        </>
      )}

      {datos.actas.length > 0 && (
        <>
          <p className="tt-meta"><strong>Actas donde fue asignada a un estudiante</strong></p>
          {datos.actas.map((a) => (
            <p key={a.id} className="tt-meta" style={{ marginTop: 4 }}>
              {fechaLarga(a.fecha)} · {a.estudiante} (CI {a.cedula}) · {a.carrera} · Acta de {a.presentadaPor}
            </p>
          ))}
        </>
      )}

      <p className="dd-section-sub">
        Las actas no registran el laboratorio, así que se cruzan solo por el número de máquina.
        Compara con la fecha de la falla.
      </p>
    </div>
  );
}