"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { esMesesValido } from "@/lib/pagar-plan";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSuperadminActual } from "@/lib/superadmin";

export type GimnasioFormState = { error?: string; ok?: string };

// Cada server action verifica al llamante: el layout solo gatea la navegación.
async function requireSuperadmin() {
  const superadmin = await getSuperadminActual();
  if (!superadmin) redirect("/auth/login/superadmin");
  return superadmin;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function revalidar(id: string) {
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/gimnasios");
  revalidatePath(`/superadmin/gimnasios/${id}`);
  revalidatePath("/superadmin/planes");
  revalidatePath("/superadmin/pagos");
}

export async function editarGimnasio(
  _prev: GimnasioFormState,
  formData: FormData,
): Promise<GimnasioFormState> {
  await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const duenoId = String(formData.get("dueno_id") ?? "");
  const nombreGimnasio = String(formData.get("nombre_gimnasio") ?? "").trim();
  const nombreDueno = String(formData.get("nombre_completo") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const planId = String(formData.get("plan_sistema_id") ?? "");
  const hasta = String(formData.get("suscripcion_hasta") ?? "");

  if (!gimnasioId || !nombreGimnasio || !nombreDueno || !email) {
    return { error: "Nombre del gimnasio, del dueño/a y correo son obligatorios." };
  }
  if (password && password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (hasta && !FECHA.test(hasta)) return { error: "Fecha de vencimiento inválida." };

  const admin = createAdminClient();

  if (planId) {
    const { data: plan } = await admin
      .from("planes_sistema")
      .select("id")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) return { error: "El plan elegido no existe." };
  }

  const { error: gimError } = await admin
    .from("gimnasios")
    .update({
      nombre: nombreGimnasio,
      plan_sistema_id: planId || null,
      suscripcion_hasta: hasta || null,
    })
    .eq("id", gimnasioId);
  if (gimError) return { error: "No se pudo guardar el gimnasio." };

  if (duenoId) {
    // El dueño debe pertenecer a ese gimnasio: evita editar cuentas ajenas por id.
    const { data: perfil } = await admin
      .from("perfiles")
      .select("id")
      .eq("id", duenoId)
      .eq("gimnasio_id", gimnasioId)
      .eq("rol", "dueño")
      .maybeSingle();
    if (!perfil) return { error: "El dueño/a no corresponde a este gimnasio." };

    await admin.from("perfiles").update({ nombre_completo: nombreDueno }).eq("id", duenoId);
    const { error: userError } = await admin.auth.admin.updateUserById(duenoId, {
      email,
      ...(password ? { password } : {}),
    });
    if (userError) return { error: userError.message };
  }

  revalidar(gimnasioId);

  // Spec 48 §5.2: el tope no bloquea ingresos; solo se avisa.
  let aviso = "";
  if (planId) {
    const [{ data: plan }, { count }] = await Promise.all([
      admin.from("planes_sistema").select("max_alumnos").eq("id", planId).maybeSingle(),
      admin
        .from("alumnos")
        .select("id", { count: "exact", head: true })
        .eq("gimnasio_id", gimnasioId)
        .eq("activo", true),
    ]);
    if (plan?.max_alumnos != null && (count ?? 0) > plan.max_alumnos) {
      aviso = ` Aviso: el gimnasio tiene ${count} alumnos activos y el tope del plan es ${plan.max_alumnos}.`;
    }
  }
  return { ok: `Cambios guardados.${aviso}` };
}

/** Baja = `estado = 'cancelado'` (no se borra nada, ver `darDeBajaAdmin`). */
export async function cambiarEstadoGimnasio(gimnasioId: string, activo: boolean): Promise<void> {
  await requireSuperadmin();
  await createAdminClient()
    .from("gimnasios")
    .update({ estado: activo ? "activo" : "cancelado" })
    .eq("id", gimnasioId);
  revalidar(gimnasioId);
}

export async function registrarPagoManual(
  _prev: GimnasioFormState,
  formData: FormData,
): Promise<GimnasioFormState> {
  const superadmin = await requireSuperadmin();
  const gimnasioId = String(formData.get("gimnasio_id") ?? "");
  const planId = String(formData.get("plan_sistema_id") ?? "");
  const meses = Number(formData.get("meses"));
  const monto = Number(formData.get("monto"));
  const nota = String(formData.get("nota") ?? "").trim();
  const metodo = String(formData.get("metodo") ?? "");
  const mes = String(formData.get("mes") ?? "");

  if (metodo !== "transferencia" && metodo !== "mercado_pago") {
    return { error: "Elige si el pago fue Transferencia o Mercado Pago." };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return { error: "Elige el mes que se está pagando." };
  if (!gimnasioId || !planId) return { error: "Elige el plan del pago." };
  if (!esMesesValido(meses)) return { error: "Meses fuera de la lista permitida." };
  if (!Number.isFinite(monto) || monto <= 0) return { error: "El monto debe ser mayor a 0." };

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("planes_sistema")
    .select("id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return { error: "El plan elegido no existe." };

  const periodoDesde = `${mes}-01`;
  const [y, m] = mes.split("-").map(Number);
  // Último día del último mes cubierto (mes elegido + meses pagados - 1).
  const hasta = new Date(Date.UTC(y, m - 1 + meses, 0)).toISOString().slice(0, 10);

  const { data: gim } = await admin
    .from("gimnasios")
    .select("suscripcion_hasta")
    .eq("id", gimnasioId)
    .maybeSingle();
  if (!gim) return { error: "El gimnasio no existe." };

  const { data: solicitud, error } = await admin
    .from("solicitudes_pago")
    .insert({
      gimnasio_id: gimnasioId,
      flujo: "suscripcion",
      plan_sistema_id: planId,
      meses,
      monto,
      metodo,
      registro_manual: true,
      periodo_desde: periodoDesde,
      estado: "confirmado",
      nota: nota || null,
      validado_por: superadmin.id,
      validado_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !solicitud) return { error: "No se pudo registrar el pago." };

  // Nunca se acorta el vencimiento: pagar un mes atrasado no lo retrocede.
  const nuevaHasta =
    gim.suscripcion_hasta && gim.suscripcion_hasta > hasta ? gim.suscripcion_hasta : hasta;
  const { error: gimError } = await admin
    .from("gimnasios")
    .update({ plan_sistema_id: planId, suscripcion_hasta: nuevaHasta })
    .eq("id", gimnasioId);
  if (gimError) {
    await admin.from("solicitudes_pago").delete().eq("id", solicitud.id);
    return { error: "No se pudo aplicar el pago." };
  }

  revalidar(gimnasioId);
  return { ok: "Pago registrado y suscripción extendida." };
}
