"use client";
import { WifiOff, ServerOff, Wifi } from "lucide-react";
import { useConexion } from "@/lib/servicios/conexion";

export default function BannerConexion() {
  const { estado, restablecida } = useConexion();

  if (estado === "ok" && !restablecida) return null;

  const info =
    estado === "sin-internet"
      ? { clase: "cx--off", icono: <WifiOff size={16} />, texto: "Sin conexión a internet. Algunas funciones no estarán disponibles." }
      : estado === "servidor-caido"
      ? { clase: "cx--server", icono: <ServerOff size={16} />, texto: "El sistema no responde en este momento. Intenta de nuevo en unos minutos." }
      : { clase: "cx--ok", icono: <Wifi size={16} />, texto: "Conexión restablecida." };

  return (
    <div className={`cx-banner ${info.clase}`} role="status" aria-live="polite">
      {info.icono}
      <span>{info.texto}</span>
    </div>
  );
}