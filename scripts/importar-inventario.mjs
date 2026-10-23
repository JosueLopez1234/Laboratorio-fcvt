import path from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

// Corrección de compatibilidad entre Node.js y @next/env.
const { loadEnvConfig } = nextEnv;

// Carga las variables del archivo .env.local.
loadEnvConfig(process.cwd());

const args = process.argv.slice(2);

const archivoExcel = args[0]
  ? path.resolve(args[0])
  : path.join(process.cwd(), "Inventario informatica.xlsx");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const clavePrivada =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  console.error(
    "ERROR: Falta NEXT_PUBLIC_SUPABASE_URL en .env.local."
  );
  process.exit(1);
}

if (!clavePrivada) {
  console.error(
    "ERROR: Falta SUPABASE_SERVICE_ROLE_KEY o SUPABASE_SECRET_KEY en .env.local."
  );
  console.error(
    "Configura una clave administrativa únicamente para este script local."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, clavePrivada, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const CONFIG_HOJAS = {
  INFORMATICA: {
    facultad: "Ciencias Informáticas",
  },
  AGROPECUARIA: {
    facultad: "Ciencias Agropecuarias",
  },
  "BIOLOGIA PESQUERA": {
    facultad: "Biología Pesquera",
  },
};

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function texto(fila, columna) {
  if (columna < 0 || columna >= fila.length) {
    return "";
  }

  return String(fila[columna] ?? "").trim();
}

function numero(valor) {
  const limpio = String(valor ?? "")
    .replace(/\s/g, "")
    .replace(",", ".");

  return limpio ? Number(limpio) : Number.NaN;
}

function buscarColumna(encabezados, candidatos) {
  const exacto = encabezados.findIndex((encabezado) =>
    candidatos.includes(encabezado)
  );

  if (exacto >= 0) {
    return exacto;
  }

  return encabezados.findIndex((encabezado) =>
    candidatos.some((candidato) =>
      encabezado.startsWith(`${candidato} `)
    )
  );
}

function detectarColumnas(fila, numeroFila) {
  const encabezados = fila.map(normalizar);

  const buscar = (...candidatos) =>
    buscarColumna(encabezados, candidatos);

  const item = buscar(
    "ITEM",
    "ITEMS",
    "N ITEM",
    "NUMERO DE ITEM"
  );

  const cantidad = buscar(
    "CANT",
    "CANTIDAD",
    "CANTIDAD DE BIENES"
  );

  const detalle = buscar(
    "DETALLE",
    "DESCRIPCION",
    "DESCRIPCION DEL BIEN"
  );

  if (item < 0 || cantidad < 0 || detalle < 0) {
    return null;
  }

  const observaciones = encabezados
    .map((encabezado, indice) =>
      /^OBSERVACION(?:\s*\d*)?$/.test(encabezado)
        ? indice
        : -1
    )
    .filter((indice) => indice >= 0);

  return {
    filaEncabezado: numeroFila,
    item,
    cantidad,
    detalle,
    marca: buscar("MARCA"),
    serie: buscar("SERIE", "NUMERO DE SERIE"),
    codigo: buscar("CODIGO", "CODIGO PATRIMONIAL"),
    custodioAnterior: buscar(
      "CUSTODIO ANTERIOR",
      "CUSTODIO PREVIO"
    ),
    observaciones,
    custodio: buscar(
      "CUSTODIO",
      "CUSTODIO ACTUAL",
      "RESPONSABLE ACTUAL"
    ),
    ubicacion: buscar("UBICACION", "LOCALIZACION"),
  };
}

function obtenerColumnas(filas, nombreHoja) {
  for (let i = 0; i < Math.min(filas.length, 50); i++) {
    const columnas = detectarColumnas(filas[i], i);

    if (!columnas) {
      continue;
    }

    // En INFORMATICA, el custodio anterior está
    // en una columna sin encabezado: columna I.
    if (
      normalizar(nombreHoja) === "INFORMATICA" &&
      columnas.custodioAnterior < 0
    ) {
      columnas.custodioAnterior = 8;
    }

    return columnas;
  }

  return null;
}

function leerHoja(libro, nombreHoja) {
  const hoja = libro.Sheets[nombreHoja];

  if (!hoja) {
    return [];
  }

  const filas = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    defval: "",
    raw: false,
  });

  const columnas = obtenerColumnas(filas, nombreHoja);

  if (!columnas) {
    throw new Error(
      `No se detectaron los encabezados de la hoja ${nombreHoja}.`
    );
  }

  const registros = [];
  let grupoActual = "";

  for (
    let i = columnas.filaEncabezado + 1;
    i < filas.length;
    i++
  ) {
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
      const observaciones = columnas.observaciones;

      registros.push({
        clave_origen: `${nombreHoja}:${i + 1}`,
        hoja: nombreHoja,
        facultad: CONFIG_HOJAS[nombreHoja].facultad,
        fila_excel: i + 1,
        item,
        cantidad,
        detalle,
        marca: texto(fila, columnas.marca),
        serie: texto(fila, columnas.serie),
        codigo: texto(fila, columnas.codigo),
        custodio_anterior: texto(
          fila,
          columnas.custodioAnterior
        ),
        observacion_1: texto(
          fila,
          observaciones[0] ?? -1
        ),
        observacion_2: texto(
          fila,
          observaciones[1] ?? -1
        ),
        custodio: texto(fila, columnas.custodio),
        ubicacion: texto(fila, columnas.ubicacion),
        grupo: grupoActual,
      });

      continue;
    }

    // Las filas sin ITEM ni CANT pueden representar
    // secciones o nombres de responsables.
    if (!item && !cantidadTexto && detalle) {
      grupoActual = detalle;
    }
  }

  return registros;
}

async function verificarTabla() {
  const { error } = await supabase
    .from("bienes_inventario")
    .select("id", {
      head: true,
      count: "exact",
    });

  if (error) {
    throw new Error(
      `No se pudo acceder a public.bienes_inventario: ${error.message}. ` +
      "Ejecuta primero el SQL de creación de la tabla."
    );
  }
}

async function main() {
  console.log("Leyendo archivo Excel...");

  const libro = XLSX.readFile(archivoExcel);

  const hojasDisponibles = new Set(libro.SheetNames);

  const nombresNecesarios = Object.keys(CONFIG_HOJAS);

  const faltantes = nombresNecesarios.filter(
    (nombre) => !hojasDisponibles.has(nombre)
  );

  if (faltantes.length > 0) {
    throw new Error(
      `Faltan hojas requeridas: ${faltantes.join(", ")}`
    );
  }

  const todosLosRegistros = nombresNecesarios.flatMap(
    (nombre) => leerHoja(libro, nombre)
  );

  if (todosLosRegistros.length === 0) {
    throw new Error(
      "No se encontraron registros para importar."
    );
  }

  console.log("\nResumen detectado antes de importar:");

  for (const hoja of nombresNecesarios) {
    const registros = todosLosRegistros.filter(
      (registro) => registro.hoja === hoja
    );

    const unidades = registros.reduce(
      (total, registro) =>
        total + Number(registro.cantidad || 0),
      0
    );

    console.log(
      `  ${hoja}: ${registros.length} registros / ${unidades} unidades`
    );
  }

  console.log(
    `Total: ${todosLosRegistros.length} registros.\n`
  );

  // Primero verificamos que la tabla exista y sea accesible.
  await verificarTabla();

  const TAMANO_LOTE = 300;

  for (
    let inicio = 0;
    inicio < todosLosRegistros.length;
    inicio += TAMANO_LOTE
  ) {
    const lote = todosLosRegistros.slice(
      inicio,
      inicio + TAMANO_LOTE
    );

    const { error } = await supabase
      .from("bienes_inventario")
      .upsert(lote, {
        onConflict: "clave_origen",
      });

    if (error) {
      throw new Error(
        `Falló el lote ${Math.floor(inicio / TAMANO_LOTE) + 1}: ` +
        error.message
      );
    }

    console.log(
      `Guardados/actualizados ${
        Math.min(inicio + lote.length, todosLosRegistros.length)
      } de ${todosLosRegistros.length} registros...`
    );
  }

  console.log("\nVerificación final en Supabase:");

  for (const hoja of nombresNecesarios) {
    const { count, error } = await supabase
      .from("bienes_inventario")
      .select("id", {
        head: true,
        count: "exact",
      })
      .eq("hoja", hoja);

    if (error) {
      throw new Error(
        `No se pudo verificar ${hoja}: ${error.message}`
      );
    }

    console.log(
      `  ${hoja}: ${count ?? 0} registros en la tabla`
    );
  }

  console.log(
    "\nImportación terminada. Los registros están en Supabase."
  );
}

main().catch((error) => {
  console.error(
    "\nERROR:",
    error instanceof Error ? error.message : error
  );

  process.exitCode = 1;
});