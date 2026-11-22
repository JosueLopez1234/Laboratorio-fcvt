"use client";

import { useEffect, useState } from "react";
import { LogIn, Check, TriangleAlert, ClipboardCheck } from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import { LABS } from "@/lib/types/datos";
import { mensajeError, fechaLarga } from "@/lib/servicios/reservas";
import { cargarAccesos, type AccesoTec } from "@/lib/servicios/accesos";

type Filtro = "todos" | "novedades";

export default function Accesos() {
  const [items, setItems] = useState<AccesoTec[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [lab, setLab] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    cargarAccesos()
      .then(setItems)
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false));
  }, []);

  const q = busqueda.trim().toLowerCase();
  const visibles = items
    .filter((a) => filtro === "todos" || !a.enOrden)
    .filter((a) => lab === "todos" || a.lab === lab)
    .filter((a) =>
      !q ||
      a.docente.toLowerCase().includes(q) ||
      a.pcs.some((p) => p.toLowerCase().includes(q)),
    );

  const novedades = items.filter((a) => !a.enOrden).length;

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Registro de accesos</h1>
      <p className="dd-subtitle">Consulta quién usó cada laboratorio y qué máquinas ocupó.</p>

      <section className="dd-reservas">
        <div className="dd-chips" role="tablist" aria-label="Filtrar por estado">
          <button role="tab" aria-selected={filtro === "todos"}
            className={`dd-chip ${filtro === "todos" ? "is-active" : ""}`}
            onClick={() => setFiltro("todos")}>Todos ({items.length})</button>
          <button role="tab" aria-selected={filtro === "novedades"}
            className={`dd-chip ${filtro === "novedades" ? "is-active" : ""}`}
            onClick={() => setFiltro("novedades")}>Con novedades ({novedades})</button>
        </div>

        <div className="dd-chips" role="tablist" aria-label="Filtrar por laboratorio">
          {["todos", ...LABS.map(String)].map((l) => (
            <button key={l} role="tab" aria-selected={lab === l}
              className={`dd-chip ${lab === l ? "is-active" : ""}`}
              onClick={() => setLab(l)}>
              {l === "todos" ? "Todos los labs" : `Lab ${l}`}
            </button>
          ))}
        </div>

        <div className="tt-search">
          <label htmlFor="busqueda" className="ss-label">Buscar</label>
          <input id="busqueda" className="input" value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Docente o máquina (ej: PC-07)" />
        </div>

        {error && <p className="ss-error" role="alert">{error}</p>}

        {cargando ? (
          <p className="dd-section-sub" style={{ marginTop: 14 }}>Cargando accesos…</p>
        ) : visibles.length === 0 ? (
          <div className="dd-empty" role="status">
            <span className="dd-empty__icon"><ClipboardCheck size={28} /></span>
            <p className="dd-empty__title">No hay accesos</p>
            <p className="dd-empty__text">
              {items.length > 0 ? "Ningún registro coincide con el filtro o la búsqueda." : "Cuando un docente registre su acceso, aparecerá aquí."}
            </p>
          </div>
        ) : (
          <div className="dd-list">
            {visibles.map((a) => (
              <article key={a.id} className="dd-card" data-estado={a.enOrden ? "aprobado" : "pendiente"}>
                <div className="dd-card__top">
                  <span className="dd-card__avatar"><LogIn size={20} /></span>
                  <div className="dd-card__info">
                    <h3 className="dd-card__name">Laboratorio {a.lab}</h3>
                    <p className="dd-card__place">{a.docente}</p>
                  </div>
                  <span className="dd-badge">
                    {a.enOrden ? <Check size={12} /> : <TriangleAlert size={12} />}
                    {a.enOrden ? "En orden" : "Con novedades"}
                  </span>
                </div>

                <p className="tt-meta">{fechaLarga(a.fecha)}, {a.entrada} - {a.salida}</p>
                <p className="tt-meta">
                  <strong>Máquinas:</strong> {a.pcs.length ? a.pcs.join(", ") : "No indicadas"}
                </p>
                {a.observaciones && <p className="tt-meta"><strong>Observaciones:</strong> {a.observaciones}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </ShellDocente>
  );
}