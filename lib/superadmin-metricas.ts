import { suscripcionCongelada } from "@/lib/suscripcion-acceso";

export type EstadoSuscripcion = "activo" | "moroso" | "congelado" | "cancelado" | "sin_plan";

export const ESTADO_SUSCRIPCION_LABEL: Record<EstadoSuscripcion, string> = {
  activo: "Activo",
  moroso: "Moroso",
  congelado: "Congelado",
  cancelado: "Cancelado",
  sin_plan: "Sin plan",
};

/**
 * Única definición de "activo" y "moroso" (specs 46 y 47): cancelado manda; sin plan del
 * sistema es prueba; con plan, vencida o nunca pagada es morosa y, pasado 1 mes de
 * gracia, congelada (spec 49).
 * `hoy` es AAAA-MM-DD.
 */
export function estadoSuscripcion(
  g: { estado: string; plan_sistema_id: string | null; suscripcion_hasta: string | null },
  hoy: string,
): EstadoSuscripcion {
  if (g.estado === "cancelado") return "cancelado";
  if (!g.plan_sistema_id) return "sin_plan";
  if (suscripcionCongelada(g, hoy)) return "congelado";
  if (!g.suscripcion_hasta || g.suscripcion_hasta < hoy) return "moroso";
  return "activo";
}

export interface GimnasioSuscripcion {
  id: string;
  nombre: string;
  estado: string;
  plan_sistema_id: string | null;
  suscripcion_hasta: string | null;
  created_at: string;
}
