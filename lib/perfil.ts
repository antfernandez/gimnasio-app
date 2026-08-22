import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Gimnasio, Perfil } from "@/lib/types";

/**
 * Alta de gimnasio + perfil al primer login post-confirmación (no hay trigger en DB,
 * ver "Consideraciones de implementación" en modelo-datos-negocio.md). Requiere la
 * política de INSERT sobre `gimnasios` de `supabase/migrations/0002_alta_gimnasio.sql`.
 */
async function ensureGymProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<Perfil | null> {
  const { data: existing } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing as Perfil;

  const nombreCompleto =
    (user.user_metadata?.nombre_completo as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Dueño/a";
  const nombreGimnasio =
    (user.user_metadata?.nombre_gimnasio as string | undefined)?.trim() ||
    `Gimnasio de ${nombreCompleto}`;

  // Sin `.select()`: sobre `gimnasios` solo hay política de SELECT para gimnasios
  // a los que el usuario ya pertenece (por `perfiles`), así que leer de vuelta la
  // fila recién insertada aquí (antes de que exista el perfil) fallaría por RLS
  // aunque el INSERT en sí esté permitido. Generamos el id en la app para no
  // necesitar el RETURNING.
  const gimnasioId = crypto.randomUUID();
  const { error: gimError } = await supabase
    .from("gimnasios")
    .insert({ id: gimnasioId, nombre: nombreGimnasio });

  if (gimError) {
    console.error("No se pudo crear el gimnasio en el onboarding", gimError);
    return null;
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .insert({
      id: user.id,
      gimnasio_id: gimnasioId,
      nombre_completo: nombreCompleto,
      rol: "dueño",
    })
    .select()
    .single();

  if (perfilError || !perfil) {
    console.error("No se pudo crear el perfil en el onboarding", perfilError);
    return null;
  }

  return perfil as Perfil;
}

export const getPerfilActual = cache(async (): Promise<{
  perfil: Perfil;
  gimnasio: Gimnasio;
} | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const perfil = await ensureGymProfile(supabase, user);
  if (!perfil) return null;

  const { data: gimnasio } = await supabase
    .from("gimnasios")
    .select("*")
    .eq("id", perfil.gimnasio_id)
    .single();

  if (!gimnasio) return null;

  return { perfil, gimnasio: gimnasio as Gimnasio };
});
