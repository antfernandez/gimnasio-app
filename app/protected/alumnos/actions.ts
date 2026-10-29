"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { estadoPlan } from "@/lib/planes";
import { parseRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";
import type { MedidasAvance } from "@/lib/types";

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

/** Spec 14: con el alumno ya creado solo se modifican teléfono, correo y ficha de
 * salud; el resto (RUT, nombre, fechas) queda bloqueado y el plan se cambia desde
 * "Membresía". Se arma el update campo a campo para no pisar nada más. */
export async function updateAlumno(
  id: string,
  _prevState: AlumnoFormState,
  formData: FormData,
): Promise<AlumnoFormState> {
  const data = readAlumnoForm(formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("alumnos")
    .update({
      email: data.email,
      telefono: data.telefono,
      alergias: data.alergias,
      enfermedades: data.enfermedades,
      lesiones: data.lesiones,
      objetivos_salud: data.objetivos_salud,
    })
    .eq("id", id);

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

export type MembresiaFormState = {
  error?: string;
};

/** Spec 14: plan y rutina del alumno se cambian solo cuando terminó el ciclo (no hay
 * período pagado en curso); si todavía no tiene plan o rutina, se puede asignar en
 * cualquier momento. La rutina se asigna copiando la del catálogo como snapshot por
 * alumno (RPC transaccional `asignar_rutina_alumno`, Sprint 15). `fecha` es la fecha
 * de asignación de la rutina. Las reglas se validan acá aunque la UI ya bloquee. */
export async function actualizarMembresia(
  alumnoId: string,
  _prevState: MembresiaFormState,
  formData: FormData,
): Promise<MembresiaFormState> {
  const planId = String(formData.get("plan_id") ?? "").trim();
  const rutinaCatalogoId = String(formData.get("plantilla_id") ?? "").trim();
  const fecha = String(formData.get("fecha_asignacion") ?? "").trim() || null;
  const medicionCorporal = formData.get("medicion_corporal_habilitada") === "on";
  const planNutricional = formData.get("plan_nutricional_habilitado") === "on";

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const gimnasioId = perfilData.perfil.gimnasio_id;
  const hoy = hoyIso();

  const [{ data: alumno }, { data: cobranza }, { data: rutinaActiva }] = await Promise.all([
    supabase.from("alumnos").select("plan_id").eq("id", alumnoId).maybeSingle(),
    supabase
      .from("v_estado_cobranza_alumnos")
      .select("vencimiento_actual")
      .eq("alumno_id", alumnoId)
      .maybeSingle(),
    supabase
      .from("rutinas")
      .select("plantilla_id")
      .eq("alumno_id", alumnoId)
      .eq("activa", true)
      .maybeSingle(),
  ]);
  if (!alumno) return { error: "No se encontró al alumno." };

  // Spec 28: opciones de la membresía. Los datos guardados no se tocan.
  const { error: errorOpciones } = await supabase
    .from("alumnos")
    .update({
      medicion_corporal_habilitada: medicionCorporal,
      plan_nutricional_habilitado: planNutricional,
    })
    .eq("id", alumnoId);
  if (errorOpciones) return { error: "No se pudieron guardar las opciones. Intenta de nuevo." };

  const cicloEnCurso = !!cobranza?.vencimiento_actual && cobranza.vencimiento_actual >= hoy;

  if (planId && planId !== alumno.plan_id) {
    if (cicloEnCurso && alumno.plan_id) {
      return { error: "El plan solo se puede cambiar cuando termina el ciclo en curso." };
    }
    const { data: plan } = await supabase
      .from("planes")
      .select("id, fecha_vigencia_desde, fecha_vigencia_hasta")
      .eq("id", planId)
      .eq("gimnasio_id", gimnasioId)
      .maybeSingle();
    if (!plan || estadoPlan(plan, hoy) === "de_baja") {
      return { error: "El plan seleccionado no está vigente." };
    }
    const { error } = await supabase.from("alumnos").update({ plan_id: planId }).eq("id", alumnoId);
    if (error) return { error: "No se pudo cambiar el plan. Intenta de nuevo." };
  }

  if (rutinaCatalogoId && rutinaCatalogoId !== rutinaActiva?.plantilla_id) {
    if (cicloEnCurso && rutinaActiva) {
      return { error: "La rutina solo se puede cambiar cuando termina el ciclo en curso." };
    }
    const { data: rutinaCatalogo } = await supabase
      .from("rutina_plantillas")
      .select("activa")
      .eq("id", rutinaCatalogoId)
      .eq("gimnasio_id", gimnasioId)
      .maybeSingle();
    if (!rutinaCatalogo || rutinaCatalogo.activa === false) {
      return { error: "La rutina seleccionada no está disponible." };
    }
    const { error } = await supabase.rpc("asignar_rutina_alumno", {
      p_alumno_id: alumnoId,
      p_gimnasio_id: gimnasioId,
      p_plantilla_id: rutinaCatalogoId,
      p_creado_por: perfilData.perfil.id,
      p_fecha_asignacion: fecha,
    });
    if (error) {
      return { error: error.message || "No se pudo asignar la rutina. Intenta de nuevo." };
    }
  }

  revalidatePath(`/protected/alumnos/${alumnoId}`);
  revalidatePath("/protected/alumnos");
  revalidatePath("/protected/nutricion");
  revalidatePath("/protected");
  revalidatePath("/portal", "layout");
  redirect(`/protected/alumnos/${alumnoId}?vista=membresia&ok=1`);
}

export type AvanceFormState = {
  error?: string;
};

const CAMPOS_MEDIDA: (keyof MedidasAvance)[] = [
  "cintura_cm",
  "cadera_cm",
  "pecho_cm",
  "cuello_cm",
  "brazo_izq_cm",
  "brazo_der_cm",
  "muslo_izq_cm",
  "muslo_der_cm",
  "pantorrilla_izq_cm",
  "pantorrilla_der_cm",
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
  redirect(`/protected/alumnos/${alumnoId}?vista=progreso&avance=1`);
}
