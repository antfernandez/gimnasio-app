"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { EjercicioRutina } from "@/lib/types";

export type RutinaFormState = {
  error?: string;
};

function readEjercicios(formData: FormData): EjercicioRutina[] {
  const ejercicios = formData.getAll("ejercicio").map((v) => String(v).trim());
  const series = formData.getAll("series").map((v) => String(v).trim());
  const reps = formData.getAll("reps").map((v) => String(v).trim());
  const notas = formData.getAll("notas").map((v) => String(v).trim());

  return ejercicios
    .map((ejercicio, i) => ({
      ejercicio,
      series: Number(series[i]) || 0,
      reps: Number(reps[i]) || 0,
      notas: notas[i] ?? "",
    }))
    .filter((e) => e.ejercicio.length > 0);
}

export async function createRutina(
  alumnoId: string,
  _prevState: RutinaFormState,
  formData: FormData,
): Promise<RutinaFormState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const objetivo = String(formData.get("objetivo") ?? "").trim() || null;
  const fechaAsignacion =
    String(formData.get("fecha_asignacion") ?? "").trim() || undefined;

  if (!nombre) {
    return { error: "Ingresa un nombre para la rutina." };
  }

  const contenido = readEjercicios(formData);
  if (contenido.length === 0) {
    return { error: "Agrega al menos un ejercicio a la rutina." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();

  // Solo puede haber una rutina activa por alumno: se desactiva la vigente
  // antes de insertar la nueva (ver modelo-datos-negocio.md).
  const { error: desactivarError } = await supabase
    .from("rutinas")
    .update({ activa: false })
    .eq("alumno_id", alumnoId)
    .eq("activa", true);

  if (desactivarError) {
    return { error: "No se pudo guardar la rutina. Intenta de nuevo." };
  }

  const { error } = await supabase.from("rutinas").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    alumno_id: alumnoId,
    creado_por: perfilData.perfil.id,
    nombre,
    objetivo,
    contenido,
    fecha_asignacion: fechaAsignacion,
    activa: true,
  });

  if (error) {
    return { error: "No se pudo guardar la rutina. Intenta de nuevo." };
  }

  revalidatePath("/protected/rutinas");
  revalidatePath(`/protected/rutinas/${alumnoId}`);
  redirect(`/protected/rutinas/${alumnoId}?creada=1`);
}
