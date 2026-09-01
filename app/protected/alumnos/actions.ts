"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildFilasRegistroRutina } from "@/lib/bitacora";
import { getPerfilActual } from "@/lib/perfil";
import { parseRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import type { MedidasAvance, Rutina, RutinaPlantilla } from "@/lib/types";

export type AlumnoFormState = {
  error?: string;
};

type AlumnoInput = {
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  plan_id: string | null;
  fecha_inicio: string | undefined;
  alergias: string | null;
  enfermedades: string | null;
  lesiones: string | null;
  objetivos_salud: string | null;
};

function readAlumnoForm(formData: FormData): AlumnoInput {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    nombres: trim("nombres"),
    apellidos: trim("apellidos"),
    email: trim("email") || null,
    telefono: trim("telefono") || null,
    fecha_nacimiento: trim("fecha_nacimiento") || null,
    plan_id: trim("plan_id") || null,
    fecha_inicio: trim("fecha_inicio") || undefined,
    alergias: trim("alergias") || null,
    enfermedades: trim("enfermedades") || null,
    lesiones: trim("lesiones") || null,
    objetivos_salud: trim("objetivos_salud") || null,
  };
}

function validateAlumnoInput(data: AlumnoInput): string | null {
  if (!data.nombres || !data.apellidos) {
    return "Nombres y apellidos son obligatorios.";
  }
  return null;
}

export async function createAlumno(
  _prevState: AlumnoFormState,
  formData: FormData,
): Promise<AlumnoFormState> {
  const rutInput = String(formData.get("rut") ?? "").trim();
  const parsedRut = parseRut(rutInput);
  if (!parsedRut) {
    return { error: "El RUT ingresado no es válido. Revisa el dígito verificador." };
  }

  const data = readAlumnoForm(formData);
  const validationError = validateAlumnoInput(data);
  if (validationError) return { error: validationError };

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("alumnos").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    rut: parsedRut.rut,
    dig_ver: parsedRut.dv,
    ...data,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un alumno con ese RUT en tu gimnasio." };
    }
    return { error: "No se pudo guardar el alumno. Intenta de nuevo." };
  }

  revalidatePath("/protected/alumnos");
  revalidatePath("/protected");
  redirect("/protected/alumnos?creado=1");
}

export async function updateAlumno(
  id: string,
  _prevState: AlumnoFormState,
  formData: FormData,
): Promise<AlumnoFormState> {
  const data = readAlumnoForm(formData);
  const validationError = validateAlumnoInput(data);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("alumnos").update(data).eq("id", id);

  if (error) {
    return { error: "No se pudo guardar la ficha. Intenta de nuevo." };
  }

  revalidatePath("/protected/alumnos");
  revalidatePath(`/protected/alumnos/${id}`);
  revalidatePath("/protected");
  redirect("/protected/alumnos?actualizado=1");
}

export async function setAlumnoActivo(id: string, activo: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ activo })
    .eq("id", id);

  if (error) {
    throw new Error("No se pudo actualizar el estado del alumno.");
  }

  revalidatePath("/protected/alumnos");
  revalidatePath(`/protected/alumnos/${id}`);
  revalidatePath("/protected");
}

export async function setPuedeRegistrarAvances(id: string, valor: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ puede_registrar_avances: valor })
    .eq("id", id);

  if (error) {
    throw new Error("No se pudo actualizar el permiso de avances.");
  }

  revalidatePath(`/protected/alumnos/${id}`);
}

export async function setPuedeRegistrarBitacora(id: string, valor: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ puede_registrar_bitacora: valor })
    .eq("id", id);

  if (error) {
    throw new Error("No se pudo actualizar el permiso de bitácora.");
  }

  revalidatePath(`/protected/alumnos/${id}`);
}

/** Cola de aprobación (Sprint 12, Parte D): alumnos que se autorregistraron y
 * todavía no fueron revisados por el Admin. */
export async function aprobarAlumno(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ estado_aprobacion: "aprobado" })
    .eq("id", id);

  if (error) {
    throw new Error("No se pudo aprobar al alumno.");
  }

  revalidatePath("/protected/alumnos/pendientes");
  revalidatePath("/protected/alumnos");
  revalidatePath("/protected");
}

export async function rechazarAlumno(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({ estado_aprobacion: "rechazado" })
    .eq("id", id);

  if (error) {
    throw new Error("No se pudo rechazar al alumno.");
  }

  revalidatePath("/protected/alumnos/pendientes");
  revalidatePath("/protected/alumnos");
  revalidatePath("/protected");
}

export type AsignarRutinaFormState = {
  error?: string;
};

/** Sprint 14, Parte C: asigna una plantilla del catálogo (`rutina_plantillas`) a un
 * alumno — copia el contenido como snapshot a una nueva fila de `rutinas` (mismo
 * criterio de snapshot que ya usaba la rutina antes de este sprint, para que editar
 * la plantilla después no reescriba el historial de alumnos que ya la tuvieron
 * asignada). */
export async function asignarRutina(
  alumnoId: string,
  _prevState: AsignarRutinaFormState,
  formData: FormData,
): Promise<AsignarRutinaFormState> {
  const plantillaId = String(formData.get("plantilla_id") ?? "").trim();
  const fechaAsignacion = String(formData.get("fecha_asignacion") ?? "").trim() || undefined;

  if (!plantillaId) {
    return { error: "Selecciona una plantilla." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: plantilla } = await supabase
    .from("rutina_plantillas")
    .select("*")
    .eq("id", plantillaId)
    .maybeSingle();

  if (!plantilla) {
    return { error: "No se encontró la plantilla seleccionada." };
  }
  const p = plantilla as RutinaPlantilla;

  // Solo puede haber una rutina activa por alumno: se desactiva la vigente antes de
  // insertar la nueva.
  const { error: desactivarError } = await supabase
    .from("rutinas")
    .update({ activa: false })
    .eq("alumno_id", alumnoId)
    .eq("activa", true);

  if (desactivarError) {
    return { error: "No se pudo asignar la rutina. Intenta de nuevo." };
  }

  const { error } = await supabase.from("rutinas").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    alumno_id: alumnoId,
    creado_por: perfilData.perfil.id,
    plantilla_id: p.id,
    nombre: p.nombre,
    objetivo: p.objetivo,
    contenido: p.contenido,
    fecha_asignacion: fechaAsignacion,
    activa: true,
  });

  if (error) {
    return { error: "No se pudo asignar la rutina. Intenta de nuevo." };
  }

  revalidatePath(`/protected/alumnos/${alumnoId}`);
  redirect(`/protected/alumnos/${alumnoId}?rutina=1`);
}

export type AvanceFormState = {
  error?: string;
};

const CAMPOS_MEDIDA: (keyof MedidasAvance)[] = [
  "cintura_cm",
  "cadera_cm",
  "pecho_cm",
  "brazo_cm",
];

function readMedidas(formData: FormData): MedidasAvance {
  const medidas: MedidasAvance = {};
  for (const campo of CAMPOS_MEDIDA) {
    const raw = String(formData.get(campo) ?? "").trim();
    if (!raw) continue;
    const valor = Number(raw);
    if (Number.isFinite(valor) && valor > 0) medidas[campo] = valor;
  }
  return medidas;
}

/** Movido tal cual desde `app/protected/avances/actions.ts` (Sprint 14, Parte C):
 * "Avances" deja de existir como pantalla propia, el registro se hace desde la
 * ficha del alumno. */
export async function createAvance(
  alumnoId: string,
  _prevState: AvanceFormState,
  formData: FormData,
): Promise<AvanceFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const fecha = trim("fecha");
  if (!fecha) {
    return { error: "Selecciona una fecha." };
  }

  const pesoInput = trim("peso_kg");
  let pesoKg: number | null = null;
  if (pesoInput) {
    pesoKg = Number(pesoInput);
    if (!Number.isFinite(pesoKg) || pesoKg <= 0) {
      return { error: "Ingresa un peso válido." };
    }
  }

  const medidas = readMedidas(formData);
  const notas = trim("notas") || null;

  if (pesoKg === null && Object.keys(medidas).length === 0 && !notas) {
    return { error: "Registra al menos el peso, una medida o una nota." };
  }

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("avances").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    alumno_id: alumnoId,
    registrado_por: perfilData.perfil.id,
    fecha,
    peso_kg: pesoKg,
    medidas,
    notas,
  });

  if (error) {
    return { error: "No se pudo registrar el avance. Intenta de nuevo." };
  }

  revalidatePath(`/protected/alumnos/${alumnoId}`);
  redirect(`/protected/alumnos/${alumnoId}?avance=1`);
}

export type BitacoraFormState = {
  error?: string;
};

/** Movido tal cual desde `app/protected/rutinas/actions.ts` (Sprint 14, Parte C):
 * registro de sesión de bitácora hecho por el dueño/entrenador, sin restricción de
 * fecha (a diferencia del registro propio del alumno). */
export async function createRegistroRutina(
  alumnoId: string,
  rutinaId: string,
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

  revalidatePath(`/protected/alumnos/${alumnoId}`);
  redirect(`/protected/alumnos/${alumnoId}?bitacora=1`);
}
