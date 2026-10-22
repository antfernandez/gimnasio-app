import type { Plan } from "@/lib/types";

export type EstadoPlan = "vigente" | "proximo" | "de_baja";

export const ESTADO_PLAN_LABEL: Record<EstadoPlan, string> = {
  vigente: "Vigente",
  proximo: "Próximo",
  de_baja: "No vigente",
};

/** Estado de un plan según su rango de vigencia; `hoy` en formato `YYYY-MM-DD`. */
export function estadoPlan(
  plan: Pick<Plan, "fecha_vigencia_desde" | "fecha_vigencia_hasta">,
  hoy: string,
): EstadoPlan {
  if (plan.fecha_vigencia_desde > hoy) return "proximo";
  if (plan.fecha_vigencia_hasta && plan.fecha_vigencia_hasta < hoy) return "de_baja";
  return "vigente";
}
