"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import DashboardDocente from "@/components/DashboardDocente";
import DashboardEstudiante from "@/components/Dashboardestudiante";
import DashboardTecnico from "@/components/DashboardTecnico";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { perfil } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !perfil) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Image src="/app_logo.png" alt="Logo de la aplicación" width={200} height={200} priority />
        </div>
      </main>
    );
  }

  /* El rol sale de la base de datos (tabla perfiles), ya no de un selector. */
  if (perfil.rol === "docente") return <DashboardDocente />;
  if (perfil.rol === "estudiante") return <DashboardEstudiante />;
  return <DashboardTecnico />; // tecnico y admin
}