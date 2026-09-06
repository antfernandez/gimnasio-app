"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildFilasRegistroRutina } from "@/lib/bitacora";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { Asistencia, Rutina } from "@/lib/types";

export type BitacoraFormState = {
  error?: string;
};

/** Sprint 19, Parte 1: check rápido de asistencia desde la lista de "Alumnos
 * citados" del bloque, sin necesidad de entrar a la ficha ni a la rutina. Solo
 * "presente" pasa `estado` a 'realizada' — eso es lo único que dispara
 * `consumir_clase_paquete` (migración 0007), así que "ausente"/"justificado"
 * quedan registrados sin descontar clase del paquete, tal como pide la auditoría
 * UX. No se permite volver a marcar una reserva que ya quedó en 'realizada'
 * (evita descontar dos veces o revertir una clase ya consumida). */
export async function marcarAsistencia(
  reservaId: string,
  asistencia: Asistencia,
): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const update: { asistencia: Asistencia; estado?: "realizada" } = { asistencia };
  if (asistencia === "presente") update.estado = "realizada";

  await supabase
    .from("reservas")
    .update(update)
    .eq("id", reservaId)
    .eq("estado", "reservada");

  revalidatePath("/protected/bitacora");
  revalidatePath("/protected");
  revalidatePath("/protected/turnos");
}

/** Movido desde `app/protected/alumnos/actions.ts` (Sprint 15, Parte B): registro de
 * sesión de bitácora hecho por el dueño/entrenador, ahora desde la pantalla propia
 * "Bitácora" (organizada por fecha + bloque horario) en vez de la ficha del alumno —
 * sin restricción de fecha (a diferencia del registro propio del alumno). `fechaBloque`
 * y `horaBloque` solo se usan para volver a la misma selección después de guardar. */
export async function createRegistroRutina(
  alumnoId: string,
  rutinaId: string,
  fechaBloque: string,
  horaBloque: string,
  _prevState: BitacoraFormState,
  formData: FormData,
): Promise<BitacoraFormState> {
  const fecha = String(formData.get("fecha") ?? "").trim();
  if (!fecha) {
    return { error: "Selecciona una fecha." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: rutina } = await supabase
    .from("rutinas")
    .select("*")
    .eq("id", rutinaId)
    .maybeSingle();

  if (!rutina) {
    return { error: "No se encontró la rutina." };
  }

  const filas = buildFilasRegistroRutina((rutina as Rutina).contenido, formData);
  if (filas.length === 0) {
    return { error: "Registra al menos un ejercicio de la sesión." };
  }

  const { error } = await supabase.from("registros_rutina").insert(
    filas.map((f) => ({
      gimnasio_id: perfilData.perfil.gimnasio_id,
      alumno_id: alumnoId,
      rutina_id: rutinaId,
      fecha,
      registrado_por: perfilData.perfil.id,
      origen: "dueño",
      ...f,
    })),
  );

  if (error) {
    return { error: "No se pudo registrar la sesión. Intenta de nuevo." };
  }

  revalidatePath("/protected/bitacora");
  const query = new URLSearchParams({
    fecha: fechaBloque,
    hora: horaBloque,
    alumno: alumnoId,
    bitacora: "1",
  });
  redirect(`/protected/bitacora?${query.toString()}`);
}
