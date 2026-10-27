"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Valida o rechaza una transferencia de un alumno (Spec 23 flujo A). La solicitud se
// lee con el cliente del dueño (RLS: solo las de su gimnasio) antes de usar service_role.
async function solicitudPendiente(id: string) {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("solicitudes_pago")
    .select("id")
    .eq("id", id)
    .eq("flujo", "alumno")
    .eq("estado", "pendiente")
    .maybeSingle();
  return data ? { userId: (await supabase.auth.getUser()).data.user!.id } : null;
}

export async function validarTransferencia(id: string): Promise<void> {
  const ctx = await solicitudPendiente(id);
  if (!ctx) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { error } = await createAdminClient().rpc("aplicar_solicitud_pago", {
    p_id: id,
    p_validador: ctx.userId,
  });
  if (error) throw new Error("No se pudo validar el pago.");

  revalidatePath("/protected/pagos/solicitudes");
  revalidatePath("/protected/pagos");
}

export async function rechazarTransferencia(id: string, formData: FormData): Promise<void> {
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Indica el motivo del rechazo.");

  const ctx = await solicitudPendiente(id);
  if (!ctx) throw new Error("Solicitud no encontrada o ya resuelta.");

  const { error } = await createAdminClient()
    .from("solicitudes_pago")
    .update({
      estado: "rechazado",
      motivo_rechazo: motivo,
      validado_por: ctx.userId,
      validado_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo rechazar el pago.");

  revalidatePath("/protected/pagos/solicitudes");
}
