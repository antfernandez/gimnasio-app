import type { SupabaseClient } from "@supabase/supabase-js";

/** Planes del sistema que paga la dueña (Specs 30 y 41). La fuente de verdad es la tabla `planes_sistema`. */
export const IVA_PCT_DEFECTO = 19;

export type FuncionSistema = { titulo: string; detalle: string };

export type PlanSistema = {
  id: string;
  nombre: string;
  maxAlumnos: number | null;
  precioNeto: number;
  ivaPct: number;
  descripcion: string | null;
  caracteristicas: FuncionSistema[];
};

export const COLUMNAS_PLAN_SISTEMA =
  "id, nombre, max_alumnos, precio_mensual, iva_pct, descripcion, caracteristicas";

type FilaPlanSistema = {
  id: string;
  nombre: string;
  max_alumnos: number | null;
  precio_mensual: number | string;
  iva_pct: number | string;
  descripcion: string | null;
  caracteristicas: FuncionSistema[] | null;
};

export function mapearPlanSistema(f: FilaPlanSistema): PlanSistema {
  return {
    id: f.id,
    nombre: f.nombre,
    maxAlumnos: f.max_alumnos,
    precioNeto: Number(f.precio_mensual),
    ivaPct: Number(f.iva_pct),
    descripcion: f.descripcion,
    caracteristicas: f.caracteristicas ?? [],
  };
}

/** Planes ofrecidos hoy: activos y con vigencia que incluye `hoy` (AAAA-MM-DD), por orden. */
export async function planesSistemaVigentes(
  supabase: SupabaseClient,
  hoy: string,
): Promise<PlanSistema[]> {
  const { data } = await supabase
    .from("planes_sistema")
    .select(COLUMNAS_PLAN_SISTEMA)
    .eq("activo", true)
    .lte("vigente_desde", hoy)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
    .order("orden");
  return ((data ?? []) as FilaPlanSistema[]).map(mapearPlanSistema);
}

/** Un plan por id, sin filtro de vigencia (el plan actual de un gimnasio puede haber vencido). */
export async function planSistemaPorId(
  supabase: SupabaseClient,
  id: string,
): Promise<PlanSistema | null> {
  const { data } = await supabase
    .from("planes_sistema")
    .select(COLUMNAS_PLAN_SISTEMA)
    .eq("id", id)
    .maybeSingle();
  return data ? mapearPlanSistema(data as FilaPlanSistema) : null;
}

/** Precio mensual con IVA incluido. */
export function precioMensualConIva(precioNeto: number, ivaPct: number = IVA_PCT_DEFECTO): number {
  return Math.round(precioNeto * (1 + ivaPct / 100));
}

/** Total a pagar por `meses` meses, con IVA. Sin descuento por pago anticipado. */
export function calcularMontoSuscripcion(
  precioNeto: number,
  meses: number,
  ivaPct: number = IVA_PCT_DEFECTO,
): number {
  return precioMensualConIva(precioNeto, ivaPct) * meses;
}

export const FUNCIONES_VISIBLES = 4;
