"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { estadoPlan } from "@/lib/planes";
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

/** Validación de nombre único (Sprint 14, Parte D): case/espacio-insensible, contra
 * los demás planes del gimnasio — reforzada también a nivel de base (índice único
 * `planes_nombre_unq`, migración 0010), acá solo evita el viaje redondo del error
 * de la base cuando es previsible. */
async function nombreDuplicado(
  gimnasioId: string,
  nombre: string,
  excluirId?: string,
): Promise<boolean> {
  const supabase = await createClient();
  let query = supabase
    .from("planes")
    .select("id")
    .eq("gimnasio_id", gimnasioId)
    .ilike("nombre", nombre.trim());
  if (excluirId) query = query.neq("id", excluirId);
  const { data } = await query;
  return (data ?? []).length > 0;
}

export async function createPlan(
  _prevState: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const data = readPlanForm(formData);
  if ("error" in data) return data;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  if (await nombreDuplicado(perfilData.perfil.gimnasio_id, data.nombre)) {
    return { error: "Ya existe un plan con ese nombre." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planes").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    creado_por: perfilData.perfil.id,
    ...data,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un plan con ese nombre." };
    }
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

  if (await nombreDuplicado(perfilData.perfil.gimnasio_id, data.nombre, id)) {
    return { error: "Ya existe un plan con ese nombre." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planes")
    .update({ ...data, modificado_por: perfilData.perfil.id })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un plan con ese nombre." };
    }
    return { error: "No se pudo guardar el plan. Intenta de nuevo." };
  }

  revalidatePath("/protected/planes");
  revalidatePath("/protected/alumnos");
  redirect("/protected/planes?actualizado=1");
}

/** Spec 10: "dar de baja" = cerrar la vigencia hoy (sin columna `activo`). Se
 * reactiva editando la vigencia. Bloqueada si hay alumnos asignados (activos o no);
 * se revalida acá aunque la UI ya deshabilite el botón. */
export async function darDeBajaPlan(id: string): Promise<PlanFormState> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("planes")
    .select("fecha_vigencia_desde, fecha_vigencia_hasta")
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .maybeSingle();
  if (!plan) return { error: "No se encontró el plan." };

  const hoy = new Date().toISOString().slice(0, 10);
  const estado = estadoPlan(plan, hoy);
  if (estado === "de_baja") return { error: "El plan ya está de baja." };
  if (estado === "proximo") {
    return { error: "El plan aún no entra en vigencia; edita sus fechas en vez de darlo de baja." };
  }

  const { count } = await supabase
    .from("alumnos")
    .select("id", { count: "exact", head: true })
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("plan_id", id);
  if (count) {
    return {
      error: `No se puede dar de baja: tiene ${count} alumno${count === 1 ? "" : "s"} asignado${count === 1 ? "" : "s"}.`,
    };
  }

  const { error } = await supabase
    .from("planes")
    .update({ fecha_vigencia_hasta: hoy, modificado_por: perfilData.perfil.id })
    .eq("id", id);
  if (error) return { error: "No se pudo dar de baja el plan. Intenta de nuevo." };

  revalidatePath("/protected/planes");
  revalidatePath("/protected/alumnos");
  return {};
}
