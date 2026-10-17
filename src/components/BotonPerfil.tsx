"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { ETIQUETA_ROL, useAuth } from "@/lib/auth";

/* Reemplaza al botón "Perfil": muestra el nombre, el rol y cerrar sesión. */
export default function BotonPerfil() {
  const { perfil, salir } = useAuth();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button" className="dd-icon-btn" aria-label="Perfil"
        aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}
      >
        <User />
      </button>

      {abierto && (
        <>
          <button
            type="button" aria-label="Cerrar menú" tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default" onClick={() => setAbierto(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl p-3"
            style={{ background: "#fff", color: "var(--dd-text)", boxShadow: "var(--dd-shadow)" }}
          >
            <p className="truncate text-sm font-bold" style={{ color: "var(--dd-navy)" }}>
              {perfil?.nombre || "Usuario"}
            </p>
            <p className="text-xs" style={{ color: "var(--dd-mut)" }}>
              {perfil ? ETIQUETA_ROL[perfil.rol] : ""}
            </p>
            <button
              type="button" role="menuitem"
              className="ss-btn ss-btn--danger mt-3 w-full"
              onClick={() => { setAbierto(false); salir(); }}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}