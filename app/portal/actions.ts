"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlumnoActual } from "@/lib/alumno-portal";
import { createClient } from "@/lib/supabase/server";
import type { MedidasAvance } from "@/lib/types";

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

export async function createAvancePropio(
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

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");
  if (!alumno.puede_registrar_avances) {
    return { error: "Tu entrenador aún no habilitó el registro de avances propios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("avances").insert({
    gimnasio_id: alumno.gimnasio_id,
    alumno_id: alumno.id,
    fecha,
    peso_kg: pesoKg,
    medidas,
    notas,
  });

  if (error) {
    return { error: "No se pudo registrar el avance. Intenta de nuevo." };
  }

  revalidatePath("/portal");
  return {};
}
