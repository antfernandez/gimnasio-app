"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { calcularAplicaDesde } from "@/lib/cambio-plan";
import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

// Spec 43: el dueño resuelve la solicitud. Aprobar fija `aplica_desde` (fin del periodo
// en curso); el cambio de `alumnos.plan_id` lo hace `aplicar_cambios_plan_vencidos`.
export async function aprobarCambioPlan(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data: solicitud } = await supabase
    .from("solicitudes_cambio_plan")
    .select("alumno_id")
    .eq("id", id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!solicitud) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { data: cobranza } = await supabase
    .from("v_estado_cobranza_alumnos")
    .select("vencimiento_actual")
    .eq("alumno_id", solicitud.alumno_id)
    .maybeSingle();

  const { error } = await supabase
    .from("solicitudes_cambio_plan")
    .update({
      estado: "aprobada",
      aplica_desde: calcularAplicaDesde(cobranza?.vencimiento_actual ?? null, hoyIso()),
      resuelta_por: perfilData.perfil.id,
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo aprobar la solicitud.");

  // Si no hay periodo en curso rige hoy mismo.
  await supabase.rpc("aplicar_cambios_plan_vencidos");
  revalidatePath("/protected/alumnos/cambios-plan");
  revalidatePath("/protected/alumnos");
}

export async function rechazarCambioPlan(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_cambio_plan")
    .update({
      estado: "rechazada",
      resuelta_por: perfilData.perfil.id,
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo rechazar la solicitud.");

  revalidatePath("/protected/alumnos/cambios-plan");
}
