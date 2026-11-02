"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/servicios/supabase";
import {
  Search,
  FileSpreadsheet,
  Package,
  ClipboardList,
  CircleAlert,
  Building2,
  Download,
  ChevronLeft,
  ChevronRight,
  Barcode,
  Armchair,
  Laptop,
  Fan,
  Printer,
  Monitor,
} from "lucide-react";
import { Pantalla } from "@/components/layouts/ui";

type FilaBD = {
  id: string;
  clave_origen: string | null;
  hoja: string;
  item: string | null;
  cantidad: number | string | null;
  detalle: string | null;
  marca: string | null;
  serie: string | null;
  codigo: string | null;
  custodio_anterior: string | null;
  observacion_1: string | null;
  observacion_2: string | null;
  custodio: string | null;
  ubicacion: string | null;
  grupo: string | null;
};

type Bien = {
  clave: string;
  hoja: string;
  item: string;
  cantidad: number;
  detalle: string;
  marca: string;
  serie: string;
  codigo: string;
  custodioAnterior: string;
  observacion: string;
  observacion2: string;
  custodio: string;
  ubicacion: string;
  grupo: string;
};

type EstadoInventario = "Registrado" | "Sin código" | "Por verificar" | "De baja" | "Entregado" | "Sin observación" | "Otra observación";

type DatoEstado = { nombre: EstadoInventario; cantidad: number; color: string };

const TAMANO_PAGINA = 10;
const PALETA_ESTADOS: Record<EstadoInventario, string> = {
  Registrado: "#16a34a",
  "Sin código": "#ef4444",
  "Por verificar": "#f59e0b",
  "De baja": "#64748b",
  Entregado: "#0ea5e9",
  "Sin observación": "#8b5cf6",
  "Otra observación": "#94a3b8",
};

function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function filaABien(f: FilaBD): Bien {
  return {
    clave: f.clave_origen || f.id,
    hoja: f.hoja,
    item: f.item ?? "",
    cantidad: Number(f.cantidad ?? 0),
    detalle: f.detalle ?? "",
    marca: f.marca ?? "",
    serie: f.serie ?? "",
    codigo: f.codigo ?? "",
    custodioAnterior: f.custodio_anterior ?? "",
    observacion: f.observacion_1 ?? "",
    observacion2: f.observacion_2 ?? "",
    custodio: f.custodio ?? "",
    ubicacion: f.ubicacion ?? "",
    grupo: f.grupo ?? "",
  };
}

async function cargarBienesInformatica(): Promise<Bien[]> {
  const POR_PAGINA = 1000;
  const todos: Bien[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase
      .from("bienes_inventario")
      .select("id, clave_origen, hoja, item, cantidad, detalle, marca, serie, codigo, custodio_anterior, observacion_1, observacion_2, custodio, ubicacion, grupo")
      .eq("hoja", "INFORMATICA")
      .order("fila_excel", { ascending: true })
      .range(desde, desde + POR_PAGINA - 1);
    if (error) throw error;
    const filas = (data ?? []) as FilaBD[];
    todos.push(...filas.map(filaABien));
    if (filas.length < POR_PAGINA) break;
  }
  return todos;
}

function textoEstado(bien: Bien): string {
  return normalizar(`${bien.observacion} ${bien.observacion2}`);
}

function sinCodigo(bien: Bien): boolean {
  const estado = textoEstado(bien);
  return !bien.codigo.trim() ||
    estado.includes("NO TIENE CODIGO") ||
    estado.includes("IMPRIMIR CODIGO") ||
    estado.includes("CAMBIAR ESTE CODIGO") ||
    estado.includes("CAMBIAR LOS CODIGOS");
}

function porVerificar(bien: Bien): boolean {
  const estado = textoEstado(bien);
  return estado.includes("POR VERIFICAR") || estado.includes("REVISAR");
}

function dadoDeBaja(bien: Bien): boolean {
  return textoEstado(bien).includes("BAJA");
}

function responsable(bien: Bien): string {
  return bien.custodio || bien.custodioAnterior || "Sin responsable registrado";
}

function estadoBien(bien: Bien): EstadoInventario {
  const estado = textoEstado(bien);
  if (estado.includes("BAJA")) return "De baja";
  if (estado.includes("POR VERIFICAR") || estado.includes("REVISAR")) return "Por verificar";
  if (sinCodigo(bien)) return "Sin código";
  if (estado.includes("ENTREGADO")) return "Entregado";
  if (estado.includes("OK") || estado.includes("EQUIPO NUEVO")) return "Registrado";
  if (!estado.trim()) return "Sin observación";
  return "Otra observación";
}

function numeroEC(valor: number): string {
  return valor.toLocaleString("es-EC", { maximumFractionDigits: 0 });
}

function exportarCSV(bienes: Bien[], hoja: string) {
  const columnas: [string, (b: Bien) => string | number][] = [
    ["ITEM", (b) => b.item],
    ["CANTIDAD", (b) => b.cantidad],
    ["DETALLE", (b) => b.detalle],
    ["MARCA", (b) => b.marca],
    ["SERIE", (b) => b.serie],
    ["CODIGO", (b) => b.codigo],
    ["CUSTODIO ANTERIOR", (b) => b.custodioAnterior],
    ["OBSERVACION 1", (b) => b.observacion],
    ["OBSERVACION 2", (b) => b.observacion2],
    ["CUSTODIO", (b) => b.custodio],
    ["UBICACION", (b) => b.ubicacion],
    ["AREA / GRUPO", (b) => b.grupo],
  ];
  const escapar = (valor: string | number) => `"${String(valor ?? "").replace(/"/g, '""')}"`;
  const contenido = [
    columnas.map(([titulo]) => escapar(titulo)).join(";"),
    ...bienes.map((bien) => columnas.map(([, obtener]) => escapar(obtener(bien))).join(";")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `inventario-${normalizar(hoja).toLowerCase().replace(/\s+/g, "-")}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}

function IconoKPI({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${tone}17`, color: tone }}>
      {children}
    </div>
  );
}

function Donut({ datos, total }: { datos: DatoEstado[]; total: number }) {
  const radio = 43;
  const circunferencia = 2 * Math.PI * radio;
  let acumulado = 0;
  const segmentos = datos.map((dato) => {
    const longitud = total > 0 ? (dato.cantidad / total) * circunferencia : 0;
    const segmento = { ...dato, longitud, desplazamiento: acumulado };
    acumulado += longitud;
    return segmento;
  });

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full" role="img" aria-label="Gráfico circular de estado del inventario">
        <circle cx="55" cy="55" r={radio} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <g transform="rotate(-90 55 55)">
          {segmentos.map((segmento) => segmento.longitud > 0 ? (
            <circle
              key={segmento.nombre}
              cx="55"
              cy="55"
              r={radio}
              fill="none"
              stroke={segmento.color}
              strokeWidth="12"
              strokeDasharray={`${segmento.longitud} ${circunferencia - segmento.longitud}`}
              strokeDashoffset={-segmento.desplazamiento}
            />
          ) : null)}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black tracking-tight text-slate-800">{numeroEC(total)}</span>
        <span className="text-[11px] font-medium text-slate-500">registros</span>
      </div>
    </div>
  );
}

function EtiquetaEstado({ estado }: { estado: EstadoInventario }) {
  const fondos: Record<EstadoInventario, string> = {
    Registrado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "Sin código": "bg-rose-50 text-rose-700 ring-rose-200",
    "Por verificar": "bg-amber-50 text-amber-800 ring-amber-200",
    "De baja": "bg-slate-100 text-slate-700 ring-slate-200",
    Entregado: "bg-sky-50 text-sky-700 ring-sky-200",
    "Sin observación": "bg-violet-50 text-violet-700 ring-violet-200",
    "Otra observación": "bg-gray-100 text-gray-700 ring-gray-200",
  };
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${fondos[estado]}`}>{estado}</span>;
}

function VisualBien({ bien }: { bien: Bien }) {
  const detalle = normalizar(bien.detalle);
  let Icono = Package;
  let categoria = "Bien institucional";
  let tonos = { fondo: "#f1f5f9", tinta: "#475569", halo: "rgba(100,116,139,.12)" };

  if (/SILLA|SILLON|ESCRITORIO|MESA|CREDENZA|ARCHIVADOR|ESTANTERIA|MUEBLE/.test(detalle)) {
    Icono = Armchair;
    categoria = "Mobiliario";
    tonos = { fondo: "#fff7ed", tinta: "#c2410c", halo: "rgba(234,88,12,.12)" };
  } else if (/LAPTOP|PORTATIL|COMPUTADOR|NOTEBOOK|SERVIDOR|CPU/.test(detalle)) {
    Icono = Laptop;
    categoria = "Equipo informático";
    tonos = { fondo: "#eff6ff", tinta: "#2563eb", halo: "rgba(37,99,235,.12)" };
  } else if (/AIRE ACONDICIONADO|ACONDICIONADOR|VENTILADOR|EXTRACTOR/.test(detalle)) {
    Icono = Fan;
    categoria = "Climatización";
    tonos = { fondo: "#ecfeff", tinta: "#0e7490", halo: "rgba(8,145,178,.13)" };
  } else if (/IMPRESORA|SCANNER|ESCANER|COPIADORA/.test(detalle)) {
    Icono = Printer;
    categoria = "Impresión y documentos";
    tonos = { fondo: "#f5f3ff", tinta: "#7c3aed", halo: "rgba(124,58,237,.12)" };
  } else if (/MONITOR|TELEVISOR|PANTALLA|PROYECTOR/.test(detalle)) {
    Icono = Monitor;
    categoria = "Pantallas y visualización";
    tonos = { fondo: "#fdf2f8", tinta: "#be185d", halo: "rgba(190,24,93,.12)" };
  }

  return (
    <div className="relative flex h-[132px] items-center justify-between overflow-hidden rounded-2xl px-4" style={{ background: `linear-gradient(135deg, ${tonos.fondo} 0%, #ffffff 100%)` }}>
      <div className="absolute -right-5 -top-8 h-36 w-36 rounded-full" style={{ background: tonos.halo }} />
      <div className="absolute -bottom-12 right-20 h-24 w-24 rounded-full" style={{ background: tonos.halo }} />
      <div className="relative z-10 flex min-w-0 items-center gap-3">
        <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl border border-white/80 shadow-sm" style={{ background: "rgba(255,255,255,.82)", color: tonos.tinta }}>
          <Icono size={39} strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.1em]" style={{ background: tonos.halo, color: tonos.tinta }}>{categoria}</span>
          <p className="mt-2 text-xs font-semibold text-slate-500">Registro patrimonial</p>
          <p className="mt-0.5 text-xl font-black tracking-tight text-slate-800">Ítem {bien.item}</p>
        </div>
      </div>
      <div className="relative z-10 ml-2 flex shrink-0 flex-col items-end">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cantidad</span>
        <span className="mt-1 text-3xl font-black tabular-nums" style={{ color: tonos.tinta }}>{numeroEC(bien.cantidad)}</span>
        <span className="text-[10px] font-semibold text-slate-400">unidad(es)</span>
      </div>
    </div>
  );
}

export default function Inventario() {
  const [bienes, setBienes] = useState<Bien[]>([]);
  const [cargando, setCargando] = useState(true);
  const hojaSeleccionada = "INFORMATICA";
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState("");
  const [pagina, setPagina] = useState(1);
  const [modoVista, setModoVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const [bienExpandido, setBienExpandido] = useState<string | null>(null);

  useEffect(() => {
    cargarBienesInformatica()
      .then(setBienes)
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar el inventario."))
      .finally(() => setCargando(false));
  }, []);

  const resumen = useMemo(() => {
    const conteo = new Map<EstadoInventario, number>();
    const responsableConteo = new Map<string, number>();
    for (const bien of bienes) {
      const estado = estadoBien(bien);
      conteo.set(estado, (conteo.get(estado) ?? 0) + 1);
      const persona = responsable(bien);
      responsableConteo.set(persona, (responsableConteo.get(persona) ?? 0) + 1);
    }

    const ordenEstados: EstadoInventario[] = ["Registrado", "Sin código", "Por verificar", "De baja", "Entregado", "Sin observación", "Otra observación"];
    const estados = ordenEstados
      .map((nombre) => ({ nombre, cantidad: conteo.get(nombre) ?? 0, color: PALETA_ESTADOS[nombre] }))
      .filter((dato) => dato.cantidad > 0);
    const responsablesTop = [...responsableConteo.entries()]
      .filter(([nombre]) => nombre !== "Sin responsable registrado")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    return {
      totalRegistros: bienes.length,
      totalUnidades: bienes.reduce((total, bien) => total + bien.cantidad, 0),
      sinCodigo: bienes.filter(sinCodigo).length,
      porVerificar: bienes.filter(porVerificar).length,
      deBaja: bienes.filter(dadoDeBaja).length,
      requierenAtencion: bienes.filter((b) => sinCodigo(b) || porVerificar(b) || dadoDeBaja(b)).length,
      conCodigo: bienes.filter((b) => !sinCodigo(b)).length,
      estados,
      responsablesTop,
    };
  }, [bienes]);

  const bienesFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);
    return bienes.filter((bien) => {
      const textoBusqueda = normalizar([
        bien.item, bien.detalle, bien.marca, bien.serie, bien.codigo,
        bien.custodioAnterior, bien.observacion, bien.observacion2,
        bien.custodio, bien.ubicacion, bien.grupo,
      ].join(" "));
      const coincideBusqueda = textoBusqueda.includes(termino);
      const coincideFiltro = filtro === "todos" ||
        (filtro === "sin-codigo" && sinCodigo(bien)) ||
        (filtro === "verificar" && porVerificar(bien)) ||
        (filtro === "baja" && dadoDeBaja(bien));
      return coincideBusqueda && coincideFiltro;
    });
  }, [bienes, busqueda, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(bienesFiltrados.length / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const bienesPagina = bienesFiltrados.slice((paginaSegura - 1) * TAMANO_PAGINA, paginaSegura * TAMANO_PAGINA);
  const porcentajeConCodigo = resumen.totalRegistros ? Math.round((resumen.conCodigo / resumen.totalRegistros) * 100) : 0;
  const maxResponsables = Math.max(1, ...resumen.responsablesTop.map((r) => r.cantidad));

  function limpiarFiltros() {
    setBusqueda("");
    setFiltro("todos");
    setPagina(1);
  }

  return (
    <Pantalla titulo="Inventario de bienes">
      <div className="min-h-[calc(100vh-55px)] bg-slate-50/80">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
          {/* Encabezado principal */}
          <section className="relative isolate overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="absolute inset-y-0 right-0 -z-10 w-1/2 opacity-70" style={{ background: "radial-gradient(circle at 80% 20%, rgba(255,53,71,.13), transparent 47%), radial-gradient(circle at 100% 100%, rgba(255,53,71,.08), transparent 48%)" }} />
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[.13em] text-rose-700 ring-1 ring-inset ring-rose-100">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Control patrimonial
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Panel de inventario</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                  Consulta, revisa y localiza los bienes físicos de la facultad desde un único panel visual.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5"><Building2 size={14} /> Ciencias Informáticas</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5"><FileSpreadsheet size={14} className="shrink-0 text-emerald-600" /> Base de datos · Supabase</span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:flex-col">
                {bienes.length > 0 && (
                  <button type="button" onClick={() => exportarCSV(bienesFiltrados, hojaSeleccionada)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <Download size={17} /> Exportar vista CSV
                  </button>
                )}
              </div>
            </div>
            {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
          </section>

          {/* Indicadores principales */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3"><IconoKPI tone="#475569"><ClipboardList size={21} /></IconoKPI><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Registros</span></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Bienes registrados</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{numeroEC(resumen.totalRegistros)}</p>
              <p className="mt-2 text-xs text-slate-400">Filas reconocidas en la hoja activa</p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3"><IconoKPI tone="#0f766e"><Package size={21} /></IconoKPI><span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-teal-700">Unidades</span></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Cantidad total</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{numeroEC(resumen.totalUnidades)}</p>
              <p className="mt-2 text-xs text-slate-400">Suma de la columna CANT</p>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3"><IconoKPI tone="#dc2626"><Barcode size={21} /></IconoKPI><span className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">Patrimonio</span></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Sin código / por revisar</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{numeroEC(resumen.sinCodigo)}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-rose-500" style={{ width: `${resumen.totalRegistros ? Math.min(100, (resumen.sinCodigo / resumen.totalRegistros) * 100) : 0}%` }} /></div>
            </article>
            <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between gap-3"><IconoKPI tone="#16a34a"><ClipboardList size={21} /></IconoKPI><span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Validados</span></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Con código oficial</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{porcentajeConCodigo}%</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${porcentajeConCodigo}%` }} /></div>
            </article>
          </section>

          {/* Sección de gráficos y analíticas */}
          {bienes.length > 0 && (
            <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Estado de los bienes</h3>
                  <p className="mt-1 text-xs text-slate-500">Clasificación según observaciones y códigos.</p>
                </div>
                <div className="my-5 flex flex-col items-center justify-center gap-6 sm:flex-row">
                  <Donut datos={resumen.estados} total={resumen.totalRegistros} />
                  <div className="flex flex-col gap-2 text-xs">
                    {resumen.estados.map((estado) => (
                      <div key={estado.nombre} className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: estado.color }} />
                        <span className="font-semibold text-slate-700">{estado.nombre}</span>
                        <span className="ml-auto font-bold tabular-nums text-slate-900">{numeroEC(estado.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Responsables con mayor asignación</h3>
                  <p className="mt-1 text-xs text-slate-500">Custodios o custodios anteriores con más registros a su cargo.</p>
                </div>
                <div className="my-5 flex flex-col gap-3.5">
                  {resumen.responsablesTop.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay responsables registrados.</p>
                  ) : (
                    resumen.responsablesTop.map((resp, i) => {
                      const porcentaje = Math.round((resp.cantidad / maxResponsables) * 100);
                      return (
                        <div key={resp.nombre} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800">{i + 1}. {resp.nombre}</span>
                            <span className="font-extrabold tabular-nums text-slate-900">{numeroEC(resp.cantidad)} bienes</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${porcentaje}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Listado y Buscador */}
          <section className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
                  placeholder="Buscar por detalle, marca, serie, código, custodio o ubicación..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setFiltro("todos"); setPagina(1); }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${filtro === "todos" ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
                >
                  Todos ({resumen.totalRegistros})
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltro("sin-codigo"); setPagina(1); }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${filtro === "sin-codigo" ? "bg-rose-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
                >
                  Sin código ({resumen.sinCodigo})
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltro("verificar"); setPagina(1); }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${filtro === "verificar" ? "bg-amber-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
                >
                  Por verificar ({resumen.porVerificar})
                </button>
                <button
                  type="button"
                  onClick={() => { setFiltro("baja"); setPagina(1); }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${filtro === "baja" ? "bg-slate-700 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
                >
                  De baja ({resumen.deBaja})
                </button>

                <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setModoVista("tarjetas")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${modoVista === "tarjetas" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Tarjetas
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoVista("tabla")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${modoVista === "tabla" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Tabla
                  </button>
                </div>
              </div>
            </div>

            {/* Renderizado de bienes o estado de carga */}
            {cargando ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">Cargando inventario…</div>
            ) : bienes.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">No se encontraron registros en la base de datos.</div>
            ) : bienesFiltrados.length === 0 ? (
              <div className="px-5 py-14 text-center text-sm text-slate-500">Ningún bien coincide con los filtros o término de búsqueda.</div>
            ) : modoVista === "tarjetas" ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {bienesPagina.map((bien) => {
                  const expandido = bienExpandido === bien.clave;
                  const estado = estadoBien(bien);
                  return (
                    <div key={bien.clave} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow">
                      <VisualBien bien={bien} />
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div className="flex items-center gap-2">
                          <EtiquetaEstado estado={estado} />
                          <span className="font-bold text-slate-700">Código: {bien.codigo || "Sin código"}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBienExpandido(expandido ? null : bien.clave)}
                          className="font-bold text-rose-600 hover:text-rose-700"
                        >
                          {expandido ? "Ocultar detalle" : "Ver detalle completo"}
                        </button>
                      </div>
                      {expandido && (
                        <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
                          <p><strong className="text-slate-800">Detalle:</strong> {bien.detalle || "—"}</p>
                          <p><strong className="text-slate-800">Marca:</strong> {bien.marca || "—"} | <strong className="text-slate-800">Serie:</strong> {bien.serie || "—"}</p>
                          <p><strong className="text-slate-800">Custodio:</strong> {responsable(bien)}</p>
                          <p><strong className="text-slate-800">Ubicación:</strong> {bien.ubicacion || "—"}</p>
                          {bien.observacion && <p><strong className="text-slate-800">Observación 1:</strong> {bien.observacion}</p>}
                          {bien.observacion2 && <p><strong className="text-slate-800">Observación 2:</strong> {bien.observacion2}</p>}
                          {bien.grupo && <p><strong className="text-slate-800">Grupo / Área:</strong> {bien.grupo}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Ítem</th>
                      <th className="px-4 py-3">Cant.</th>
                      <th className="px-4 py-3">Detalle</th>
                      <th className="px-4 py-3">Marca / Serie</th>
                      <th className="px-4 py-3">Código</th>
                      <th className="px-4 py-3">Custodio</th>
                      <th className="px-4 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bienesPagina.map((bien) => (
                      <tr key={bien.clave} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-900">{bien.item}</td>
                        <td className="px-4 py-3 tabular-nums font-semibold">{bien.cantidad}</td>
                        <td className="px-4 py-3 max-w-xs truncate" title={bien.detalle}>{bien.detalle}</td>
                        <td className="px-4 py-3">{bien.marca} {bien.serie ? `(${bien.serie})` : ""}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">{bien.codigo || "—"}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate" title={responsable(bien)}>{responsable(bien)}</td>
                        <td className="px-4 py-3"><EtiquetaEstado estado={estadoBien(bien)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                <span className="text-slate-500">Mostrando página <strong className="text-slate-800">{paginaSegura}</strong> de <strong className="text-slate-800">{totalPaginas}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaSegura === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaSegura === totalPaginas}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </Pantalla>
  );
}