"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificaciones } from "@/lib/notificaciones";

export default function BotonCampana() {
  const { noLeidas } = useNotificaciones();
  return (
    <Link
      href="/notificaciones"
      className="dd-icon-btn relative"
      aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
    >
      <Bell />
      {noLeidas > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold leading-[18px] text-white"
          style={{ background: "var(--dd-danger)" }}
        >
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </Link>
  );
}