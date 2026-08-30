"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { PRESET_HORARIO_VALINOR } from "@/lib/turnos";
import { createClient } from "@/lib/supabase/server";

export type HorarioFormState = {
  error?: string;
};

export async function crearHorario(
  _prevState: HorarioFormState,
  formData: FormData,
): Promise<HorarioFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const diaSemana = Number(trim("dia_semana"));
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    return { error: "Selecciona un día de la semana válido." };
  }
  const horaInicio = trim("hora_inicio");
  if (!horaInicio) return { error: "Ingresa una hora de inicio." };

  const duracionMin = Number(trim("duracion_min"));
  if (!Number.isFinite(duracionMin) || duracionMin <= 0) {
    return { error: "Ingresa una duración válida (en minutos)." };
  }
  const cupos = Number(trim("cupos"));
  if (!Number.isInteger(cupos) || cupos <= 0) {
    return { error: "Ingresa un número de cupos válido." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("horarios_disponibles").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    duracion_min: duracionMin,
    cupos,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un horario configurado para ese día y esa hora." };
    }
    return { error: "No se pudo guardar el horario. Intenta de nuevo." };
  }

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
  return {};
}

export async function eliminarHorario(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("horarios_disponibles").delete().eq("id", id);

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
}

export async function alternarHorarioActivo(
  id: string,
  activo: boolean,
): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("horarios_disponibles").update({ activo }).eq("id", id);

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
}

/** Carga de una vez el horario real de Valinor (informe de la dueña) como punto de
 * partida editable — no reemplaza lo ya configurado, usa `on conflict do nothing`
 * sobre el mismo horario/día para no duplicar si se aplica más de una vez. */
export async function aplicarPresetValinor(): Promise<HorarioFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const filas = PRESET_HORARIO_VALINOR.map((f) => ({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    dia_semana: f.dia_semana,
    hora_inicio: f.hora_inicio,
    duracion_min: 90,
    cupos: 2,
  }));

  const { error } = await supabase
    .from("horarios_disponibles")
    .upsert(filas, { onConflict: "gimnasio_id,dia_semana,hora_inicio", ignoreDuplicates: true });

  if (error) {
    return { error: "No se pudo cargar el horario de ejemplo. Intenta de nuevo." };
  }

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
  return {};
}

export type ReservaFormState = {
  error?: string;
};

export async function crearReservaDueno(
  _prevState: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const alumnoId = trim("alumno_id");
  const fecha = trim("fecha");
  const horaInicio = trim("hora_inicio");
  const duracionMin = Number(trim("duracion_min"));
  if (!alumnoId || !fecha || !horaInicio || !Number.isFinite(duracionMin)) {
    return { error: "Selecciona un alumno y un turno válidos." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("reservas").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    alumno_id: alumnoId,
    fecha,
    hora_inicio: horaInicio,
    duracion_min: duracionMin,
    creado_por: "dueño",
  });

  if (error) {
    if (error.message?.includes("cupos")) {
      return { error: "No quedan cupos disponibles para ese turno." };
    }
    if (error.code === "23505") {
      return { error: "Ese alumno ya tiene una reserva vigente en ese turno." };
    }
    return { error: "No se pudo crear la reserva. Intenta de nuevo." };
  }

  revalidatePath("/protected/turnos");
  revalidatePath("/protected");
  return {};
}

export async function cancelarReservaDueno(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("reservas").update({ estado: "cancelada" }).eq("id", id);

  revalidatePath("/protected/turnos");
  revalidatePath("/protected");
}

export async function reprogramarReservaDueno(
  _prevState: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();
  const reservaId = trim("reserva_id");
  const nuevaFecha = trim("fecha");
  const nuevaHora = trim("hora_inicio");
  if (!reservaId || !nuevaFecha || !nuevaHora) {
    return { error: "Completa la nueva fecha y hora." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reprogramar_reserva", {
    p_reserva_id: reservaId,
    p_nueva_fecha: nuevaFecha,
    p_nueva_hora: nuevaHora,
  });

  revalidatePath("/protected/turnos");
  revalidatePath("/protected");

  if (error) {
    if (error.message?.includes("cupos")) {
      return { error: "No quedan cupos disponibles en el nuevo horario elegido." };
    }
    return { error: "No se pudo reprogramar la reserva. Intenta de nuevo." };
  }
  return {};
}

export async function marcarAlertaVista(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("reservas").update({ atendido_por_dueno: true }).eq("id", id);

  revalidatePath("/protected/turnos");
  revalidatePath("/protected");
}

/** Sprint 9: marca una reserva pasada como "realizada" — asistencia normal o
 * inasistencia sin aviso, ambas se cobran igual (regla del Sprint 8) y ambas
 * descuentan una clase del paquete vigente vía el trigger `consumir_clase_paquete`
 * (migración 0007). Las cancelaciones tardías ya llegan a 'realizada' solas, por el
 * trigger `reservas_before_update`; este botón cubre el resto de los casos, donde
 * nadie canceló nada. */
export async function marcarReservaRealizada(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  await supabase.from("reservas").update({ estado: "realizada" }).eq("id", id);

  revalidatePath("/protected/turnos");
  revalidatePath("/protected");
}
