"use client";

import { useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, type RolApp } from "@/lib/auth";

/* Qué roles pueden abrir cada zona. Esto es comodidad de la interfaz:
   la seguridad real son las reglas RLS de la base de datos. */
const REGLAS: [string, RolApp[]][] = [
  ["/docente", ["docente"]],
  ["/estudiante", ["estudiante"]],
  ["/tecnico", ["tecnico", "admin"]],
];

function Cargando() {
  return (
    <main className="grid min-h-dvh place-items-center bg-white">
      <Image src="/app_logo.png" alt="Laboratorios FCVT" width={140} height={140} priority />
    </main>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, perfil, cargando, salir } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const ruta = pathname.replace(/\/+$/, "") || "/";
  const esLogin = ruta === "/login";
  const prohibido = perfil
    ? REGLAS.some(
        ([prefijo, roles]) =>
          (ruta === prefijo || ruta.startsWith(prefijo + "/")) && !roles.includes(perfil.rol),
      )
    : false;

  useEffect(() => {
    if (cargando) return;
    if (!session && !esLogin) router.replace("/login/");
    else if (session && perfil && (esLogin || prohibido)) router.replace("/");
  }, [cargando, session, perfil, esLogin, prohibido, router]);

  if (cargando) return <Cargando />;
  if (!session) return esLogin ? <>{children}</> : <Cargando />;

  if (!perfil) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="ss-card">
          <h1 className="ss-done__title">No pudimos cargar tu perfil</h1>
          <p className="ss-done__text">Revisa tu conexión e inténtalo de nuevo.</p>
          <div className="ss-actions ss-actions--center">
            <button type="button" className="ss-btn ss-btn--ghost" onClick={salir}>Cerrar sesión</button>
            <button type="button" className="ss-btn ss-btn--primary" onClick={() => location.reload()}>Reintentar</button>
          </div>
        </div>
      </main>
    );
  }

  if (esLogin || prohibido) return <Cargando />;
  return <>{children}</>;
}