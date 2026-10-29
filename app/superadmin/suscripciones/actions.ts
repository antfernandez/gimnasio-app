"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

// Valida o rechaza pagos de suscripción al sistema (Spec 23, flujo B). Acota SIEMPRE a
// `flujo = 'suscripcion'`: el superadmin no toca los pagos de alumnos de ningún gimnasio.
async function requireSuperadmin() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");
  return superadmin;
}

async function pendiente(id: string) {
  const { data } = await createAdminClient()
    .from("solicitudes_pago")
    .select("id")
    .eq("id", id)
    .eq("flujo", "suscripcion")
    .eq("estado", "pendiente")
    .maybeSingle();
  return !!data;
}

export async function validarSuscripcion(id: string): Promise<void> {
  const superadmin = await requireSuperadmin();
  if (!(await pendiente(id))) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { error } = await createAdminClient().rpc("aplicar_solicitud_pago", {
    p_id: id,
    p_validador: superadmin.id,
  });
  if (error) throw new Error("No se pudo validar el pago.");
  revalidatePath("/superadmin/suscripciones");
  revalidatePath("/superadmin", "layout");
}

export async function rechazarSuscripcion(id: string, formData: FormData): Promise<void> {
  const superadmin = await requireSuperadmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Indica el motivo del rechazo.");
  if (!(await pendiente(id))) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { error } = await createAdminClient()
    .from("solicitudes_pago")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo,
      validado_por: superadmin.id,
      validado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("flujo", "suscripcion")
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo rechazar el pago.");
  revalidatePath("/superadmin/suscripciones");
  revalidatePath("/superadmin", "layout");
}
