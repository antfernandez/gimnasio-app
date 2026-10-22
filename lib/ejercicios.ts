import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Ejercicio, ZonaCuerpo } from "@/lib/types";

/** Páginas de `/protected/ejercicios`: solo el dueño. El entrenador lee el
 * catálogo únicamente a través del selector de rutinas (spec §4). */
export async function exigirDueno() {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (perfilData.perfil.rol !== "dueño") redirect("/protected");
  return perfilData;
}

export async function fetchZonas(): Promise<ZonaCuerpo[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("zonas_cuerpo")
    .select("*")
    .order("orden", { ascending: true })
    .order("nombre", { ascending: true });
  return (data ?? []) as ZonaCuerpo[];
}

export async function fetchEjercicios({
  soloActivos = false,
}: { soloActivos?: boolean } = {}): Promise<Ejercicio[]> {
  const supabase = await createClient();
  let query = supabase.from("ejercicios").select("*");
  if (soloActivos) query = query.eq("activo", true);
  const { data } = await query.order("nombre", { ascending: true });
  return (data ?? []) as Ejercicio[];
}
