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
