"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardDocente from "@/components/DashboardDocente";
import DashboardEstudiante from "@/components/Dashboardestudiante";
import DashboardTecnico from "@/components/DashboardTecnico";

const ROLES = ["Docente", "Estudiante", "Técnico"] as const;
type Rol = (typeof ROLES)[number];

export default function Home() {
  const [rol, setRol] = useState<Rol>("Docente");
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Recuerda el último rol elegido, para que al volver desde otra página no regrese a "Docente"
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("rol-temporal");
      if (guardado && (ROLES as readonly string[]).includes(guardado)) setRol(guardado as Rol);
    } catch {}
  }, []);

  const cambiarRol = (r: Rol) => {
    setRol(r);
    try {
      localStorage.setItem("rol-temporal", r);
    } catch {}
  };

  if (showSplash) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/app_logo.png"
            alt="Logo de la aplicación"
            width={200}
            height={200}
            priority
          />
        </div>
      </main>
    );
  }

  const selectorRol = (
    <div className="flex gap-1 rounded-full bg-black/20 p-1">
      {ROLES.map((r) => (
        <button
          key={r}
          onClick={() => cambiarRol(r)}
          className={`flex-1 rounded-full py-1.5 text-sm ${
            r === rol ? "bg-white font-bold text-[var(--uleam)]" : "text-white"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* barra temporal para cambiar de rol mientras desarrollas */}
      <div className="home-role-switch bg-[var(--uleam)]">{selectorRol}</div>
      {rol === "Docente" && <DashboardDocente />}
      {rol === "Estudiante" && <DashboardEstudiante />}
      {rol === "Técnico" && <DashboardTecnico />}
    </>
  );
}