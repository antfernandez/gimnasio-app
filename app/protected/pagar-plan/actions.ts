"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { PagarPlanState } from "@/app/portal/pagar-plan/actions";
import { crearPreferencia, tokenAntonio } from "@/lib/mercadopago";
import {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_MIME,
  esMesesValido,
} from "@/lib/pagar-plan";
import { calcularMontoSuscripcion, planSistemaPorId } from "@/lib/planes-sistema";
import { getPerfilActual } from "@/lib/perfil";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hoyIso } from "@/lib/turnos";

// Flujo B (Spec 23): la dueña paga la suscripción al sistema. MP va a la cuenta de
// Antonio Fernandez; la transferencia la valida el superadmin.
export async function iniciarPagoSuscripcion(
  _prev: PagarPlanState,
  formData: FormData,
): Promise<PagarPlanState> {
  const metodo = String(formData.get("metodo") ?? "");
  const meses = Number(formData.get("meses"));
  if (metodo !== "mercado_pago" && metodo !== "transferencia") {
    return { error: "Selecciona un método de pago." };
  }
  if (!esMesesValido(meses)) return { error: "Selecciona la cantidad de meses." };

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (perfilData.perfil.rol !== "dueño") {
    return { error: "Solo la dueña del gimnasio puede pagar la suscripción." };
  }
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const supabase = await createClient();
  const { data: gimnasio } = await supabase
    .from("gimnasios")
    .select("plan_sistema_id")
    .eq("id", gimnasioId)
    .maybeSingle();

  // Plan vigente; si el gimnasio aún no tiene uno, el que corresponde a sus alumnos.
  let planId: string | null = gimnasio?.plan_sistema_id ?? null;
  if (!planId) {
    const { data } = await supabase.rpc("plan_sistema_requerido", { p_gimnasio_id: gimnasioId });
    planId = (data as string | null) ?? null;
  }
  const plan = planId ? await planSistemaPorId(supabase, planId) : null;
  if (!planId || !plan) return { error: "No hay un plan del sistema disponible." };

  // El monto (con IVA) lo calcula el servidor desde la fila del plan en la BD.
  const monto = calcularMontoSuscripcion(plan.precioNeto, meses, plan.ivaPct);

  const admin = createAdminClient();
  const base = {
    gimnasio_id: gimnasioId,
    flujo: "suscripcion" as const,
    plan_sistema_id: planId,
    meses,
    monto,
    metodo,
  };

  if (metodo === "mercado_pago") {
    const token = tokenAntonio();
    if (!token) return { error: "Mercado Pago no está disponible. Paga por transferencia." };

    const { data: solicitud, error } = await admin
      .from("solicitudes_pago")
      .insert(base)
      .select("id")
      .single();
    if (error || !solicitud) return { error: "No se pudo iniciar el pago. Intenta de nuevo." };

    let initPoint: string;
    try {
      const pref = await crearPreferencia({
        token,
        solicitudId: solicitud.id,
        titulo: `Suscripción ${plan.nombre} · ${meses} ${meses === 1 ? "mes" : "meses"}`,
        monto,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
        flujo: "suscripcion",
      });
      await admin
        .from("solicitudes_pago")
        .update({ mp_preference_id: pref.id })
        .eq("id", solicitud.id);
      initPoint = pref.initPoint;
    } catch (e) {
      console.error(e);
      await admin.from("solicitudes_pago").delete().eq("id", solicitud.id);
      return { error: "No se pudo conectar con Mercado Pago. Intenta de nuevo." };
    }
    redirect(initPoint);
  }

  const fecha = String(formData.get("fecha_transferencia") ?? "").trim();
  if (!fecha) return { error: "Ingresa la fecha de la transferencia." };
  if (fecha > hoyIso()) return { error: "La fecha de la transferencia no puede ser futura." };

  const archivo = formData.get("comprobante");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Adjunta el comprobante de la transferencia." };
  }
  if (!COMPROBANTE_MIME.includes(archivo.type)) {
    return { error: "El comprobante debe ser JPG, PNG, WebP o PDF." };
  }
  if (archivo.size > COMPROBANTE_MAX_BYTES) {
    return { error: "El comprobante no puede pesar más de 5 MB." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const extension = archivo.type === "application/pdf" ? "pdf" : archivo.type.split("/")[1];
  const path = `${gimnasioId}/${user.id}/${randomUUID()}.${extension}`;
  const { error: errSubida } = await supabase.storage
    .from("comprobantes-pago")
    .upload(path, archivo, { contentType: archivo.type });
  if (errSubida) return { error: "No se pudo subir el comprobante. Intenta de nuevo." };

  const nota = String(formData.get("nota") ?? "").trim() || null;
  const { error } = await admin.from("solicitudes_pago").insert({
    ...base,
    comprobante_path: path,
    fecha_transferencia: fecha,
    nota,
  });
  if (error) {
    await supabase.storage.from("comprobantes-pago").remove([path]);
    return { error: "No se pudo registrar el comprobante. Intenta de nuevo." };
  }

  revalidatePath("/protected/pagar-plan");
  redirect("/protected/pagar-plan?enviado=1");
}
