"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Upload,
  FileSpreadsheet,
  Package,
  ClipboardList,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";
import { Pantalla } from "@/components/ui";

type Columnas = {
  filaEncabezado: number;
  item: number;
  cantidad: number;
  detalle: number;
  marca: number;
  serie: number;
  codigo: number;
  custodioAnterior: number;
  observaciones: number[];
  custodio: number;
  ubicacion: number;
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

function normalizar(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function texto(fila: unknown[], columna: number): string {
  if (columna < 0 || columna >= fila.length) return "";
  return String(fila[columna] ?? "").trim();
}

function numero(valor: string): number {
  const limpio = valor.replace(/\s/g, "").replace(",", ".");
  return limpio ? Number(limpio) : Number.NaN;
}

function indiceExacto(encabezados: string[], candidatos: string[]): number {
  return encabezados.findIndex((h) => candidatos.includes(h));
}

function detectarColumnas(fila: unknown[], filaEncabezado: number): Columnas | null {
  const encabezados = fila.map(normalizar);
  const buscar = (...candidatos: string[]) =>
    indiceExacto(encabezados, candidatos);

  const item = buscar("ITEM", "ITEMS", "N ITEM", "NUMERO DE ITEM");
  const cantidad = buscar("CANT", "CANTIDAD", "CANTIDAD DE BIENES");
  const detalle = buscar("DETALLE", "DESCRIPCION", "DESCRIPCION DEL BIEN");

  if (item < 0 || cantidad < 0 || detalle < 0) return null;

  const observaciones = encabezados
    .map((h, i) => (/^OBSERVACION(?:\s*\d*)?$/.test(h) ? i : -1))
    .filter((i) => i >= 0);

  return {
    filaEncabezado,
    item,
    cantidad,
    detalle,
    marca: buscar("MARCA"),
    serie: buscar("SERIE", "NUMERO DE SERIE"),
    codigo: buscar("CODIGO", "CODIGO PATRIMONIAL"),
    custodioAnterior: buscar("CUSTODIO ANTERIOR", "CUSTODIO PREVIO"),
    observaciones,
    // Preferimos el encabezado CUSTODIO exacto, no CUSTODIO ANTERIOR.
    custodio: buscar("CUSTODIO", "CUSTODIO ACTUAL", "RESPONSABLE ACTUAL"),
    ubicacion: buscar("UBICACION", "LOCALIZACION"),
  };
}

function obtenerColumnas(filas: unknown[][], nombreHoja: string): Columnas | null {
  // Los encabezados suelen estar cerca del inicio, después del título institucional.
  for (let i = 0; i < Math.min(filas.length, 40); i++) {
    const columnas = detectarColumnas(filas[i], i);
    if (!columnas) continue;

    // En INFORMATICA, la columna I contiene el custodio anterior aunque su encabezado esté vacío.
    if (
      normalizar(nombreHoja) === "INFORMATICA" &&
      columnas.custodioAnterior < 0
    ) {
      columnas.custodioAnterior = 8; // Columna I, índice basado en cero.
    }

    return columnas;
  }
  return null;
}

function leerBienes(libro: XLSX.WorkBook, nombreHoja: string): Bien[] {
  const hoja = libro.Sheets[nombreHoja];
  if (!hoja) return [];

  const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
    header: 1,
    defval: "",
    raw: false,
  });
  const columnas = obtenerColumnas(filas, nombreHoja);
  if (!columnas) return [];

  const bienes: Bien[] = [];
  let grupoActual = "";
  let ultimaFilaDeGrupo = -2;

  for (let i = columnas.filaEncabezado + 1; i < filas.length; i++) {
    const fila = filas[i];
    const item = texto(fila, columnas.item);
    const cantidadTexto = texto(fila, columnas.cantidad);
    const detalle = texto(fila, columnas.detalle);
    const itemNumero = numero(item);
    const cantidad = numero(cantidadTexto);

    const esBien =
      item !== "" &&
      cantidadTexto !== "" &&
      detalle !== "" &&
      Number.isFinite(itemNumero) &&
      Number.isFinite(cantidad);

    if (esBien) {
      const custodioAnterior = texto(fila, columnas.custodioAnterior);
      const observacion = texto(fila, columnas.observaciones[0] ?? -1);
      const observacion2 = texto(fila, columnas.observaciones[1] ?? -1);
      const codigo = texto(fila, columnas.codigo);

      bienes.push({
        clave: `${nombreHoja}-${i + 1}-${item}`,
        hoja: nombreHoja,
        item,
        cantidad,
        detalle,
        marca: texto(fila, columnas.marca),
        serie: texto(fila, columnas.serie),
        codigo,
        custodioAnterior,
        observacion,
        observacion2,
        custodio: texto(fila, columnas.custodio),
        ubicacion: texto(fila, columnas.ubicacion),
        grupo: grupoActual,
      });
      continue;
    }

    // Las filas sin ITEM ni CANT suelen marcar una sección, área o responsable.
    // Se conserva el texto de contexto sin tratarlo como un bien.
    if (!item && !cantidadTexto && detalle) {
      if (i === ultimaFilaDeGrupo + 1 && grupoActual) {
        grupoActual = `${grupoActual} / ${detalle}`;
      } else {
        grupoActual = detalle;
      }
      ultimaFilaDeGrupo = i;
    }
  }

  return bienes;
}

function sinCodigo(bien: Bien): boolean {
  return !bien.codigo.trim();
}

function porVerificar(bien: Bien): boolean {
  const estado = normalizar(`${bien.observacion} ${bien.observacion2}`);
  return estado.includes("POR VERIFICAR") || estado.includes("REVISAR");
}

function dadoDeBaja(bien: Bien): boolean {
  const estado = normalizar(`${bien.observacion} ${bien.observacion2}`);
  return estado.includes("BAJA");
}

export default function Inventario() {
  const [libro, setLibro] = useState<XLSX.WorkBook | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [hojaSeleccionada, setHojaSeleccionada] = useState("INFORMATICA");
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [error, setError] = useState("");

  async function importarExcel(evento: ChangeEvent<HTMLInputElement>) {
    const input = evento.currentTarget;
    const archivo = input.files?.[0];
    if (!archivo) return;

    setError("");
    try {
      const buffer = await archivo.arrayBuffer();
      const nuevoLibro = XLSX.read(buffer, { type: "array" });
      if (!nuevoLibro.SheetNames.length) {
        setError("El archivo no contiene hojas que se puedan leer.");
        return;
      }

      const hojaInicial =
        nuevoLibro.SheetNames.find((n) => normalizar(n) === "INFORMATICA") ??
        nuevoLibro.SheetNames[0];

      setLibro(nuevoLibro);
      setNombreArchivo(archivo.name);
      setHojaSeleccionada(hojaInicial);
      setBusqueda("");
      setFiltro("todos");
    } catch {
      setError("No se pudo leer el archivo. Selecciona un Excel válido (.xlsx o .xls).");
    } finally {
      input.value = "";
    }
  }

  const nombresHojas = libro?.SheetNames ?? [];
  const bienes = useMemo(
    () => (libro ? leerBienes(libro, hojaSeleccionada) : []),
    [libro, hojaSeleccionada]
  );

  const bienesFiltrados = useMemo(() => {
    const termino = normalizar(busqueda);

    return bienes.filter((bien) => {
      const textoBusqueda = normalizar(
        [
          bien.item,
          bien.detalle,
          bien.marca,
          bien.serie,
          bien.codigo,
          bien.custodioAnterior,
          bien.observacion,
          bien.observacion2,
          bien.custodio,
          bien.ubicacion,
          bien.grupo,
        ].join(" ")
      );

      const coincideBusqueda = textoBusqueda.includes(termino);
      const coincideFiltro =
        filtro === "todos" ||
        (filtro === "sin-codigo" && sinCodigo(bien)) ||
        (filtro === "verificar" && porVerificar(bien)) ||
        (filtro === "baja" && dadoDeBaja(bien));

      return coincideBusqueda && coincideFiltro;
    });
  }, [bienes, busqueda, filtro]);

  const totalUnidades = bienes.reduce((total, bien) => total + bien.cantidad, 0);
  const totalSinCodigo = bienes.filter(sinCodigo).length;
  const totalVerificar = bienes.filter(porVerificar).length;

  return (
    <Pantalla titulo="Inventario de bienes">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4">
        <section className="tarjeta flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Inventario de bienes físicos</h2>
            <p className="mt-1 text-sm text-[var(--mut)]">
              Facultad de Ciencias Informáticas · ULEAM
            </p>
            <p className="mt-1 text-xs text-[var(--mut)]">
              Consulta de bienes por hoja del archivo Excel
            </p>
          </div>

          <label className="btn flex cursor-pointer items-center justify-center gap-2 sm:w-auto">
            <Upload size={18} />
            Cargar Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              className="sr-only"
              onChange={importarExcel}
            />
          </label>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <CircleAlert size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {libro && (
          <section className="tarjeta grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:items-end">
            <div>
              <p className="mb-1 text-sm font-semibold">Archivo cargado</p>
              <p className="break-all text-sm text-[var(--mut)]">{nombreArchivo}</p>
            </div>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Hoja del inventario
              <select
                className="input"
                value={hojaSeleccionada}
                onChange={(e) => {
                  setHojaSeleccionada(e.target.value);
                  setBusqueda("");
                  setFiltro("todos");
                }}
              >
                {nombresHojas.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="tarjeta flex items-center gap-3 p-4">
            <ClipboardList className="text-[var(--uleam)]" size={28} />
            <div>
              <p className="text-sm text-[var(--mut)]">Registros</p>
              <p className="text-2xl font-bold">{bienes.length.toLocaleString("es-EC")}</p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <Package className="text-[var(--uleam)]" size={28} />
            <div>
              <p className="text-sm text-[var(--mut)]">Unidades registradas</p>
              <p className="text-2xl font-bold">{totalUnidades.toLocaleString("es-EC")}</p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <CircleAlert className="text-[var(--uleam)]" size={28} />
            <div>
              <p className="text-sm text-[var(--mut)]">Sin código</p>
              <p className="text-2xl font-bold">{totalSinCodigo.toLocaleString("es-EC")}</p>
            </div>
          </article>

          <article className="tarjeta flex items-center gap-3 p-4">
            <CheckCircle2 className="text-[var(--uleam)]" size={28} />
            <div>
              <p className="text-sm text-[var(--mut)]">Por verificar</p>
              <p className="text-2xl font-bold">{totalVerificar.toLocaleString("es-EC")}</p>
            </div>
          </article>
        </section>

        <section className="tarjeta flex flex-col gap-3 p-4">
          <h3 className="font-bold">Consultar bienes</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_230px]">
            <label className="relative block">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mut)]"
              />
              <input
                className="input pl-10"
                type="search"
                placeholder="Buscar por detalle, código, serie o custodio..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </label>

            <select
              className="input"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Filtrar bienes"
            >
              <option value="todos">Todos los bienes</option>
              <option value="sin-codigo">Sin código</option>
              <option value="verificar">Por verificar</option>
              <option value="baja">Marcados para baja</option>
            </select>
          </div>

          <p className="text-xs text-[var(--mut)]">
            Mostrando {bienesFiltrados.length.toLocaleString("es-EC")} de {bienes.length.toLocaleString("es-EC")} registros.
          </p>

          {!libro ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileSpreadsheet size={42} className="text-[var(--uleam)]" />
              <p className="font-bold">Carga el Excel para consultar el inventario</p>
              <p className="max-w-md text-sm text-[var(--mut)]">
                El sistema seleccionará la hoja INFORMATICA cuando exista. Las otras hojas se pueden consultar con el selector.
              </p>
            </div>
          ) : bienes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CircleAlert size={36} className="text-[var(--uleam)]" />
              <p className="font-bold">No se detectaron registros en esta hoja</p>
              <p className="max-w-lg text-sm text-[var(--mut)]">
                Comprueba que la hoja tenga encabezados de ITEM, CANT y DETALLE/DESCRIPCION. No se han creado bienes ficticios.
              </p>
            </div>
          ) : bienesFiltrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--mut)]">
              No hay bienes que coincidan con los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[1550px] border-collapse text-left text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    {[
                      "Item",
                      "Cant.",
                      "Detalle del bien",
                      "Marca",
                      "Serie",
                      "Código",
                      "Custodio anterior",
                      "Observación",
                      "Observación adicional",
                      "Custodio actual",
                      "Ubicación",
                      "Área / grupo del Excel",
                    ].map((titulo) => (
                      <th key={titulo} className="border-b border-gray-200 px-3 py-3 font-bold">
                        {titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bienesFiltrados.map((bien) => (
                    <tr key={bien.clave} className="odd:bg-white even:bg-gray-50 hover:bg-red-50">
                      <td className="border-b border-gray-100 px-3 py-3">{bien.item}</td>
                      <td className="border-b border-gray-100 px-3 py-3 text-center font-bold">{bien.cantidad}</td>
                      <td className="max-w-sm whitespace-normal border-b border-gray-100 px-3 py-3 font-medium">{bien.detalle || "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-3">{bien.marca || "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-3">{bien.serie || "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-3">
                        {bien.codigo || "—"}
                        {sinCodigo(bien) && (
                          <span className="mt-1 block text-xs font-semibold text-red-700">Sin código</span>
                        )}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-3">{bien.custodioAnterior || "—"}</td>
                      <td className="max-w-xs whitespace-normal border-b border-gray-100 px-3 py-3">{bien.observacion || "—"}</td>
                      <td className="max-w-xs whitespace-normal border-b border-gray-100 px-3 py-3">{bien.observacion2 || "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-3">{bien.custodio || "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-3">{bien.ubicacion || "—"}</td>
                      <td className="max-w-xs whitespace-normal border-b border-gray-100 px-3 py-3">{bien.grupo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-[var(--mut)]">
          Los datos se leen en el navegador desde el Excel seleccionado. Esta pantalla no modifica el archivo original ni guarda cambios en una base de datos compartida.
        </p>
      </div>
    </Pantalla>
  );
}
