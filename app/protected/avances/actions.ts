"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { MedidasAvance } from "@/lib/types";

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

  revalidatePath("/protected/avances");
  revalidatePath(`/protected/avances/${alumnoId}`);
  redirect(`/protected/avances/${alumnoId}?registrado=1`);
}
