"use server";

import { revalidatePath } from "next/cache";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";

export type PermisoAlumno = "puede_registrar_avances" | "puede_registrar_bitacora";

const PERMISOS: PermisoAlumno[] = ["puede_registrar_avances", "puede_registrar_bitacora"];

/** Cambia un permiso a uno o varios alumnos del gimnasio. Solo el dueño (spec 22). */
export async function setPermisoAlumnos(
  ids: string[],
  permiso: PermisoAlumno,
  valor: boolean,
): Promise<{ error?: string }> {
  if (!PERMISOS.includes(permiso) || ids.length === 0) return { error: "Solicitud inválida." };

  const data = await getPerfilActual();
  if (!data) return { error: "Sesión no válida." };
  if (data.perfil.rol !== "dueño") return { error: "Solo el dueño puede cambiar permisos." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ [permiso]: valor })
    .eq("gimnasio_id", data.perfil.gimnasio_id)
    .in("id", ids);

  if (error) return { error: "No se pudo actualizar el permiso." };

  revalidatePath("/protected/permisos");
  revalidatePath("/portal");
  return {};
}
