"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/servicios/supabase";
import {
  Search, Package, ClipboardList, CircleAlert, Download, ChevronLeft, ChevronRight,
  Barcode, Armchair, Laptop, Fan, Printer, Monitor, Eye, X, RefreshCw, TriangleAlert,
  ShieldCheck, Users, MapPin, Tag, WifiOff, type LucideIcon,
} from "lucide-react";
import ShellDocente, { MENU_TECNICO } from "@/components/docente/ShellDocente";
import { useConexion } from "@/lib/servicios/conexion";

/* ============================ Tipos ============================ */
type FilaBD = {
  id: string; clave_origen: string | null; hoja: string; item: string | null;
  cantidad: number | string | null; detalle: string | null; marca: string | null;
  serie: string | null; codigo: string | null; custodio_anterior: string | null;
  observacion_1: string | null; observacion_2: string | null; custodio: string | null;
  ubicacion: string | null; grupo: string | null;
};

type Bien = {
  clave: string; hoja: string; item: string; cantidad: number; detalle: string;
  marca: string; serie: string; codigo: string; custodioAnterior: string;
  observacion: string; observacion2: string; custodio: string; ubicacion: string; grupo: string;
};

type EstadoInventario =
  | "Registrado" | "Sin código" | "Por verificar" | "De baja"
  | "Entregado" | "Sin observación" | "Otra observación";

type DatoEstado = { nombre: EstadoInventario; cantidad: number; color: string };
type Filtro = "todos" | "sin-codigo" | "verificar" | "baja";

const TAMANO_PAGINA = 10;

const PALETA_ESTADOS: Record<EstadoInventario, string> = {
  Registrado: "#2fb15d",
  "Sin código": "#d92a3a",
  "Por verificar": "#f5b82e",
  "De baja": "#5b6075",
  Entregado: "#2d3ae0",
  "Sin observación": "#8b5cf6",
  "Otra observación": "#9aa0b4",
};

/* data-estado reutiliza los colores de los badges de globals.css */
const CSS_ESTADO: Record<EstadoInventario, string> = {
  Registrado: "aprobado",
  "Sin código": "rechazado",
  "Por verificar": "pendiente",
  "De baja": "finalizado",
  Entregado: "en-curso",
  "Sin observación": "finalizado",
  "Otra observación": "finalizado",
};

/* ============================ Utilidades ============================ */
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

const textoEstado = (b: Bien) => normalizar(`${b.observacion} ${b.observacion2}`);

function sinCodigo(b: Bien): boolean {
  const e = textoEstado(b);
  return !b.codigo.trim() ||
    e.includes("NO TIENE CODIGO") || e.includes("IMPRIMIR CODIGO") ||
    e.includes("CAMBIAR ESTE CODIGO") || e.includes("CAMBIAR LOS CODIGOS");
}
const porVerificar = (b: Bien) => {
  const e = textoEstado(b);
  return e.includes("POR VERIFICAR") || e.includes("REVISAR");
};
const dadoDeBaja = (b: Bien) => textoEstado(b).includes("BAJA");
const responsable = (b: Bien) => b.custodio || b.custodioAnterior || "Sin responsable registrado";

function estadoBien(b: Bien): EstadoInventario {
  const e = textoEstado(b);
  if (e.includes("BAJA")) return "De baja";
  if (e.includes("POR VERIFICAR") || e.includes("REVISAR")) return "Por verificar";
  if (sinCodigo(b)) return "Sin código";
  if (e.includes("ENTREGADO")) return "Entregado";
  if (e.includes("OK") || e.includes("EQUIPO NUEVO")) return "Registrado";
  if (!e.trim()) return "Sin observación";
  return "Otra observación";
}

function categoriaBien(b: Bien): { icono: LucideIcon; nombre: string } {
  const d = normalizar(b.detalle);
  if (/SILLA|SILLON|ESCRITORIO|MESA|CREDENZA|ARCHIVADOR|ESTANTERIA|MUEBLE/.test(d))
    return { icono: Armchair, nombre: "Mobiliario" };
  if (/LAPTOP|PORTATIL|COMPUTADOR|NOTEBOOK|SERVIDOR|CPU/.test(d))
    return { icono: Laptop, nombre: "Equipo informático" };
  if (/AIRE ACONDICIONADO|ACONDICIONADOR|VENTILADOR|EXTRACTOR/.test(d))
    return { icono: Fan, nombre: "Climatización" };
  if (/IMPRESORA|SCANNER|ESCANER|COPIADORA/.test(d))
    return { icono: Printer, nombre: "Impresión" };
  if (/MONITOR|TELEVISOR|PANTALLA|PROYECTOR/.test(d))
    return { icono: Monitor, nombre: "Pantallas" };
  return { icono: Package, nombre: "Bien institucional" };
}

const numeroEC = (v: number) => v.toLocaleString("es-EC", { maximumFractionDigits: 0 });

function exportarCSV(bienes: Bien[], hoja: string) {
  const columnas: [string, (b: Bien) => string | number][] = [
    ["ITEM", (b) => b.item], ["CANTIDAD", (b) => b.cantidad], ["DETALLE", (b) => b.detalle],
    ["MARCA", (b) => b.marca], ["SERIE", (b) => b.serie], ["CODIGO", (b) => b.codigo],
    ["CUSTODIO ANTERIOR", (b) => b.custodioAnterior], ["OBSERVACION 1", (b) => b.observacion],
    ["OBSERVACION 2", (b) => b.observacion2], ["CUSTODIO", (b) => b.custodio],
    ["UBICACION", (b) => b.ubicacion], ["AREA / GRUPO", (b) => b.grupo],
  ];
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const contenido = [
    columnas.map(([t]) => esc(t)).join(";"),
    ...bienes.map((b) => columnas.map(([, f]) => esc(f(b))).join(";")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventario-${normalizar(hoja).toLowerCase().replace(/\s+/g, "-")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================ Piezas visuales ============================ */
function Donut({ datos, total }: { datos: DatoEstado[]; total: number }) {
  const radio = 43;
  const circ = 2 * Math.PI * radio;
  let acum = 0;
  const segmentos = datos.map((d) => {
    const longitud = total > 0 ? (d.cantidad / total) * circ : 0;
    const s = { ...d, longitud, desplazamiento: acum };
    acum += longitud;
    return s;
  });
  return (
    <div className="inv-donut">
      <svg viewBox="0 0 110 110" role="img" aria-label="Gráfico circular de estado del inventario">
        <circle cx="55" cy="55" r={radio} fill="none" stroke="var(--dd-neutral)" strokeWidth="12" />
        <g transform="rotate(-90 55 55)">
          {segmentos.map((s) =>
            s.longitud > 0 ? (
              <circle
                key={s.nombre} cx="55" cy="55" r={radio} fill="none"
                stroke={s.color} strokeWidth="12"
                strokeDasharray={`${s.longitud} ${circ - s.longitud}`}
                strokeDashoffset={-s.desplazamiento}
              />
            ) : null,
          )}
        </g>
      </svg>
      <div className="inv-donut__center">
        <b>{numeroEC(total)}</b>
        <span>registros</span>
      </div>
    </div>
  );
}

function Dato({ icono: Icono, k, v }: { icono: LucideIcon; k: string; v: string }) {
  return (
    <div className="inv-dato">
      <Icono size={14} />
      <div>
        <p className="inv-dato__k">{k}</p>
        <p className="inv-dato__v" title={v}>{v}</p>
      </div>
    </div>
  );
}

function TarjetaBien({
  bien, abierto, onToggle,
}: { bien: Bien; abierto: boolean; onToggle: () => void }) {
  const estado = estadoBien(bien);
  const { icono: Icono, nombre: categoria } = categoriaBien(bien);
  const obs = [bien.observacion, bien.observacion2].filter(Boolean).join(" · ");

  return (
    <article className="dd-card" data-estado={CSS_ESTADO[estado]}>
      <div className="dd-card__top">
        <span className="dd-card__avatar"><Icono size={20} /></span>
        <div className="dd-card__info">
          <h3 className="dd-card__name inv-name">{bien.detalle || "Bien sin descripción"}</h3>
          <p className="dd-card__place">{categoria} · Ítem {bien.item} · {bien.cantidad} {bien.cantidad === 1 ? "unidad" : "unidades"}</p>
        </div>
        <span className="dd-badge">{estado}</span>
      </div>

      <div className="inv-datos">
        <Dato icono={Barcode} k="Código" v={bien.codigo || "Sin código"} />
        <Dato icono={Tag} k="Marca / serie" v={[bien.marca, bien.serie].filter(Boolean).join(" · ") || "—"} />
        <Dato icono={Users} k="Responsable" v={responsable(bien)} />
        <Dato icono={MapPin} k="Ubicación" v={bien.ubicacion || bien.grupo || "—"} />
      </div>

      {abierto && (
        <div className="inv-ficha">
          {bien.custodioAnterior && bien.custodio && bien.custodioAnterior !== bien.custodio && (
            <p><b>Custodio anterior:</b> {bien.custodioAnterior}</p>
          )}
          {bien.grupo && <p><b>Área / sección:</b> {bien.grupo}</p>}
          <p><b>Observaciones:</b> {obs || "Sin observaciones registradas."}</p>
        </div>
      )}

      <div className="dd-card__actions">
        <button type="button" className="dd-btn dd-btn--ghost" onClick={onToggle} aria-expanded={abierto}>
          <Eye /> {abierto ? "Ocultar ficha" : "Ver ficha"}
        </button>
      </div>
    </article>
  );
}

function Esqueletos() {
  return (
    <div className="dd-list inv-list" aria-busy="true" aria-label="Cargando inventario">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="inv-skel" />
      ))}
    </div>
  );
}

/* ============================ Página ============================ */
export default function Inventario() {
  const { estado: conexion } = useConexion();
  const [bienes, setBienes] = useState<Bien[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [pagina, setPagina] = useState(1);
  const [modoVista, setModoVista] = useState<"tarjetas" | "tabla">("tarjetas");
  const [abierto, setAbierto] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    setError("");
    cargarBienesInformatica()
      .then(setBienes)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "";
        setError(
          /fetch|network|load failed/i.test(msg)
            ? "Sin conexión. Revisa tu internet e intenta de nuevo."
            : msg || "No se pudo cargar el inventario.",
        );
      })
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  /* si vuelve la conexión y había un error, reintenta solo */
  useEffect(() => {
    if (conexion === "ok" && error) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conexion]);

  const resumen = useMemo(() => {
    const conteo = new Map<EstadoInventario, number>();
    const resp = new Map<string, number>();
    for (const b of bienes) {
      const e = estadoBien(b);
      conteo.set(e, (conteo.get(e) ?? 0) + 1);
      const p = responsable(b);
      resp.set(p, (resp.get(p) ?? 0) + 1);
    }
    const orden: EstadoInventario[] = [
      "Registrado", "Sin código", "Por verificar", "De baja", "Entregado", "Sin observación", "Otra observación",
    ];
    const estados = orden
      .map((nombre) => ({ nombre, cantidad: conteo.get(nombre) ?? 0, color: PALETA_ESTADOS[nombre] }))
      .filter((d) => d.cantidad > 0);
    const responsablesTop = [...resp.entries()]
      .filter(([n]) => n !== "Sin responsable registrado")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));
    const conCodigo = bienes.filter((b) => !sinCodigo(b)).length;
    return {
      total: bienes.length,
      unidades: bienes.reduce((t, b) => t + b.cantidad, 0),
      sinCodigo: bienes.filter(sinCodigo).length,
      porVerificar: bienes.filter(porVerificar).length,
      deBaja: bienes.filter(dadoDeBaja).length,
      atencion: bienes.filter((b) => sinCodigo(b) || porVerificar(b) || dadoDeBaja(b)).length,
      pctCodigo: bienes.length ? Math.round((conCodigo / bienes.length) * 100) : 0,
      estados,
      responsablesTop,
    };
  }, [bienes]);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return bienes.filter((b) => {
      const texto = normalizar([
        b.item, b.detalle, b.marca, b.serie, b.codigo, b.custodioAnterior,
        b.observacion, b.observacion2, b.custodio, b.ubicacion, b.grupo,
      ].join(" "));
      const okBusqueda = texto.includes(q);
      const okFiltro =
        filtro === "todos" ||
        (filtro === "sin-codigo" && sinCodigo(b)) ||
        (filtro === "verificar" && porVerificar(b)) ||
        (filtro === "baja" && dadoDeBaja(b));
      return okBusqueda && okFiltro;
    });
  }, [bienes, busqueda, filtro]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / TAMANO_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * TAMANO_PAGINA;
  const pagina_ = filtrados.slice(inicio, inicio + TAMANO_PAGINA);
  const maxResp = Math.max(1, ...resumen.responsablesTop.map((r) => r.cantidad));

  const FILTROS: { id: Filtro; t: string; n: number }[] = [
    { id: "todos", t: "Todos", n: resumen.total },
    { id: "sin-codigo", t: "Sin código", n: resumen.sinCodigo },
    { id: "verificar", t: "Por verificar", n: resumen.porVerificar },
    { id: "baja", t: "De baja", n: resumen.deBaja },
  ];

  const limpiar = () => { setBusqueda(""); setFiltro("todos"); setPagina(1); };
  const hayFiltros = busqueda !== "" || filtro !== "todos";

  return (
    <ShellDocente menu={MENU_TECNICO}>
      <h1 className="dd-title">Inventario</h1>
      <p className="dd-subtitle">Consulta y revisa los bienes de Ciencias Informáticas.</p>

      {/* Resumen */}
      <section className="tt-stats" aria-label="Resumen del inventario">
        <div className="tt-stat tt-stat--main">
          <span className="tt-stat__icon"><ClipboardList size={20} /></span>
          <div><p className="tt-stat__n">{numeroEC(resumen.total)}</p><p className="tt-stat__t">Bienes registrados</p></div>
        </div>
        <div className="tt-stat">
          <span className="tt-stat__icon"><Package size={20} /></span>
          <div><p className="tt-stat__n">{numeroEC(resumen.unidades)}</p><p className="tt-stat__t">Unidades en total</p></div>
        </div>
        <div className="tt-stat">
          <span className="tt-stat__icon"><Barcode size={20} /></span>
          <div><p className="tt-stat__n">{numeroEC(resumen.sinCodigo)}</p><p className="tt-stat__t">Sin código</p></div>
        </div>
        <div className="tt-stat">
          <span className="tt-stat__icon"><ShieldCheck size={20} /></span>
          <div><p className="tt-stat__n">{resumen.pctCodigo}%</p><p className="tt-stat__t">Con código oficial</p></div>
        </div>
      </section>

      {/* Aviso de atención */}
      {!cargando && resumen.atencion > 0 && (
        <p className="tt-warn inv-aviso" role="status">
          <TriangleAlert size={14} />
          {numeroEC(resumen.atencion)} {resumen.atencion === 1 ? "bien necesita" : "bienes necesitan"} atención
          (sin código, por verificar o dados de baja).
          <button type="button" className="ss-link" onClick={() => { setFiltro("sin-codigo"); setPagina(1); }}>
            Ver sin código
          </button>
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="dd-empty" role="alert">
          <span className="dd-empty__icon">{conexion === "ok" ? <CircleAlert size={28} /> : <WifiOff size={28} />}</span>
          <p className="dd-empty__title">No se pudo cargar el inventario</p>
          <p className="dd-empty__text">{error}</p>
          <button type="button" className="ss-btn ss-btn--primary" style={{ marginTop: 10 }} onClick={cargar}>
            <RefreshCw size={16} /> Reintentar
          </button>
        </div>
      )}

      {/* Gráficos */}
      {!error && bienes.length > 0 && (
        <section className="inv-paneles">
          <article className="inv-panel">
            <h2 className="dd-section-title">Estado de los bienes</h2>
            <p className="dd-section-sub">Según observaciones y códigos.</p>
            <div className="inv-estados">
              <Donut datos={resumen.estados} total={resumen.total} />
              <ul className="inv-leyenda">
                {resumen.estados.map((e) => (
                  <li key={e.nombre}>
                    <span className="inv-dot" style={{ background: e.color }} />
                    <span className="inv-leyenda__n">{e.nombre}</span>
                    <b>{numeroEC(e.cantidad)}</b>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="inv-panel">
            <h2 className="dd-section-title">Responsables con más bienes</h2>
            <p className="dd-section-sub">Top 5 por cantidad de registros.</p>
            {resumen.responsablesTop.length === 0 ? (
              <p className="dd-section-sub" style={{ marginTop: 16 }}>No hay responsables registrados.</p>
            ) : (
              <ol className="inv-barras">
                {resumen.responsablesTop.map((r, i) => (
                  <li key={r.nombre}>
                    <div className="inv-barras__fila">
                      <span title={r.nombre}>{i + 1}. {r.nombre}</span>
                      <b>{numeroEC(r.cantidad)}</b>
                    </div>
                    <div className="inv-barras__pista">
                      <div style={{ width: `${(r.cantidad / maxResp) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </article>
        </section>
      )}

      {/* Listado */}
      {!error && (
        <section className="dd-reservas">
          <div className="dd-reservas__head">
            <h2 className="dd-section-title">Listado de bienes ({numeroEC(filtrados.length)})</h2>
            {bienes.length > 0 && (
              <button type="button" className="ss-btn ss-btn--ghost" onClick={() => exportarCSV(filtrados, "INFORMATICA")}>
                <Download size={16} /> Exportar CSV
              </button>
            )}
          </div>

          <div className="inv-buscar">
            <Search size={16} />
            <input
              className="input" type="search" value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
              placeholder="Buscar por detalle, código, serie, custodio o ubicación"
              aria-label="Buscar bienes"
            />
            {busqueda && (
              <button type="button" aria-label="Limpiar búsqueda" onClick={() => { setBusqueda(""); setPagina(1); }}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="inv-barra">
            <div className="dd-chips" role="tablist" aria-label="Filtrar bienes">
              {FILTROS.map((f) => (
                <button
                  key={f.id} role="tab" aria-selected={filtro === f.id}
                  className={`dd-chip ${filtro === f.id ? "is-active" : ""}`}
                  onClick={() => { setFiltro(f.id); setPagina(1); }}
                >
                  {f.t} ({numeroEC(f.n)})
                </button>
              ))}
            </div>
            <div className="inv-vista" role="group" aria-label="Tipo de vista">
              <button type="button" aria-pressed={modoVista === "tarjetas"} className={modoVista === "tarjetas" ? "is-active" : ""} onClick={() => setModoVista("tarjetas")}>Tarjetas</button>
              <button type="button" aria-pressed={modoVista === "tabla"} className={modoVista === "tabla" ? "is-active" : ""} onClick={() => setModoVista("tabla")}>Tabla</button>
            </div>
          </div>

          {cargando ? (
            <Esqueletos />
          ) : bienes.length === 0 ? (
            <div className="dd-empty" role="status">
              <span className="dd-empty__icon"><Package size={28} /></span>
              <p className="dd-empty__title">Aún no hay bienes</p>
              <p className="dd-empty__text">No se encontraron registros en la base de datos.</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="dd-empty" role="status">
              <span className="dd-empty__icon"><Search size={28} /></span>
              <p className="dd-empty__title">Sin resultados</p>
              <p className="dd-empty__text">Ningún bien coincide con la búsqueda o el filtro.</p>
              {hayFiltros && (
                <button type="button" className="ss-btn ss-btn--ghost" style={{ marginTop: 10 }} onClick={limpiar}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : modoVista === "tarjetas" ? (
            <div className="dd-list inv-list">
              {pagina_.map((b) => (
                <TarjetaBien
                  key={b.clave} bien={b} abierto={abierto === b.clave}
                  onToggle={() => setAbierto(abierto === b.clave ? null : b.clave)}
                />
              ))}
            </div>
          ) : (
            <div className="inv-tabla-wrap">
              <table className="inv-tabla">
                <thead>
                  <tr>
                    <th>Ítem</th><th>Cant.</th><th>Detalle</th><th>Marca / serie</th>
                    <th>Código</th><th>Responsable</th><th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina_.map((b) => {
                    const e = estadoBien(b);
                    return (
                      <tr key={b.clave}>
                        <td><b>{b.item}</b></td>
                        <td>{b.cantidad}</td>
                        <td className="inv-tabla__detalle" title={b.detalle}>{b.detalle}</td>
                        <td>{[b.marca, b.serie].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="inv-mono">{b.codigo || "Sin código"}</td>
                        <td title={responsable(b)}>{responsable(b)}</td>
                        <td><span className="inv-pill" data-estado={CSS_ESTADO[e]}>{e}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!cargando && filtrados.length > 0 && (
            <div className="inv-pag">
              <p>
                Mostrando <b>{inicio + 1}–{Math.min(inicio + TAMANO_PAGINA, filtrados.length)}</b> de{" "}
                <b>{numeroEC(filtrados.length)}</b>
              </p>
              <div className="inv-pag__nav">
                <button
                  type="button" className="ss-btn ss-btn--ghost"
                  disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span>{paginaSegura} / {totalPaginas}</span>
                <button
                  type="button" className="ss-btn ss-btn--ghost"
                  disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </ShellDocente>
  );
}