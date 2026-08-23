import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { slugify, withRandomSuffix } from "@/lib/slug";
import type { Gimnasio, Perfil } from "@/lib/types";

const UNIQUE_VIOLATION = "23505";
const MAX_SLUG_ATTEMPTS = 5;

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
  //
  // La misma política de SELECT impide "consultar antes" si un slug ya está en
  // uso por otro gimnasio (no lo veríamos), así que la unicidad se resuelve
  // dejando que la constraint de la migración 0003 rechace el INSERT (23505) y
  // reintentando con un sufijo aleatorio.
  const gimnasioId = crypto.randomUUID();
  const baseSlug = slugify(nombreGimnasio);
  let slug = baseSlug;
  let gimError = null;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { error } = await supabase
      .from("gimnasios")
      .insert({ id: gimnasioId, nombre: nombreGimnasio, slug });
    gimError = error;
    if (!error || error.code !== UNIQUE_VIOLATION) break;
    slug = withRandomSuffix(baseSlug);
  }

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
