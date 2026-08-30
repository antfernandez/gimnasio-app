import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Alumno } from "@/lib/types";

/**
 * Vinculación de la cuenta del alumno a su fila en `alumnos`, en el primer
 * login post-confirmación — mismo patrón que `ensureGymProfile` (lib/perfil.ts)
 * pero para el rol Alumno (que no tiene fila en `perfiles`, ver
 * supabase/migrations/0004_portal_alumno.sql). Los datos vienen del
 * `user_metadata` guardado en `auth.signUp()` (components/sign-up-alumno-form.tsx).
 */
async function ensureAlumnoLink(
  supabase: SupabaseClient,
  user: User,
): Promise<Alumno | null> {
  const { data: existing } = await supabase
    .from("alumnos")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing as Alumno;

  const meta = user.user_metadata ?? {};
  const gimnasioId = meta.gimnasio_id as string | undefined;
  const rut = meta.rut as number | undefined;
  const digVer = meta.dig_ver as string | undefined;
  if (!gimnasioId || rut === undefined || !digVer) {
    // Esta cuenta no vino del registro de alumno (ej. es una cuenta de
    // dueño sin fila en `alumnos`) — nada que vincular.
    return null;
  }

  const { data: alumno, error } = await supabase
    .from("alumnos")
    .insert({
      user_id: user.id,
      gimnasio_id: gimnasioId,
      rut,
      dig_ver: digVer,
      nombres: (meta.nombres as string | undefined)?.trim() || "Alumno/a",
      apellidos: (meta.apellidos as string | undefined)?.trim() || "",
      email: user.email ?? null,
      telefono: (meta.telefono as string | undefined)?.trim() || null,
      plan_contratado:
        (meta.plan_interes as string | undefined)?.trim() || "Por definir",
    })
    .select()
    .single();

  if (error || !alumno) {
    console.error("No se pudo vincular la cuenta de alumno", error);
    return null;
  }

  return alumno as Alumno;
}

export const getAlumnoActual = cache(async (): Promise<Alumno | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return ensureAlumnoLink(supabase, user);
});
