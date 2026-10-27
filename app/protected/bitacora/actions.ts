"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { Asistencia, Rutina } from "@/lib/types";

/** Asistencia de una reserva (Spec 16; Bitácora y Turnos usan esta misma acción):
 * - "presente": camino feliz, la clase queda realizada y se descuenta del paquete.
 * - "ausente": no fue; la clase **se cuenta como realizada** (`estado` pasa a
 *   'realizada', lo que dispara `consumir_clase_paquete`, migración 0007) y ya no se
 *   puede reprogramar.
 * - "justificado": no fue, pero la clase **no** se cuenta; `estado` sigue en
 *   'reservada' (no dispara el trigger) y el saldo del paquete queda intacto.
 * La fecha de la clase queda siempre en la propia reserva. Una reserva ya 'realizada'
 * no se vuelve a marcar (evita descontar dos veces o revertir una clase consumida). */
export async function marcarAsistencia(
  reservaId: string,
  asistencia: Asistencia,
): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const update: { asistencia: Asistencia; estado?: "realizada" } = { asistencia };
  if (asistencia !== "justificado") update.estado = "realizada";

  await supabase
    .from("reservas")
    .update(update)
    .eq("id", reservaId)
    .eq("estado", "reservada");

  revalidatePath("/protected/bitacora");
  revalidatePath("/protected");
  revalidatePath("/protected/turnos");
}

export type GuardarEjercicioInput = {
  series: string;
  reps: string;
  peso: string;
  notas: string;
};

export type GuardarEjercicioResult = { ok: true } | { ok: false; error: string };

function numero(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Spec 13: registra (o actualiza) un solo ejercicio de la sesión, para guardar fila
 * por fila a medida que el alumno entrena. Hay un registro por alumno + rutina +
 * fecha + ejercicio: guardar de nuevo la misma fila lo modifica. Series, reps y peso
 * son obligatorios; notas no. No se aceptan fechas posteriores a hoy. */
export async function guardarRegistroEjercicio(
  alumnoId: string,
  rutinaId: string,
  fecha: string,
  ejercicioIndex: number,
  input: GuardarEjercicioInput,
): Promise<GuardarEjercicioResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { ok: false, error: "Fecha inválida." };
  }
  if (fecha > hoyIso()) {
    return { ok: false, error: "No se puede registrar la bitácora de una fecha futura." };
  }

  const series = numero(input.series);
  const reps = numero(input.reps);
  const peso = numero(input.peso);
  if (series === null || reps === null || peso === null) {
    return { ok: false, error: "Series, reps y peso son obligatorios." };
  }
  if (!Number.isInteger(series) || series < 1 || !Number.isInteger(reps) || reps < 1) {
    return { ok: false, error: "Series y reps deben ser números enteros mayores a 0." };
  }
  if (peso < 0 || peso > 9999) {
    return { ok: false, error: "El peso no es válido." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: rutina } = await supabase
    .from("rutinas")
    .select("*")
    .eq("id", rutinaId)
    .eq("alumno_id", alumnoId)
    .maybeSingle();
  const ej = (rutina as Rutina | null)?.contenido[ejercicioIndex];
  if (!rutina || !ej) {
    return { ok: false, error: "No se encontró el ejercicio de la rutina." };
  }

  const valores = {
    series_realizadas: series,
    reps_realizadas: reps,
    peso_kg: peso,
    notas: input.notas.trim() || null,
  };

  const { data: existente } = await supabase
    .from("registros_rutina")
    .select("id")
    .eq("alumno_id", alumnoId)
    .eq("rutina_id", rutinaId)
    .eq("fecha", fecha)
    .eq("ejercicio_index", ejercicioIndex)
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("registros_rutina").update(valores).eq("id", existente.id)
    : await supabase.from("registros_rutina").insert({
        gimnasio_id: perfilData.perfil.gimnasio_id,
        alumno_id: alumnoId,
        rutina_id: rutinaId,
        fecha,
        registrado_por: perfilData.perfil.id,
        origen: "dueño",
        ejercicio_index: ejercicioIndex,
        ejercicio: ej.ejercicio,
        series_planificadas: ej.series || null,
        reps_planificadas: ej.reps || null,
        peso_planificado: ej.peso ?? null,
        ...valores,
      });

  if (error) {
    return { ok: false, error: "No se pudo guardar el ejercicio. Intenta de nuevo." };
  }

  revalidatePath("/protected/bitacora");
  return { ok: true };
}
