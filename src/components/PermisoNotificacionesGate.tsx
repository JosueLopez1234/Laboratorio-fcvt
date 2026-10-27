"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import {
  abrirAjustes, esApp, estadoPermiso, pedirPermiso, type PermisoAlertas,
} from "@/lib/alertasLocales";

/* Bloquea la app (solo en el APK) hasta que las notificaciones estén activas.
   Vuelve a comprobar cada vez que la app regresa al primer plano, así que si
   el usuario las apaga desde los ajustes del teléfono, la pantalla reaparece. */
export default function PermisoNotificacionesGate({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState(false);
  const [permiso, setPermiso] = useState<PermisoAlertas | null>(null);
  const [intentado, setIntentado] = useState(false);

  const revisar = useCallback(async () => {
    if (!esApp()) return;
    setPermiso(await estadoPermiso());
  }, []);

  useEffect(() => {
    setApp(esApp());
    revisar();
    const alVolver = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", revisar);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", revisar);
    };
  }, [revisar]);

  const activar = async () => {
    // Primera vez: muestra el cuadro del sistema. Si ya fue rechazado, lleva a los ajustes.
    if (permiso === "pendiente" && !intentado) {
      setIntentado(true);
      setPermiso(await pedirPermiso());
      return;
    }
    await abrirAjustes();
  };

  const bloquear = app && permiso !== null && permiso !== "concedido";

  return (
    <>
      {children}
      {bloquear && (
        <div
          role="alertdialog" aria-modal="true" aria-labelledby="gate-titulo"
          className="fixed inset-0 z-[1000] grid place-items-center p-6"
          style={{ background: "var(--dd-bg)", paddingTop: "calc(24px + env(safe-area-inset-top, 0px))" }}
        >
          <div className="ss-card ss-done" style={{ marginTop: 0 }}>
            <span className="ss-done__icon" style={{ background: "var(--dd-blue-soft)", color: "var(--dd-blue)" }}>
              <BellRing size={30} />
            </span>
            <h1 id="gate-titulo" className="ss-done__title">Activa las notificaciones</h1>
            <p className="ss-done__text">
              La app necesita avisarte cuando una reserva, solicitud o falla cambie de estado.
              {permiso === "denegado" || intentado
                ? " Entra a Ajustes, abre Notificaciones y actívalas; luego regresa a la app."
                : ""}
            </p>
            <div className="ss-actions ss-actions--center">
              <button type="button" className="ss-btn ss-btn--primary" onClick={activar}>
                {permiso === "pendiente" && !intentado ? "Activar notificaciones" : "Abrir ajustes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}