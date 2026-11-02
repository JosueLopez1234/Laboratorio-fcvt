/* Fechas compartidas (antes repetidas en 6 pantallas). */

/** Hoy como "2026-10-17", en la zona horaria del dispositivo. */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** "2026-10-17" -> "17/10/2026" */
export const formatoFecha = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-10-17" -> "17 Oct 2026" */
export const fechaLarga = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d} ${MESES[Number(m) - 1]} ${y}`;
};