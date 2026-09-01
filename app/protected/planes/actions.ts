"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { NivelPlan } from "@/lib/types";

export type PlanFormState = {
  error?: string;
};

const NIVELES_VALIDOS: NivelPlan[] = ["basico", "intermedio", "avanzado"];

type PlanInput = {
  nombre: string;
  nivel: NivelPlan;
  precio: number | null;
  dias_por_semana: number;
  fecha_vigencia_desde: string | undefined;
  fecha_vigencia_hasta: string | null;
};

function readPlanForm(formData: FormData): PlanInput | { error: string } {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const nombre = trim("nombre");
  if (!nombre) return { error: "Ingresa un nombre para el plan." };

  const nivel = trim("nivel") as NivelPlan;
  if (!NIVELES_VALIDOS.includes(nivel)) {
    return { error: "Selecciona un nivel válido." };
  }

  const diasPorSemana = Number(trim("dias_por_semana"));
  if (!Number.isInteger(diasPorSemana) || diasPorSemana <= 0) {
    return { error: "Ingresa un número de días por semana válido." };
  }

  const precioInput = trim("precio");
  let precio: number | null = null;
  if (precioInput) {
    precio = Number(precioInput);
    if (!Number.isFinite(precio) || precio < 0) {
      return { error: "Ingresa un precio válido." };
    }
  }

  const fechaVigenciaDesde = trim("fecha_vigencia_desde") || undefined;
  const fechaVigenciaHasta = trim("fecha_vigencia_hasta") || null;
  if (fechaVigenciaDesde && fechaVigenciaHasta && fechaVigenciaHasta < fechaVigenciaDesde) {
    return { error: "La vigencia hasta no puede ser anterior a la vigencia desde." };
  }

  return {
    nombre,
    nivel,
    precio,
    dias_por_semana: diasPorSemana,
    fecha_vigencia_desde: fechaVigenciaDesde,
    fecha_vigencia_hasta: fechaVigenciaHasta,
  };
}

export async function createPlan(
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const data = readPlanForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("planes").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    creado_por: perfilData.perfil.id,
    ...data,
  });

  if (error) {
    return { error: "No se pudo guardar el plan. Intenta de nuevo." };
  }

  revalidatePath("/protected/planes");
  revalidatePath("/protected/alumnos");
  redirect("/protected/planes?creado=1");
}

export async function updatePlan(
  id: string,
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const data = readPlanForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("planes")
    .update({ ...data, modificado_por: perfilData.perfil.id })
    .eq("id", id);

  if (error) {
    return { error: "No se pudo guardar el plan. Intenta de nuevo." };
  }

  revalidatePath("/protected/planes");
  revalidatePath("/protected/alumnos");
  redirect("/protected/planes?actualizado=1");
}
