"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Search,
  Package,
  ClipboardList,
  CircleAlert,
  Building2,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  MapPin,
  X,
  ChartNoAxesCombined,
  Barcode,
  RefreshCw,
  Grid2X2,
  List,
  ChevronDown,
  Laptop,
  Armchair,
  Fan,
  Printer,
  Monitor,
  Eye,
  Tag,
  Database,
  LoaderCircle,
} from "lucide-react";
import { Pantalla } from "@/components/ui";
import { supabase } from "@/lib/supabase";

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

type BienDB = {
  id: string;
  clave_origen: string;
  hoja: string;
  facultad: string;
  fila_excel: number;
  item: string | number;
  cantidad: string | number;
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

const HOJAS_INVENTARIO = [
  { value: "INFORMATICA", label: "Informática", facultad: "Ciencias Informáticas" },
  { value: "AGROPECUARIA", label: "Agropecuaria", facultad: "Ciencias Agropecuarias" },
  { value: "BIOLOGIA PESQUERA", label: "Biología Pesquera", facultad: "Biología Pesquera" },
] as const;

function convertirFilaDB(row: BienDB): Bien {
  return {
    clave: row.clave_origen || row.id,
    hoja: row.hoja,
    item: String(row.item ?? ""),
    cantidad: Number(row.cantidad ?? 0),
    detalle: row.detalle ?? "",
    marca: row.marca ?? "",
    serie: row.serie ?? "",
    codigo: row.codigo ?? "",
    custodioAnterior: row.custodio_anterior ?? "",
    observacion: row.observacion_1 ?? "",
    observacion2: row.observacion_2 ?? "",
    custodio: row.custodio ?? "",
    ubicacion: row.ubicacion ?? "",
    grupo: row.grupo ?? "",
  };
}

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
  } else if (/LAPTOP|PORTATIL|COMPUTADOR|NOTEBOOK|SERVIDOR|CPU/.test(detalle)) {
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
  const [registros, setRegistros] = useState<Bien[]>([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState<string>("INFORMATICA");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [pagina, setPagina] = useState(1);
  const [modoVista, setModoVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const [bienExpandido, setBienExpandido] = useState<string | null>(null);

  const cargarInventario = useCallback(async () => {
    setActualizando(true);
    setError("");
    try {
      // Deja que el cliente recupere la sesión guardada antes de consultar RLS.
      await supabase.auth.getSession();
      const filasDB: BienDB[] = [];
      const tamanoLote = 1000;

      // Supabase/PostgREST limita habitualmente las respuestas. Descargamos
      // por lotes para no perder registros de las tres facultades.
      for (let desde = 0; ; desde += tamanoLote) {
        const { data, error: errorConsulta } = await supabase
          .from("bienes_inventario")
          .select("id, clave_origen, hoja, facultad, fila_excel, item, cantidad, detalle, marca, serie, codigo, custodio_anterior, observacion_1, observacion_2, custodio, ubicacion, grupo")
          .order("hoja", { ascending: true })
          .order("fila_excel", { ascending: true })
          .range(desde, desde + tamanoLote - 1);

        if (errorConsulta) throw errorConsulta;
        const lote = (data ?? []) as unknown as BienDB[];
        filasDB.push(...lote);
        if (lote.length < tamanoLote) break;
      }

      setRegistros(filasDB.map(convertirFilaDB));
      setUltimaActualizacion(new Date());
    } catch (errorConsulta: unknown) {
      console.error("Error consultando bienes en Supabase:", errorConsulta);
      const detalle = errorConsulta instanceof Error ? errorConsulta.message : "Error de conexión desconocido";
      setError(`No se pudo consultar el inventario en Supabase. Verifica que ejecutaste el SQL de creación, importaste el Excel y que tu sesión tiene permiso de lectura. Detalle: ${detalle}`);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    void cargarInventario();
  }, [cargarInventario]);

  const nombresHojas = HOJAS_INVENTARIO.map((hoja) => hoja.value);
  const bienes = useMemo(
    () => registros.filter((bien) => bien.hoja === hojaSeleccionada),
    [registros, hojaSeleccionada]
  );

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
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5"><Building2 size={14} /> {hojaSeleccionada === "INFORMATICA" ? "Ciencias Informáticas" : hojaSeleccionada === "AGROPECUARIA" ? "Ciencias Agropecuarias" : hojaSeleccionada === "BIOLOGIA PESQUERA" ? "Biología Pesquera" : hojaSeleccionada}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5 text-emerald-800"><Database size={14} className="shrink-0" /> Datos guardados en Supabase</span>
                  <span className="rounded-lg border border-slate-200 bg-white/90 px-2.5 py-1.5">{ultimaActualizacion ? `Actualizado ${ultimaActualizacion.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}` : "Conectando a la base de datos…"}</span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:flex-col">
                <button type="button" onClick={() => void cargarInventario()} disabled={actualizando} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#ff3547] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_18px_rgba(255,53,71,.22)] transition hover:bg-[#e72d3e] disabled:cursor-not-allowed disabled:opacity-70">
                  {actualizando ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                  {actualizando ? "Actualizando…" : "Actualizar datos"}
                </button>
                {registros.length > 0 && (
                  <button type="button" onClick={() => exportarCSV(bienesFiltrados, hojaSeleccionada)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                    <Download size={17} /> Exportar vista CSV
                  </button>
                )}
              </div>
            </div>
            {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><CircleAlert size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
          </section>

          {/* Selector de hoja */}
          {nombresHojas.length > 0 && (
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Área del inventario</h3>
                <p className="mt-1 text-xs text-slate-500">Selecciona la hoja que deseas consultar.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {nombresHojas.map((nombre) => {
                  const activo = nombre === hojaSeleccionada;
                  return (
                    <button key={nombre} type="button" onClick={() => { setHojaSeleccionada(nombre); limpiarFiltros(); }} className={`rounded-xl px-3.5 py-2.5 text-xs font-bold transition sm:text-sm ${activo ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
                      {nombre === "INFORMATICA" ? "Informática" : nombre === "AGROPECUARIA" ? "Agropecuaria" : nombre === "BIOLOGIA PESQUERA" ? "Biología Pesquera" : nombre}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

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
              <div className="flex items-start justify-between gap-3"><IconoKPI tone="#d97706"><CircleAlert size={21} /></IconoKPI><span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">Atención</span></div>
              <p className="mt-4 text-sm font-semibold text-slate-500">Registros por revisar</p>
              <p className="mt-1 text-3xl font-black tracking-tight text-slate-900">{numeroEC(resumen.requierenAtencion)}</p>
              <p className="mt-2 text-xs text-slate-400">Sin código, por verificar o de baja</p>
            </article>
          </section>

          {/* Gráficos */}
          {bienes.length > 0 && !cargando && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
              <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-extrabold text-slate-900">Estado documental</h3><p className="mt-1 text-xs text-slate-500">Clasificación estimada a partir del código y las observaciones registradas.</p></div>
                  <div className="rounded-xl bg-slate-50 p-2 text-slate-500"><ChartNoAxesCombined size={19} /></div>
                </div>
                <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <Donut datos={resumen.estados} total={resumen.totalRegistros} />
                  <div className="grid w-full grid-cols-1 gap-2 sm:flex-1">
                    {resumen.estados.map((dato) => (
                      <div key={dato.nombre} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dato.color }} />
                        <span className="min-w-0 flex-1 text-xs font-semibold text-slate-600">{dato.nombre}</span>
                        <span className="text-sm font-extrabold tabular-nums text-slate-900">{numeroEC(dato.cantidad)}</span>
                        <span className="w-10 text-right text-[10px] text-slate-400">{resumen.totalRegistros ? Math.round((dato.cantidad / resumen.totalRegistros) * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-extrabold text-slate-900">Responsables con más registros</h3><p className="mt-1 text-xs text-slate-500">Top 5 por cantidad de filas asociadas en la hoja activa.</p></div>
                  <div className="rounded-xl bg-slate-50 p-2 text-slate-500"><Users size={19} /></div>
                </div>
                {resumen.responsablesTop.length ? (
                  <div className="mt-6 space-y-5">
                    {resumen.responsablesTop.map((responsableDato, indice) => (
                      <div key={responsableDato.nombre}>
                        <div className="mb-2 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-xs font-bold text-slate-700" title={responsableDato.nombre}>{indice + 1}. {responsableDato.nombre}</span><span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-800">{numeroEC(responsableDato.cantidad)}</span></div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${(responsableDato.cantidad / maxResponsables) * 100}%`, background: indice === 0 ? "#ff3547" : indice === 1 ? "#fb7185" : indice === 2 ? "#64748b" : indice === 3 ? "#94a3b8" : "#cbd5e1" }} /></div>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex h-40 items-center justify-center text-sm text-slate-400">No se encontraron responsables en esta hoja.</div>}
              </article>
            </section>
          )}

          {/* Tabla de bienes */}
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div><div className="flex items-center gap-2"><h3 className="text-lg font-black tracking-tight text-slate-900">Listado de bienes</h3><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{numeroEC(bienesFiltrados.length)}</span></div><p className="mt-1 text-xs text-slate-500">Busca por descripción, código, serie, custodio o ubicación.</p></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label className="relative block sm:min-w-[300px]">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50" type="search" placeholder="Buscar bienes..." value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
                    {busqueda && <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusqueda(""); setPagina(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X size={15} /></button>}
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:min-w-[190px]">
                    <Filter size={16} className="shrink-0 text-slate-400" />
                    <select className="w-full bg-transparent py-2.5 text-sm font-semibold text-slate-600 outline-none" value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1); }} aria-label="Filtrar bienes">
                      <option value="todos">Todos los estados</option><option value="sin-codigo">Sin código</option><option value="verificar">Por verificar</option><option value="baja">De baja</option>
                    </select>
                  </label>
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setModoVista("tarjetas")} aria-pressed={modoVista === "tarjetas"} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${modoVista === "tarjetas" ? "bg-white text-rose-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}><Grid2X2 size={15} /> Tarjetas</button>
                    <button type="button" onClick={() => setModoVista("tabla")} aria-pressed={modoVista === "tabla"} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${modoVista === "tabla" ? "bg-white text-rose-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}><List size={15} /> Tabla</button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "todos", label: "Todos", cantidad: bienes.length },
                    { value: "sin-codigo", label: "Sin código", cantidad: resumen.sinCodigo },
                    { value: "verificar", label: "Por verificar", cantidad: resumen.porVerificar },
                    { value: "baja", label: "De baja", cantidad: resumen.deBaja },
                  ].map((pestana) => (
                    <button type="button" key={pestana.value} onClick={() => { setFiltro(pestana.value); setPagina(1); }} className={`rounded-full px-3 py-2 text-xs font-bold transition ${filtro === pestana.value ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                      {pestana.label} <span className="ml-1 opacity-70">{numeroEC(pestana.cantidad)}</span>
                    </button>
                  ))}
                </div>
                {(busqueda || filtro !== "todos") && <button type="button" onClick={limpiarFiltros} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600"><RefreshCw size={13} /> Limpiar filtros</button>}
              </div>
            </div>

            {cargando ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <LoaderCircle size={34} className="animate-spin text-rose-600" />
                <h4 className="mt-4 font-extrabold text-slate-900">Conectando con el inventario</h4>
                <p className="mt-2 text-sm text-slate-500">Consultando los registros guardados en Supabase…</p>
              </div>
            ) : registros.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Database size={30} /></div>
                <h4 className="font-extrabold text-slate-900">Todavía no hay bienes guardados</h4>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">La pantalla ya consulta Supabase. Ejecuta una sola vez la migración SQL y el script de importación del Excel para llenar la base de datos. Después no tendrás que seleccionar el libro nuevamente.</p>
                <button type="button" onClick={() => void cargarInventario()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff3547] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#e72d3e]"><RefreshCw size={16} /> Volver a consultar</button>
              </div>
            ) : bienes.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-12 text-center"><CircleAlert size={32} className="text-amber-500" /><h4 className="mt-3 font-bold text-slate-800">No hay registros para esta facultad</h4><p className="mt-1 text-sm text-slate-500">Selecciona otra facultad o vuelve a consultar la base de datos.</p></div>
            ) : bienesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-12 text-center"><Search size={30} className="text-slate-300" /><h4 className="mt-3 font-bold text-slate-800">No hay resultados</h4><p className="mt-1 text-sm text-slate-500">Prueba otra búsqueda o limpia los filtros seleccionados.</p><button type="button" onClick={limpiarFiltros} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Restablecer vista</button></div>
            ) : (
              <>
                {modoVista === "tarjetas" ? (
                  <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:p-5">
                    {bienesPagina.map((bien) => {
                      const estado = estadoBien(bien);
                      const expandido = bienExpandido === bien.clave;
                      return (
                        <article key={bien.clave} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-rose-200 hover:shadow-[0_16px_35px_rgba(15,23,42,.09)] sm:p-4">
                          <VisualBien bien={bien} />
                          <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-400">Descripción del bien</p>
                                <h4 className="mt-1.5 text-[15px] font-extrabold leading-5 text-slate-900" title={bien.detalle} style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{bien.detalle || "Bien sin descripción"}</h4>
                              </div>
                              <EtiquetaEstado estado={estado} />
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {bien.marca && <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-600"><Tag size={12} className="shrink-0 text-slate-400" /><span className="truncate">{bien.marca}</span></span>}
                              {bien.codigo ? <span className="inline-flex max-w-full items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-[10px] font-bold text-slate-600"><Barcode size={12} className="shrink-0 text-slate-400" /><span className="truncate">{bien.codigo}</span></span> : <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1.5 text-[10px] font-bold text-rose-700"><CircleAlert size={12} /> Sin código</span>}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2">
                              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Serie</p>
                                <p className="mt-1 truncate text-xs font-bold text-slate-700" title={bien.serie || "No registrada"}>{bien.serie || "No registrada"}</p>
                              </div>
                              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Responsable</p>
                                <p className="mt-1 truncate text-xs font-bold text-slate-700" title={responsable(bien)}>{responsable(bien)}</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-start gap-2 rounded-xl px-1 py-1 text-xs text-slate-500">
                              <MapPin size={15} className="mt-0.5 shrink-0 text-rose-500" />
                              <div className="min-w-0"><p className="font-bold text-slate-700">{bien.ubicacion || bien.grupo || "Ubicación no registrada"}</p>{bien.grupo && bien.ubicacion && <p className="mt-0.5 truncate text-[10px] text-slate-400" title={bien.grupo}>{bien.grupo}</p>}</div>
                            </div>

                            {expandido && (
                              <div className="mt-3 space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-3">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">Ficha completa</p>
                                <div><p className="text-[10px] font-bold uppercase text-slate-400">Descripción completa</p><p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">{bien.detalle || "Sin descripción registrada"}</p></div>
                                {bien.custodioAnterior && <div><p className="text-[10px] font-bold uppercase text-slate-400">Custodio anterior</p><p className="mt-0.5 text-xs leading-5 text-slate-700">{bien.custodioAnterior}</p></div>}
                                {(bien.observacion || bien.observacion2) ? <div><p className="text-[10px] font-bold uppercase text-slate-400">Observaciones</p><p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-slate-700">{[bien.observacion, bien.observacion2].filter(Boolean).join(" · ")}</p></div> : <p className="text-xs text-slate-500">Sin observaciones registradas.</p>}
                                <div><p className="text-[10px] font-bold uppercase text-slate-400">Área / sección</p><p className="mt-0.5 text-xs leading-5 text-slate-700">{bien.grupo || "No identificada"}</p></div>
                              </div>
                            )}

                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-4">
                              <span className="text-[10px] font-semibold text-slate-400">Registro #{bien.item}</span>
                              <button type="button" onClick={() => setBienExpandido(expandido ? null : bien.clave)} aria-expanded={expandido} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200">
                                <Eye size={14} /> {expandido ? "Ocultar ficha" : "Ver ficha"}<ChevronDown size={14} className={`transition-transform ${expandido ? "rotate-180" : ""}`} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-500">
                        <tr>
                          <th className="px-5 py-3.5 font-extrabold">Item</th><th className="px-4 py-3.5 font-extrabold">Descripción del bien</th><th className="px-4 py-3.5 font-extrabold">Código / serie</th><th className="px-4 py-3.5 font-extrabold">Custodio / responsable</th><th className="px-4 py-3.5 font-extrabold">Ubicación / área</th><th className="px-4 py-3.5 font-extrabold">Estado</th><th className="px-5 py-3.5 text-right font-extrabold">Cant.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bienesPagina.map((bien) => {
                          const estado = estadoBien(bien);
                          return (
                            <tr key={bien.clave} className="group transition hover:bg-rose-50/40">
                              <td className="whitespace-nowrap px-5 py-4 align-top"><span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-extrabold text-slate-600">{bien.item}</span></td>
                              <td className="max-w-[330px] px-4 py-4 align-top"><p className="font-bold leading-5 text-slate-800">{bien.detalle || "Sin descripción"}</p><p className="mt-1.5 text-xs text-slate-400">{bien.marca ? `Marca: ${bien.marca}` : "Marca no registrada"}{bien.serie ? ` · Serie: ${bien.serie}` : ""}</p></td>
                              <td className="px-4 py-4 align-top"><p className="font-mono text-xs font-bold text-slate-700">{bien.codigo || "Sin código"}</p><p className="mt-1 text-[11px] text-slate-400">{bien.serie ? `Serie: ${bien.serie}` : "Sin serie"}</p></td>
                              <td className="max-w-[230px] px-4 py-4 align-top"><div className="flex items-start gap-2"><div className="mt-0.5 rounded-lg bg-slate-100 p-1.5 text-slate-500"><Users size={13} /></div><div><p className="text-xs font-bold leading-5 text-slate-700">{responsable(bien)}</p>{bien.custodio && bien.custodioAnterior && bien.custodio !== bien.custodioAnterior && <p className="mt-1 text-[10px] text-slate-400">Anterior: {bien.custodioAnterior}</p>}</div></div></td>
                              <td className="max-w-[220px] px-4 py-4 align-top"><div className="flex items-start gap-2 text-xs text-slate-600"><MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" /><span className="leading-5">{bien.ubicacion || bien.grupo || "Sin ubicación registrada"}</span></div>{bien.grupo && bien.ubicacion && <p className="mt-1 pl-5 text-[10px] text-slate-400">{bien.grupo}</p>}</td>
                              <td className="px-4 py-4 align-top"><EtiquetaEstado estado={estado} />{(bien.observacion || bien.observacion2) && <p className="mt-1.5 max-w-[180px] text-[10px] leading-4 text-slate-400">{[bien.observacion, bien.observacion2].filter(Boolean).join(" · ")}</p>}</td>
                              <td className="px-5 py-4 text-right align-top"><span className="inline-flex min-w-9 justify-center rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-black tabular-nums text-slate-800">{numeroEC(bien.cantidad)}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">Mostrando <strong className="text-slate-800">{(paginaSegura - 1) * TAMANO_PAGINA + 1}–{Math.min(paginaSegura * TAMANO_PAGINA, bienesFiltrados.length)}</strong> de <strong className="text-slate-800">{numeroEC(bienesFiltrados.length)}</strong> registros encontrados</p>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} /> Anterior</button>
                    <span className="min-w-[94px] text-center text-xs font-bold text-slate-500">Página {paginaSegura} de {totalPaginas}</span>
                    <button type="button" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight size={15} /></button>
                  </div>
                </div>
              </>
            )}
          </section>

          <footer className="flex flex-col gap-1 border-t border-slate-200 px-1 pt-4 text-[11px] leading-5 text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <span>Inventario institucional · Facultad de Ciencias Informáticas</span>
            <span>Los datos se consultan desde Supabase; el Excel original solo se necesita para la importación inicial.</span>
          </footer>
        </div>
      </div>
    </Pantalla>
  );
}
