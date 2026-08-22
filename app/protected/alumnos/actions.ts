"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { parseRut } from "@/lib/rut";
import { createClient } from "@/lib/supabase/server";

export type AlumnoFormState = {
  error?: string;
};

type AlumnoInput = {
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  plan_contratado: string;
  fecha_inicio: string | undefined;
};

function readAlumnoForm(formData: FormData): AlumnoInput {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    nombres: trim("nombres"),
    apellidos: trim("apellidos"),
    email: trim("email") || null,
    telefono: trim("telefono") || null,
    plan_contratado: trim("plan_contratado"),
    fecha_inicio: trim("fecha_inicio") || undefined,
  };
}

function validateAlumnoInput(data: AlumnoInput): string | null {
  if (!data.nombres || !data.apellidos) {
    return "Nombres y apellidos son obligatorios.";
  }
  if (!data.plan_contratado) {
    return "Indica el plan contratado.";
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
}
