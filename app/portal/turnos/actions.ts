"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";

export type ReservaFormState = {
  error?: string;
};

export async function crearReservaAlumno(
  _prevState: ReservaFormState,
  formData: FormData,
): Promise<ReservaFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const fecha = trim("fecha");
  const horaInicio = trim("hora_inicio");
  const duracionMin = Number(trim("duracion_min"));
  if (!fecha || !horaInicio || !Number.isFinite(duracionMin)) {
    return { error: "Selecciona un turno válido." };
  }

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("reservas").insert({
    gimnasio_id: alumno.gimnasio_id,
    alumno_id: alumno.id,
    fecha,
    hora_inicio: horaInicio,
    duracion_min: duracionMin,
    creado_por: "alumno",
  });

  if (error) {
    if (error.message?.includes("cupos")) {
      return { error: "No quedan cupos disponibles para ese turno." };
    }
    if (error.code === "23505") {
      return { error: "Ya tienes una reserva vigente en ese turno." };
    }
    return { error: "No se pudo reservar el turno. Intenta de nuevo." };
  }

  revalidatePath("/portal/turnos");
  return {};
}

export async function cancelarReservaAlumno(id: string): Promise<void> {
  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");

  const supabase = await createClient();
  await supabase
    .from("reservas")
    .update({ estado: "cancelada" })
    .eq("id", id)
    .eq("alumno_id", alumno.id);

  revalidatePath("/portal/turnos");
}

export async function reprogramarReservaAlumno(
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

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reprogramar_reserva", {
    p_reserva_id: reservaId,
    p_nueva_fecha: nuevaFecha,
    p_nueva_hora: nuevaHora,
  });

  revalidatePath("/portal/turnos");

  if (error) {
    if (error.message?.includes("cupos")) {
      return { error: "No quedan cupos disponibles en el nuevo horario elegido." };
    }
    return { error: "No se pudo reprogramar tu reserva. Intenta de nuevo." };
  }
  return {};
}
