"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";

export const CARRERAS = [
  "Software",
  "Tecnologías de la Información",
  "Sistemas de Información",
  "Telecomunicaciones",
  "Otras",
];

export const PERIODOS = [
  "2025-1",
  "2025-2",
  "2026-1",
  "2026-2",
];

export function Pantalla({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <header className="header-app flex items-center gap-3">
        <Link href="/" aria-label="Volver"><ArrowLeft /></Link>
        <h1 className="text-lg font-bold">{titulo}</h1>
      </header>
      {children}
    </main>
  );
}

export function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

export function Sel({ label, opciones }: { label: string; opciones: string[] }) {
  return (
    <Campo label={label}>
      <select className="input">{opciones.map((o) => <option key={o}>{o}</option>)}</select>
    </Campo>
  );
}

export function Chips({ leyenda, opciones }: { leyenda: string; opciones: string[] }) {
  return (
    <fieldset className="tarjeta p-3">
      <legend className="px-1 text-sm font-bold">{leyenda}</legend>
      <div className="flex flex-col gap-2">
        {opciones.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm font-normal">
            <input type="checkbox" className="h-4 w-4" /> {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Firma({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    c.width = r.width;
    c.height = r.height;
    const x = c.getContext("2d")!;
    x.lineWidth = 2;
    x.lineCap = "round";
    x.strokeStyle = "#333";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-400 p-2">
      <span className="text-sm font-medium">{label}</span>
      <canvas
        ref={ref}
        className="h-28 w-full rounded bg-white"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => {
          dibujando.current = true;
          const x = ref.current!.getContext("2d")!;
          const [a, b] = pos(e);
          x.beginPath();
          x.moveTo(a, b);
        }}
        onPointerMove={(e) => {
          if (!dibujando.current) return;
          const x = ref.current!.getContext("2d")!;
          const [a, b] = pos(e);
          x.lineTo(a, b);
          x.stroke();
        }}
        onPointerUp={() => (dibujando.current = false)}
        onPointerLeave={() => (dibujando.current = false)}
      />
      <button
        type="button"
        className="self-start rounded-full border border-gray-300 px-3 py-1 text-xs"
        onClick={() => {
          const c = ref.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
        }}
      >
        Borrar firma
      </button>
    </div>
  );
}

export function Formulario({ ok, boton, children }: { ok: string; boton: string; children: React.ReactNode }) {
  return (
    <form
      className="flex flex-col gap-4 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        alert(ok);
        e.currentTarget.reset();
      }}
    >
      {children}
      <button className="btn">{boton}</button>
    </form>
  );
}

export function Etiqueta({ estado }: { estado: string }) {
  const color: Record<string, string> = {
    Pendiente: "bg-amber-100 text-amber-800",
    Abierta: "bg-amber-100 text-amber-800",
    "En reparación": "bg-amber-100 text-amber-800",
    Rechazada: "bg-red-100 text-red-700",
    "Stock bajo": "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color[estado] ?? "bg-green-100 text-green-800"}`}>
      {estado}
    </span>
  );
}
