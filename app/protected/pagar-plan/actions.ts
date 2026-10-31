"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { PagarPlanState } from "@/app/portal/pagar-plan/actions";
import { crearPreferencia, mpModoPrueba, tokenAntonio } from "@/lib/mercadopago";
import {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_MIME,
  esMesesValido,
  inicioPeriodoSuscripcion,
} from "@/lib/pagar-plan";
import { calcularMontoSuscripcion, planSistemaPorId, planesSistemaVigentes } from "@/lib/planes-sistema";
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
    .select("plan_sistema_id, suscripcion_hasta")
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
    // Primer mes cubierto, calculado por el servidor igual que `aplicar_solicitud_pago`.
    periodo_desde: inicioPeriodoSuscripcion(gimnasio?.suscripcion_hasta as string | null, hoyIso()).slice(0, 7) + "-01",
    meses,
    monto,
    metodo,
  };

  if (metodo === "mercado_pago") {
    const token = tokenAntonio();
    const prueba = !token && mpModoPrueba();
    if (!token && !prueba) return { error: "Mercado Pago no está disponible. Paga por transferencia." };

    const { data: solicitud, error } = await admin
      .from("solicitudes_pago")
      .insert(base)
      .select("id")
      .single();
    if (error || !solicitud) return { error: "No se pudo iniciar el pago. Intenta de nuevo." };

    // Modo de prueba: checkout falso propio, sin tocar la API de Mercado Pago.
    if (prueba) redirect(`/protected/pagar-plan/mp-prueba?ref=${solicitud.id}`);

    let initPoint: string;
    try {
      const pref = await crearPreferencia({
        token: token!,
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

/** Resultado del checkout falso de Mercado Pago (spec 54, solo modo de prueba): confirma o
 * rechaza la solicitud como lo haría el webhook. Exige que sea una solicitud pendiente de
 * Mercado Pago del propio gimnasio, y que el modo de prueba esté activo. */
export async function resolverPagoMpPrueba(solicitudId: string, aprobar: boolean): Promise<void> {
  if (!mpModoPrueba()) redirect("/protected/pagar-plan");
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (perfilData.perfil.rol !== "dueño") redirect("/protected/pagar-plan");

  const admin = createAdminClient();
  const { data: solicitud } = await admin
    .from("solicitudes_pago")
    .select("id, estado")
    .eq("id", solicitudId)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("flujo", "suscripcion")
    .eq("metodo", "mercado_pago")
    .maybeSingle();
  if (!solicitud || solicitud.estado !== "pendiente") redirect("/protected/pagar-plan");

  if (aprobar) {
    await admin
      .from("solicitudes_pago")
      .update({ mp_payment_id: `PRUEBA-${randomUUID()}` })
      .eq("id", solicitud.id);
    const { error } = await admin.rpc("aplicar_solicitud_pago", { p_id: solicitud.id });
    if (error) console.error("MP prueba: no se pudo aplicar la solicitud", error);
  } else {
    await admin
      .from("solicitudes_pago")
      .update({ estado: "rechazado", motivo_rechazo: "Pago de prueba rechazado" })
      .eq("id", solicitud.id);
  }

  revalidatePath("/protected/pagar-plan");
  redirect(`/protected/pagar-plan/resultado?external_reference=${solicitud.id}`);
}

export type CambioPlanSistemaState = { error?: string };

/** Spec 54: el dueño pide cambiar el plan del sistema de su gimnasio. Queda pendiente hasta
 * que el Superadmin la apruebe; mientras tanto el plan y el cobro no cambian. */
export async function solicitarCambioPlanSistema(
  _prev: CambioPlanSistemaState,
  formData: FormData,
): Promise<CambioPlanSistemaState> {
  const planNuevoId = String(formData.get("plan_nuevo_id") ?? "");
  if (!planNuevoId) return { error: "Selecciona el plan al que quieres cambiarte." };

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  if (perfilData.perfil.rol !== "dueño") {
    return { error: "Solo la dueña del gimnasio puede solicitar el cambio de plan." };
  }
  const gimnasioId = perfilData.perfil.gimnasio_id;

  const supabase = await createClient();
  const [{ data: gimnasio }, planes] = await Promise.all([
    supabase.from("gimnasios").select("plan_sistema_id").eq("id", gimnasioId).maybeSingle(),
    planesSistemaVigentes(supabase, hoyIso()),
  ]);
  if (!planes.some((p) => p.id === planNuevoId)) return { error: "Ese plan no está disponible." };
  const planActualId = (gimnasio?.plan_sistema_id as string | null) ?? null;
  if (planNuevoId === planActualId) return { error: "Ya estás en ese plan." };

  const nota = String(formData.get("nota") ?? "").trim().slice(0, 500) || null;
  const { error } = await supabase.from("solicitudes_cambio_plan_sistema").insert({
    gimnasio_id: gimnasioId,
    plan_actual_id: planActualId,
    plan_nuevo_id: planNuevoId,
    nota,
  });
  if (error) {
    if (error.code === "23505") return { error: "Ya tienes una solicitud de cambio pendiente." };
    return { error: "No se pudo enviar la solicitud. Intenta de nuevo." };
  }

  revalidatePath("/protected/pagar-plan");
  redirect("/protected/pagar-plan?cambio=1");
}

export async function cancelarCambioPlanSistema(id: string): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");
  const supabase = await createClient();
  await supabase
    .from("solicitudes_cambio_plan_sistema")
    .update({ estado: "cancelada" })
    .eq("id", id)
    .eq("gimnasio_id", perfilData.perfil.gimnasio_id)
    .eq("estado", "pendiente");
  revalidatePath("/protected/pagar-plan");
}
