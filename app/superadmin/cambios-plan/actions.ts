"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

// Spec 54: el Superadmin resuelve las solicitudes de cambio de plan del sistema que hacen
// los gimnasios. Cada action verifica al llamante: el layout solo gatea la navegación.
async function requireSuperadmin() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");
  return superadmin;
}

function revalidar() {
  revalidatePath("/superadmin/cambios-plan");
  revalidatePath("/superadmin/gimnasios");
  revalidatePath("/superadmin/planes");
  revalidatePath("/protected/pagar-plan");
}

export async function aprobarCambioPlanSistema(id: string): Promise<void> {
  const superadmin = await requireSuperadmin();
  const admin = createAdminClient();

  const { data: solicitud } = await admin
    .from("solicitudes_cambio_plan_sistema")
    .select("id, gimnasio_id, plan_nuevo_id")
    .eq("id", id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!solicitud) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { error: errGim } = await admin
    .from("gimnasios")
    .update({ plan_sistema_id: solicitud.plan_nuevo_id })
    .eq("id", solicitud.gimnasio_id);
  if (errGim) throw new Error("No se pudo cambiar el plan del gimnasio.");

  const { error } = await admin
    .from("solicitudes_cambio_plan_sistema")
    .update({ estado: "aprobada", resuelta_por: superadmin.id, resuelta_at: new Date().toISOString() })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo aprobar la solicitud.");
  revalidar();
}

export async function rechazarCambioPlanSistema(id: string, formData: FormData): Promise<void> {
  const superadmin = await requireSuperadmin();
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500);
  if (!motivo) throw new Error("Indica el motivo del rechazo.");

  const { error } = await createAdminClient()
    .from("solicitudes_cambio_plan_sistema")
    .update({
      estado: "rechazada",
      motivo_rechazo: motivo,
      resuelta_por: superadmin.id,
      resuelta_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo rechazar la solicitud.");
  revalidar();
}
