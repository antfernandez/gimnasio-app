"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAlumnoActual } from "@/lib/alumno-portal";
import { hoyIso } from "@/lib/turnos";
import { crearPreferencia, tokenValinor } from "@/lib/mercadopago";
import {
  calcularMonto,
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_MIME,
  esMesesValido,
} from "@/lib/pagar-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PagarPlanState = {
  error?: string;
};

export async function iniciarPago(
  _prev: PagarPlanState,
  formData: FormData,
): Promise<PagarPlanState> {
  const metodo = String(formData.get("metodo") ?? "");
  const meses = Number(formData.get("meses"));
  if (metodo !== "mercado_pago" && metodo !== "transferencia") {
    return { error: "Selecciona un método de pago." };
  }
  if (!esMesesValido(meses)) {
    return { error: "Selecciona la cantidad de meses." };
  }

  const alumno = await getAlumnoActual();
  if (!alumno) redirect("/auth/login");
  if (alumno.estado_aprobacion !== "aprobado") {
    return { error: "Tu registro aún no está aprobado." };
  }
  if (!alumno.plan_id) {
    return { error: "No tienes un plan asignado. Contacta a tu gimnasio." };
  }

  const supabase = await createClient();
  const [{ data: plan }, { data: gimnasio }] = await Promise.all([
    supabase.from("planes").select("nombre, precio").eq("id", alumno.plan_id).maybeSingle(),
    supabase
      .from("gimnasios")
      .select("mercado_pago_habilitado")
      .eq("id", alumno.gimnasio_id)
      .maybeSingle(),
  ]);
  if (!plan?.precio) {
    return { error: "Tu plan no tiene precio definido. Contacta a tu gimnasio." };
  }
  // El monto lo calcula el servidor; el cliente solo elige método y meses.
  const monto = calcularMonto(Number(plan.precio), meses);

  const admin = createAdminClient();
  const base = {
    gimnasio_id: alumno.gimnasio_id,
    flujo: "alumno" as const,
    alumno_id: alumno.id,
    plan_id: alumno.plan_id,
    meses,
    monto,
    metodo,
  };

  if (metodo === "mercado_pago") {
    const token = tokenValinor();
    if (!gimnasio?.mercado_pago_habilitado || !token) {
      return { error: "Mercado Pago no está disponible. Paga por transferencia." };
    }
    const { data: solicitud, error } = await admin
      .from("solicitudes_pago")
      .insert(base)
      .select("id")
      .single();
    if (error || !solicitud) {
      return { error: "No se pudo iniciar el pago. Intenta de nuevo." };
    }

    let initPoint: string;
    try {
      const pref = await crearPreferencia({
        token,
        solicitudId: solicitud.id,
        titulo: `${plan.nombre} · ${meses} ${meses === 1 ? "mes" : "meses"}`,
        monto,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
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

  // Transferencia
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
  const path = `${alumno.gimnasio_id}/${user.id}/${randomUUID()}.${extension}`;
  const { error: errSubida } = await supabase.storage
    .from("comprobantes-pago")
    .upload(path, archivo, { contentType: archivo.type });
  if (errSubida) {
    return { error: "No se pudo subir el comprobante. Intenta de nuevo." };
  }

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

  revalidatePath("/portal/pagar-plan");
  redirect("/portal/pagar-plan?enviado=1");
}
