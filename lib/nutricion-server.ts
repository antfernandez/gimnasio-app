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

/** URLs firmadas (1 h) de fotos de recetas del bucket privado `recetas-fotos` (spec 51),
 * indexadas por `foto_path`. La RLS de Storage decide qué rutas puede ver quien llama. */
export async function urlsFotosRecetas(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const rutas = [...new Set(paths.filter((p): p is string => !!p))];
  const mapa = new Map<string, string>();
  if (rutas.length === 0) return mapa;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("recetas-fotos").createSignedUrls(rutas, 3600);
  for (const f of data ?? []) if (f.path && f.signedUrl) mapa.set(f.path, f.signedUrl);
  return mapa;
}
