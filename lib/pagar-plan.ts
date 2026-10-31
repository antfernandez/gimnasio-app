export const MESES_PAGO = [1, 2, 3, 6, 12] as const;
export type MesesPago = (typeof MESES_PAGO)[number];

export const COMPROBANTE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPROBANTE_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function esMesesValido(n: number): n is MesesPago {
  return (MESES_PAGO as readonly number[]).includes(n);
}

/** Sin descuento por pago anticipado (Spec 23 §9): total = precio × meses. */
export function calcularMonto(precioMensual: number, meses: number): number {
  return Math.round(precioMensual * meses);
}

export const ESTADO_SOLICITUD_LABEL = {
  pendiente: "Pendiente de validación",
  confirmado: "Confirmado",
  rechazado: "Rechazado",
} as const;

function aIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Suma `meses` a una fecha ISO con el mismo criterio que Postgres (`+ make_interval(months)`:
 * si el día no existe en el mes destino, queda el último día de ese mes). */
export function sumarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const destino = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(d, ultimo));
  return aIso(destino);
}

/** Primer día cubierto por el próximo pago de suscripción: el día siguiente al vencimiento
 * si aún está vigente (misma regla que `aplicar_solicitud_pago`), o hoy. */
export function inicioPeriodoSuscripcion(vencimiento: string | null | undefined, hoy: string): string {
  if (vencimiento && vencimiento >= hoy) {
    return aIso(new Date(Date.parse(`${vencimiento}T00:00:00Z`) + 86_400_000));
  }
  return hoy;
}

/** Rango `[desde, hasta]` (inclusive) que cubre pagar `meses` desde `inicio`. */
export function rangoPeriodo(inicio: string, meses: number): { desde: string; hasta: string } {
  const finExclusivo = sumarMeses(inicio, meses);
  return { desde: inicio, hasta: aIso(new Date(Date.parse(`${finExclusivo}T00:00:00Z`) - 86_400_000)) };
}
