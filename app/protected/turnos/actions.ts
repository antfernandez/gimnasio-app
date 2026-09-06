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

/** Sprint 18, Parte 3: "semana tipo de una vez" — carga varios bloques del mismo
 * día en un solo submit (filas dinámicas, mismo patrón `getAll` que
 * `buildFilasRegistroRutina`), en vez de repetir el formulario "Agregar" bloque
 * por bloque. Filas sin hora quedan descartadas silenciosamente (fila vacía al
 * final de la lista, por ejemplo). */
export async function crearHorariosMasivo(
  _prevState: HorarioFormState,
  formData: FormData,
): Promise<HorarioFormState> {
  const diaSemana = Number(String(formData.get("dia_semana") ?? "").trim());
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) {
    return { error: "Selecciona un día de la semana válido." };
  }

  const horas = formData.getAll("hora_inicio").map((v) => String(v).trim());
  const duraciones = formData.getAll("duracion_min").map((v) => String(v).trim());
  const cuposLista = formData.getAll("cupos").map((v) => String(v).trim());

  const filas = horas
    .map((horaInicio, i) => ({
      horaInicio,
      duracionMin: Number(duraciones[i] ?? ""),
      cupos: Number(cuposLista[i] ?? ""),
    }))
    .filter(
      (f) =>
        f.horaInicio &&
        Number.isFinite(f.duracionMin) &&
        f.duracionMin > 0 &&
        Number.isInteger(f.cupos) &&
        f.cupos > 0,
    );

  if (filas.length === 0) {
    return { error: "Agrega al menos un bloque con hora, duración y cupos válidos." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("horarios_disponibles").upsert(
    filas.map((f) => ({
      gimnasio_id: perfilData.perfil.gimnasio_id,
      dia_semana: diaSemana,
      hora_inicio: f.horaInicio,
      duracion_min: f.duracionMin,
      cupos: f.cupos,
    })),
    { onConflict: "gimnasio_id,dia_semana,hora_inicio", ignoreDuplicates: true },
  );

  if (error) {
    return { error: "No se pudo guardar la semana tipo. Intenta de nuevo." };
  }

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
  return {};
}

/** Sprint 18, Parte 3: duplica todos los bloques ya configurados de un día hacia
 * otros días elegidos — evita repetir el formulario "Agregar" para cada día que
 * comparte el mismo horario (caso típico: lunes a viernes idénticos). Usa
 * `ignoreDuplicates` para no fallar si algún bloque ya existe en el día destino. */
export async function duplicarHorarioDia(
  _prevState: HorarioFormState,
  formData: FormData,
): Promise<HorarioFormState> {
  const diaOrigen = Number(String(formData.get("dia_origen") ?? "").trim());
  if (!Number.isInteger(diaOrigen) || diaOrigen < 0 || diaOrigen > 6) {
    return { error: "Selecciona el día que quieres copiar." };
  }

  const diasDestino = formData
    .getAll("dias_destino")
    .map((v) => Number(String(v)))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6 && n !== diaOrigen);

  if (diasDestino.length === 0) {
    return { error: "Elige al menos un día destino distinto del día de origen." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: bloquesOrigen, error: errorLectura } = await supabase
    .from("horarios_disponibles")
    .select("hora_inicio, duracion_min, cupos, activo")
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("dia_semana", diaOrigen);

  if (errorLectura || !bloquesOrigen || bloquesOrigen.length === 0) {
    return { error: "El día de origen no tiene bloques configurados." };
  }

  const filas = diasDestino.flatMap((diaDestino) =>
    bloquesOrigen.map((b) => ({
      gimnasio_id: perfilData.perfil.gimnasio_id,
      dia_semana: diaDestino,
      hora_inicio: b.hora_inicio,
      duracion_min: b.duracion_min,
      cupos: b.cupos,
      activo: b.activo,
    })),
  );

  const { error } = await supabase
    .from("horarios_disponibles")
    .upsert(filas, { onConflict: "gimnasio_id,dia_semana,hora_inicio", ignoreDuplicates: true });

  if (error) {
    return { error: "No se pudo duplicar el día. Intenta de nuevo." };
  }

  revalidatePath("/protected/turnos/horario");
  revalidatePath("/protected/turnos");
  return {};
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
