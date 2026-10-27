"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Modo = "entrar" | "registro";

export default function Login() {
  const { entrar, registrar } = useAuth();
  const [modo, setModo] = useState<Modo>("entrar");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cambiarModo = (m: Modo) => {
    setModo(m);
    setError("");
    setAviso("");
  };

  const validar = () => {
    if (modo === "registro" && nombre.trim().length < 3) return "Escribe tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(correo.trim())) return "Escribe un correo válido.";
    if (!clave) return "Escribe tu contraseña.";
    if (modo === "registro" && clave.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    return "";
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setAviso("");
    const v = validar();
    setError(v);
    if (v) return;

    setEnviando(true);
    const r = modo === "entrar" ? await entrar(correo, clave) : await registrar(nombre, correo, clave);
    setEnviando(false);

    if (r.error) setError(r.error);
    else if (r.confirmar)
      setAviso("Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión.");
    // Si todo sale bien, AuthGate redirige solo al inicio.
  };

  return (
    <main
      className="grid min-h-dvh place-items-center p-4"
      style={{
        background: "var(--dd-bg)",
        paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-4 flex flex-col items-center text-center">
          <Image src="/app_logo.png" alt="Laboratorios FCVT" width={110} height={110} priority />
          <h1 className="dd-title mt-2">Laboratorios FCVT</h1>
          <p className="dd-subtitle">Facultad de Ciencias de la Vida y Tecnología</p>
        </div>

        <div className="ss-card" style={{ marginTop: 0 }}>
          <div className="dd-chips" style={{ marginTop: 0 }} role="tablist" aria-label="Acceso">
            <button role="tab" aria-selected={modo === "entrar"} type="button"
              className={`dd-chip ${modo === "entrar" ? "is-active" : ""}`} onClick={() => cambiarModo("entrar")}>
              Iniciar sesión
            </button>
            <button role="tab" aria-selected={modo === "registro"} type="button"
              className={`dd-chip ${modo === "registro" ? "is-active" : ""}`} onClick={() => cambiarModo("registro")}>
              Crear cuenta
            </button>
          </div>

          <form onSubmit={enviar} noValidate className="mt-5">
            {modo === "registro" && (
              <div className="ss-group">
                <label htmlFor="nombre" className="ss-label">Nombres y apellidos</label>
                <input id="nombre" className="input" autoComplete="name" value={nombre}
                  onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Juan Pérez" />
              </div>
            )}

            <div className="ss-group">
              <label htmlFor="correo" className="ss-label">Correo</label>
              <input id="correo" className="input" type="email" inputMode="email" autoComplete="username"
                value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="usuario@uleam.edu.ec" />
            </div>

            <div className="ss-group">
              <label htmlFor="clave" className="ss-label">Contraseña</label>
              <div className="relative">
                <input id="clave" className="input" style={{ paddingRight: 44 }}
                  type={ver ? "text" : "password"}
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  value={clave} onChange={(e) => setClave(e.target.value)}
                  placeholder={modo === "registro" ? "Mínimo 8 caracteres" : "Tu contraseña"} />
                <button type="button" onClick={() => setVer((v) => !v)}
                  aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full"
                  style={{ color: "var(--dd-mut)" }}>
                  {ver ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {modo === "registro" && (
              <p className="mb-3 text-xs" style={{ color: "var(--dd-mut)" }}>
                Tu cuenta se crea como estudiante. Si eres docente o técnico, un administrador cambiará tu rol.
              </p>
            )}

            {error && <p className="ss-error mb-3" role="alert">{error}</p>}
            {aviso && (
              <p className="mb-3 text-sm font-semibold" role="status" style={{ color: "var(--dd-ok-fg)" }}>{aviso}</p>
            )}

            <button type="submit" className="ss-btn ss-btn--primary w-full" disabled={enviando}
              style={enviando ? { opacity: 0.6 } : undefined}>
              {modo === "entrar" ? <LogIn size={16} /> : <UserPlus size={16} />}
              {enviando ? "Un momento..." : modo === "entrar" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}