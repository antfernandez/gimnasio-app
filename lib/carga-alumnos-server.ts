import { estadoPlan } from "@/lib/planes";
import { createClient } from "@/lib/supabase/server";
import type { PlanCarga } from "@/lib/carga-alumnos";
import type { Plan } from "@/lib/types";

/** Planes vigentes del gimnasio, para la lista desplegable y para resolver el plan por nombre. */
export async function planesVigentes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  gimnasioId: string,
  hoy: string,
): Promise<PlanCarga[]> {
  const { data } = await supabase
    .from("planes")
    .select("id, nombre, precio, fecha_vigencia_desde, fecha_vigencia_hasta")
    .eq("gimnasio_id", gimnasioId)
    .order("nombre");
  return ((data ?? []) as Pick<Plan, "id" | "nombre" | "precio" | "fecha_vigencia_desde" | "fecha_vigencia_hasta">[])
    .filter((p) => estadoPlan(p, hoy) === "vigente")
    .map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio }));
}
