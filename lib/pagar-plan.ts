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
