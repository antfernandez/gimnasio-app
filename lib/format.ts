/** Formatea una fecha "YYYY-MM-DD" como "DD/MM/YYYY" sin pasar por Date (evita
 * corrimientos de un día por zona horaria al parsear un date-only string). */
export function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/** Formatea un monto como pesos chilenos (ej. 15000 -> "$15.000"). */
export function formatMonto(monto: number): string {
  return CLP.format(monto);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "oct 2026" desde "2026-10-01". */
export function formatMesAnio(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MESES[Number(m) - 1]} ${y}`;
}

/** Período cubierto: "oct 2026" o "oct 2026 – dic 2026" según los meses pagados. */
export function formatPeriodo(desdeIso: string, meses: number): string {
  const [y, m] = desdeIso.split("-").map(Number);
  const fin = new Date(Date.UTC(y, m - 1 + meses - 1, 1)).toISOString().slice(0, 10);
  return meses === 1 ? formatMesAnio(desdeIso) : `${formatMesAnio(desdeIso)} – ${formatMesAnio(fin)}`;
}
