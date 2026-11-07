
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  Monitor,
  Eye,
  TriangleAlert,
  Clock,
  Check,
  Play,
  X,
  CalendarX,
  RefreshCw,
} from "lucide-react";

import {
  cargarMisReservas,
  cancelarReserva,
  mensajeError,
  type ReservaUI,
  type EstadoUI,
} from "@/lib/reservas";

import DetalleModal from "@/components/DetalleModal";

type Paso = "done" | "current" | "todo";

const PASOS: Record<EstadoUI, Paso[]> = {
  pendiente: ["done", "done", "current", "todo"],
  aprobado: ["done", "done", "done", "todo"],
  "en-curso": ["done", "done", "done", "current"],
  finalizado: ["done", "done", "done", "done"],
  rechazado: ["done", "done", "current", "todo"],
  cancelado: ["done", "todo", "todo", "todo"],
};

const BADGE: Record<
  EstadoUI,
  { t: string; i: React.ReactNode }
> = {
  pendiente: {
    t: "Pendiente",
    i: <Clock size={12} />,
  },
  aprobado: {
    t: "Aprobado",
    i: <Check size={12} />,
  },
  "en-curso": {
    t: "En curso",
    i: <Play size={12} />,
  },
  finalizado: {
    t: "Finalizado",
    i: <Check size={12} />,
  },
  rechazado: {
    t: "Rechazada",
    i: <X size={12} />,
  },
  cancelado: {
    t: "Cancelada",
    i: <X size={12} />,
  },
};

type Filtro = "todas" | EstadoUI;

const FILTROS: {
  id: Filtro;
  t: string;
}[] = [
  { id: "todas", t: "Todas" },
  { id: "pendiente", t: "Pendientes" },
  { id: "aprobado", t: "Aprobadas" },
  { id: "en-curso", t: "En curso" },
  { id: "finalizado", t: "Finalizadas" },
  { id: "rechazado", t: "Rechazadas" },
  { id: "cancelado", t: "Canceladas" },
];

type TarjetaProps = {
  r: ReservaUI;
  onCancelar: (id: string) => void;
  onDetalle: (r: ReservaUI) => void;
  rutaFalla: string;
};

function Tarjeta({
  r,
  onCancelar,
  onDetalle,
  rutaFalla,
}: TarjetaProps) {
  const pasos = PASOS[r.estado];

  const etiquetas = [
    "Solicitud",
    "Revisión",
    "Aprobación",
    "Uso",
  ];

  const meta = [
    r.fecha,
    r.hora,
    `${r.estudiantes} estudiantes`,
    `Solicitante\n${r.solicitante}`,
  ];

  return (
    <article
      className="dd-card"
      data-estado={r.estado}
    >
      <div className="dd-card__top">
        <span className="dd-card__avatar">
          <Monitor size={20} />
        </span>

        <div className="dd-card__info">
          <h3 className="dd-card__name">
            {r.lab}
          </h3>

          <p className="dd-card__place">
            Facultad de Ciencias de la Vida y Tecnología
          </p>
        </div>

        <span className="dd-badge">
          {BADGE[r.estado].i}
          {BADGE[r.estado].t}
        </span>
      </div>

      {/* SEGUIMIENTO DE LA RESERVA */}
      <div className="dd-steps">
        {etiquetas.map((etiqueta, k) => (
          <div
            key={etiqueta}
            className={`dd-step is-${pasos[k]}`}
          >
            <span
              className="dd-step__meta"
              style={{ whiteSpace: "pre-line" }}
            >
              {meta[k]}
            </span>

            <span className="dd-step__dot">
              {pasos[k] === "done" && <Check />}
            </span>

            <span className="dd-step__label">
              {etiqueta}
            </span>
          </div>
        ))}
      </div>

      {/* MOTIVO DE RECHAZO */}
      {r.estado === "rechazado" && r.motivo && (
        <p className="tt-meta">
          Motivo del rechazo: {r.motivo}
        </p>
      )}

      {/* ACCIONES */}
      <div className="dd-card__actions">
        <button
          type="button"
          className="dd-btn dd-btn--ghost"
          onClick={() => onDetalle(r)}
        >
          <Eye />
          Ver detalles
        </button>

        {r.estado === "pendiente" && (
          <button
            type="button"
            className="dd-btn dd-btn--danger"
            onClick={() => onCancelar(r.id)}
          >
            <X />
            Cancelar reserva
          </button>
        )}

        {r.estado === "en-curso" && (
          <Link
            href={rutaFalla}
            className="dd-btn dd-btn--primary"
          >
            <TriangleAlert />
            Reportar inconveniente
          </Link>
        )}
      </div>
    </article>
  );
}

export default function MisReservas({
  rutaFalla = "/docente/falla",
}: {
  rutaFalla?: string;
}) {
  const [items, setItems] = useState<ReservaUI[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("todas");

  const [detalle, setDetalle] =
    useState<ReservaUI | null>(null);

  // Cargar reservas del usuario autenticado.
  const cargar = useCallback(async () => {
    setError("");

    try {
      const resultado = await cargarMisReservas();
      setItems(resultado);
    } catch (e) {
      setError(mensajeError(e));
    }
  }, []);

  useEffect(() => {
    cargar().finally(() => setCargando(false));
  }, [cargar]);

  // Actualizar manualmente.
  const actualizar = async () => {
    setActualizando(true);

    await cargar();

    setActualizando(false);
  };

  // Cancelar una solicitud pendiente.
  const cancelar = async (id: string) => {
    const confirmado = window.confirm(
      "¿Estás seguro de que deseas cancelar esta solicitud?"
    );

    if (!confirmado) return;

    setError("");

    try {
      await cancelarReserva(id);

      setItems((anteriores) =>
        anteriores.map((r) =>
          r.id === id
            ? { ...r, estado: "cancelado" }
            : r
        )
      );
    } catch (e) {
      setError(mensajeError(e));
    }
  };

  const contar = (f: Filtro) =>
    f === "todas"
      ? items.length
      : items.filter((i) => i.estado === f).length;

  const visibles =
    filtro === "todas"
      ? items
      : items.filter((i) => i.estado === filtro);

  const filasDetalle = (
    r: ReservaUI
  ): [string, string][] => {
    const filas: [string, string][] = [
      ["Laboratorio", r.lab],
      ["Fecha", r.fecha],
      ["Horario", r.hora],
      ["Estudiantes", String(r.estudiantes)],
      ["Solicitante", r.solicitante],
      ["Estado", BADGE[r.estado].t],
    ];

    if (r.estado === "rechazado" && r.motivo) {
      filas.push(["Motivo del rechazo", r.motivo]);
    }

    return filas;
  };

  return (
    <>
      {/* ENCABEZADO Y ACTUALIZACIÓN */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="dd-section-sub">
          Consulta el estado de tus solicitudes.
        </p>

        <button
          type="button"
          className="dd-btn dd-btn--ghost"
          onClick={actualizar}
          disabled={actualizando || cargando}
        >
          <RefreshCw
            className={actualizando ? "animate-spin" : ""}
          />

          {actualizando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* RESUMEN */}
      <div className="dd-chips" role="tablist" aria-label="Filtrar reservas">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filtro === f.id}
            className={`dd-chip ${
              filtro === f.id ? "is-active" : ""
            }`}
            onClick={() => setFiltro(f.id)}
          >
            {f.t} ({contar(f.id)})
          </button>
        ))}
      </div>

      {error && (
        <p className="ss-error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="dd-section-sub" style={{ marginTop: 14 }}>
          Cargando tus reservas...
        </p>
      ) : visibles.length === 0 ? (
        <div className="dd-empty" role="status">
          <span className="dd-empty__icon">
            <CalendarX size={28} />
          </span>

          <p className="dd-empty__title">
            Aún no hay reservas
          </p>

          <p className="dd-empty__text">
            {items.length > 0
              ? "No tienes solicitudes con este estado."
              : "Cuando solicites un laboratorio, aparecerá aquí."}
          </p>

          {items.length === 0 && (
            <Link
              href="/estudiante/solicitar"
              className="ss-btn ss-btn--primary mt-4"
            >
              Solicitar laboratorio
            </Link>
          )}
        </div>
      ) : (
        <div className="dd-list">
          {visibles.map((r) => (
            <Tarjeta
              key={r.id}
              r={r}
              onCancelar={cancelar}
              onDetalle={setDetalle}
              rutaFalla={rutaFalla}
            />
          ))}
        </div>
      )}

      {/* MODAL DE INFORMACIÓN */}
      {detalle && (
        <DetalleModal
          titulo={detalle.lab}
          filas={filasDetalle(detalle)}
          onClose={() => setDetalle(null)}
        />
      )}
    </>
  );
}