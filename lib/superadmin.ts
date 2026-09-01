import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * A diferencia de `getPerfilActual`/`getAlumnoActual`, esto NUNCA crea una fila —
 * el Superadmin se inserta a mano en la base (Parte C del Sprint 12), no hay alta
 * lazy. Devuelve `null` si el usuario autenticado no es superadmin.
 */
export const getSuperadminActual = cache(async (): Promise<{ id: string } | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("superadmins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return data ? { id: user.id } : null;
});
