import type { RecetaConMacros } from "@/components/nutricion/plan-nutricional-form";
import {
  macrosPorPorcion,
  macrosReceta,
  type Alimento,
  type Ingrediente,
  type Receta,
} from "@/lib/nutricion";
import { createClient } from "@/lib/supabase/server";

/** Recetas activas del gimnasio con sus macros por porción, para elegirlas en un plan.
 * Las recetas ya incluidas en el plan (`incluirIds`) se listan aunque hoy sean borrador. */
export async function cargarRecetasConMacros(
  gimnasioId: string,
  incluirIds: string[] = [],
): Promise<RecetaConMacros[]> {
  const supabase = await createClient();
  const [{ data: recetas }, { data: ingredientes }, { data: alimentos }] = await Promise.all([
    supabase.from("recetas").select("*").eq("gimnasio_id", gimnasioId).order("nombre"),
    supabase.from("receta_ingredientes").select("*").eq("gimnasio_id", gimnasioId),
    supabase.from("alimentos").select("*"),
  ]);

  const alimentoPorId = new Map(((alimentos ?? []) as Alimento[]).map((a) => [a.id, a]));
  const ingPorReceta = new Map<string, Ingrediente[]>();
  for (const i of (ingredientes ?? []) as Ingrediente[]) {
    ingPorReceta.set(i.receta_id, [...(ingPorReceta.get(i.receta_id) ?? []), i]);
  }

  return ((recetas ?? []) as Receta[])
    .filter((r) => r.estado === "activo" || incluirIds.includes(r.id))
    .map((r) => ({
      ...r,
      porPorcion: macrosPorPorcion(macrosReceta(ingPorReceta.get(r.id) ?? [], alimentoPorId), r.porciones),
    }));
}
