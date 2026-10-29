"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlumnoActual } from "@/lib/alumno-portal";
import { estadoPlan } from "@/lib/planes";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

// Spec 43: el alumno pide cambiar de plan; no cambia nada hasta que el dueño apruebe y
// termine el periodo en curso. RLS valida pertenencia; acá se validan las reglas de negocio.
export async function solicitarCambioPlan(planNuevoId: string, formData: FormData): Promise<void> {
  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");
  if (alumno.estado_aprobacion !== "aprobado") throw new Error("Tu registro aún no está aprobado.");
  if (planNuevoId === alumno.plan_id) throw new Error("Ya tienes ese plan.");

  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("planes")
    .select("id, fecha_vigencia_desde, fecha_vigencia_hasta")
    .eq("id", planNuevoId)
    .eq("gimnasio_id", alumno.gimnasio_id)
    .maybeSingle();
  if (!plan || estadoPlan(plan, hoyIso()) !== "vigente") {
    throw new Error("El plan seleccionado no está vigente.");
  }

  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;
  const { error } = await supabase.from("solicitudes_cambio_plan").insert({
    gimnasio_id: alumno.gimnasio_id,
    alumno_id: alumno.id,
    plan_actual_id: alumno.plan_id,
    plan_nuevo_id: planNuevoId,
    nota,
  });
  if (error) {
    // 23505: ya hay una solicitud abierta (índice único por alumno).
    throw new Error(
      error.code === "23505"
        ? "Ya tienes una solicitud de cambio en curso."
        : "No se pudo enviar la solicitud. Intenta de nuevo.",
    );
  }

  revalidatePath("/portal/pagar-plan");
}

export async function cancelarSolicitudCambio(id: string): Promise<void> {
  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("solicitudes_cambio_plan")
    .update({ estado: "cancelada" })
    .eq("id", id)
    .eq("alumno_id", alumno.id)
    .eq("estado", "pendiente");
  if (error) throw new Error("No se pudo cancelar la solicitud.");

  revalidatePath("/portal/pagar-plan");
}
