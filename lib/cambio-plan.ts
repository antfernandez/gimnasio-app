import type { EstadoCambioPlan } from "@/lib/types";

export const ESTADO_CAMBIO_PLAN_LABEL: Record<EstadoCambioPlan, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  aplicada: "Aplicada",
};

export const ESTADO_CAMBIO_PLAN_VARIANTE = {
  pendiente: "secondary",
  aprobada: "default",
  rechazada: "destructive",
  cancelada: "outline",
  aplicada: "success",
} as const;

/** Primer día con el plan nuevo: el día siguiente al vencimiento vigente, o `hoy` si no
 * hay periodo en curso. */
export function calcularAplicaDesde(vencimiento: string | null, hoy: string): string {
  if (!vencimiento || vencimiento < hoy) return hoy;
  const d = new Date(`${vencimiento}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
