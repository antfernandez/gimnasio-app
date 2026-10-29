"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlumnoActual } from "@/lib/alumno-portal";
import { buildFilasRegistroRutina } from "@/lib/bitacora";
import { createClient } from "@/lib/supabase/server";
import type { GuardarEjercicioInput, GuardarEjercicioResult } from "@/app/protected/bitacora/actions";
import { hoyIso, inicioDeSemana, sumarDias } from "@/lib/turnos";
import type { Rutina } from "@/lib/types";

export type ContactoFormState = {
  error?: string;
  ok?: boolean;
};

export async function updateContactoAlumno(
  _prevState: ContactoFormState,
  formData: FormData,
): Promise<ContactoFormState> {
  const email = String(formData.get("email") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ email, telefono })
    .eq("id", alumno.id);

  if (error) {
    return { error: "No se pudieron guardar tus datos. Intenta de nuevo." };
  }

  revalidatePath("/portal");
  return { ok: true };
}

export type BitacoraFormState = {
  error?: string;
};

/** Sprint 13, Parte E: registro propio de sesión de bitácora — la fecha se fuerza a
 * hoy en el servidor (defensa en profundidad junto con la política RLS de
 * `registros_rutina`, no solo el formulario que ya no muestra selector de fecha). */
export async function createRegistroRutinaPropio(
  _prevState: BitacoraFormState,
  formData: FormData,
): Promise<BitacoraFormState> {
  const rutinaId = String(formData.get("rutina_id") ?? "").trim();
  if (!rutinaId) {
    return { error: "No se encontró la rutina." };
  }

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");
  if (!alumno.puede_registrar_bitacora) {
    return { error: "Tu entrenador aún no habilitó el registro de bitácora propio." };
  }

  const supabase = await createClient();
  const { data: rutina } = await supabase
    .from("rutinas")
    .select("*")
    .eq("id", rutinaId)
    .eq("alumno_id", alumno.id)
    .maybeSingle();

  if (!rutina) {
    return { error: "No se encontró la rutina." };
  }

  const filas = buildFilasRegistroRutina((rutina as Rutina).contenido, formData);
  if (filas.length === 0) {
    return { error: "Registra al menos un ejercicio de la sesión." };
  }

  // Spec 31: una sesión por día y no más sesiones por semana que los días del plan.
  const hoy = hoyIso();
  const lunes = inicioDeSemana(hoy);
  const [{ data: planAlumno }, { data: semana }] = await Promise.all([
    alumno.plan_id
      ? supabase.from("planes").select("dias_por_semana").eq("id", alumno.plan_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("registros_rutina")
      .select("fecha")
      .eq("alumno_id", alumno.id)
      .gte("fecha", lunes)
      .lte("fecha", sumarDias(lunes, 6)),
  ]);
  const fechasSemana = new Set((semana ?? []).map((r) => r.fecha as string));
  if (fechasSemana.has(hoy)) {
    return { error: "Ya registraste la sesión de hoy." };
  }
  const limiteSemanal = (planAlumno as { dias_por_semana: number } | null)?.dias_por_semana;
  if (limiteSemanal && fechasSemana.size >= limiteSemanal) {
    return {
      error: `Tu plan incluye ${limiteSemanal} sesiones por semana y ya las registraste.`,
    };
  }

  const { error } = await supabase.from("registros_rutina").insert(
    filas.map((f) => ({
      gimnasio_id: alumno.gimnasio_id,
      alumno_id: alumno.id,
      rutina_id: rutinaId,
      fecha: hoyIso(),
      origen: "alumno",
      ...f,
    })),
  );

  if (error) {
    return { error: "No se pudo registrar la sesión. Intenta de nuevo." };
  }

  revalidatePath("/portal/bitacora");
  return {};
}

function numeroPropio(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Spec 33: el alumno guarda un solo ejercicio de la sesión de hoy (fila por fila).
 * La fecha se fuerza a hoy; un registro por rutina + ejercicio + día. Respeta
 * `puede_registrar_bitacora`; el tope semanal lo valida el trigger de la migración 0025. */
export async function guardarRegistroEjercicioPropio(
  rutinaId: string,
  ejercicioIndex: number,
  input: GuardarEjercicioInput,
): Promise<GuardarEjercicioResult> {
  const series = numeroPropio(input.series);
  const reps = numeroPropio(input.reps);
  const peso = numeroPropio(input.peso);
  if (series === null || reps === null || peso === null) {
    return { ok: false, error: "Series, reps y peso son obligatorios." };
  }
  if (!Number.isInteger(series) || series < 1 || !Number.isInteger(reps) || reps < 1) {
    return { ok: false, error: "Series y reps deben ser números enteros mayores a 0." };
  }
  if (peso < 0 || peso > 9999) {
    return { ok: false, error: "El peso no es válido." };
  }

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");
  if (!alumno.puede_registrar_bitacora) {
    return { ok: false, error: "Tu entrenador aún no habilitó el registro de bitácora propio." };
  }

  const supabase = await createClient();
  const { data: rutina } = await supabase
    .from("rutinas")
    .select("*")
    .eq("id", rutinaId)
    .eq("alumno_id", alumno.id)
    .maybeSingle();
  const ej = (rutina as Rutina | null)?.contenido[ejercicioIndex];
  if (!rutina || !ej) {
    return { ok: false, error: "No se encontró el ejercicio de la rutina." };
  }

  const fecha = hoyIso();
  const valores = {
    series_realizadas: series,
    reps_realizadas: reps,
    peso_kg: peso,
    notas: input.notas.trim() || null,
  };

  const { data: existente } = await supabase
    .from("registros_rutina")
    .select("id")
    .eq("alumno_id", alumno.id)
    .eq("rutina_id", rutinaId)
    .eq("fecha", fecha)
    .eq("ejercicio_index", ejercicioIndex)
    .limit(1)
    .maybeSingle();

  const { error } = existente
    ? await supabase.from("registros_rutina").update(valores).eq("id", existente.id)
    : await supabase.from("registros_rutina").insert({
        gimnasio_id: alumno.gimnasio_id,
        alumno_id: alumno.id,
        rutina_id: rutinaId,
        fecha,
        origen: "alumno",
        ejercicio_index: ejercicioIndex,
        ejercicio: ej.ejercicio,
        series_planificadas: ej.series || null,
        reps_planificadas: ej.reps || null,
        peso_planificado: ej.peso ?? null,
        ...valores,
      });

  if (error) {
    if (error.message.includes("limite_sesiones_semana")) {
      return { ok: false, error: "Ya registraste las sesiones por semana de tu plan." };
    }
    return { ok: false, error: "No se pudo guardar el ejercicio. Intenta de nuevo." };
  }

  revalidatePath("/portal/bitacora");
  return { ok: true };
}
