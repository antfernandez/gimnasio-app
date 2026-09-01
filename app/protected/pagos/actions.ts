"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getPerfilActual } from "@/lib/perfil";
import { createClient } from "@/lib/supabase/server";
import type { MetodoPago } from "@/lib/types";

export type PagoFormState = {
  error?: string;
};

const METODOS_VALIDOS: MetodoPago[] = [
  "efectivo",
  "transferencia",
  "tarjeta",
  "otro",
];

export async function createPago(
  alumnoId: string,
  _prevState: PagoFormState,
  formData: FormData,
): Promise<PagoFormState> {
  const trim = (key: string) => String(formData.get(key) ?? "").trim();

  const montoInput = trim("monto");
  const monto = Number(montoInput);
  if (!montoInput || !Number.isFinite(monto) || monto <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const metodo = trim("metodo") as MetodoPago;
  if (!METODOS_VALIDOS.includes(metodo)) {
    return { error: "Selecciona un método de pago válido." };
  }

  const fechaPago = trim("fecha_pago");
  const periodoDesde = trim("periodo_desde");
  const periodoHasta = trim("periodo_hasta");
  if (!fechaPago || !periodoDesde || !periodoHasta) {
    return { error: "Completa todas las fechas." };
  }
  if (periodoHasta < periodoDesde) {
    return { error: "El fin del período no puede ser anterior al inicio." };
  }

  // Sprint 14: el pago elige el plan del próximo período en vez de tipear un n° de
  // clases — el paquete (si el plan viene con valor) se crea con
  // `dias_por_semana × 4`, mismo cálculo sugerido del Sprint 13. Plan vacío = pago
  // que no renueva período (ej. un ajuste), sin paquete ni cambio de plan.
  const planId = trim("plan_id") || null;

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();

  let clasesIncluidas: number | null = null;
  if (planId) {
    const { data: plan } = await supabase
      .from("planes")
      .select("dias_por_semana")
      .eq("id", planId)
      .maybeSingle();
    if (!plan) {
      return { error: "El plan seleccionado ya no existe. Elige otro." };
    }
    clasesIncluidas = (plan as { dias_por_semana: number }).dias_por_semana * 4;
  }

  const { data: pago, error } = await supabase
    .from("pagos")
    .insert({
      gimnasio_id: perfilData.perfil.gimnasio_id,
      alumno_id: alumnoId,
      monto,
      fecha_pago: fechaPago,
      metodo,
      periodo_desde: periodoDesde,
      periodo_hasta: periodoHasta,
      plan_id: planId,
    })
    .select("id")
    .single();

  if (error || !pago) {
    return { error: "No se pudo registrar el pago. Intenta de nuevo." };
  }

  if (planId && clasesIncluidas) {
    const { error: errorPaquete } = await supabase.from("paquetes").insert({
      gimnasio_id: perfilData.perfil.gimnasio_id,
      alumno_id: alumnoId,
      pago_id: pago.id,
      clases_incluidas: clasesIncluidas,
      fecha_inicio: fechaPago,
    });
    if (errorPaquete) {
      return {
        error:
          "El pago se registró, pero no se pudo crear el paquete de clases. Créalo manualmente.",
      };
    }

    const { data: alumnoActual } = await supabase
      .from("alumnos")
      .select("plan_id")
      .eq("id", alumnoId)
      .maybeSingle();
    if ((alumnoActual as { plan_id: string | null } | null)?.plan_id !== planId) {
      const { error: errorPlan } = await supabase
        .from("alumnos")
        .update({ plan_id: planId })
        .eq("id", alumnoId);
      if (errorPlan) {
        return {
          error:
            "El pago y el paquete se registraron, pero no se pudo actualizar el plan del alumno. Actualízalo manualmente.",
        };
      }
    }
  }

  revalidatePath("/protected/pagos");
  revalidatePath(`/protected/pagos/${alumnoId}`);
  revalidatePath("/protected/alumnos");
  revalidatePath(`/protected/alumnos/${alumnoId}`);
  revalidatePath("/protected/planes");
  revalidatePath("/protected");
  redirect(`/protected/pagos/${alumnoId}?registrado=1`);
}

/** Sprint 9: interruptor "configurable, no obligatorio" para Mercado Pago (la dueña de
 * Valinor prefiere transferencia por la comisión). El cobro real llega en el Sprint 13;
 * por ahora solo persiste la preferencia del gimnasio. */
export async function setMercadoPagoHabilitado(habilitado: boolean): Promise<void> {
  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase
    .from("gimnasios")
    .update({ mercado_pago_habilitado: habilitado })
    .eq("id", perfilData.perfil.gimnasio_id);

  if (error) {
    throw new Error("No se pudo actualizar la preferencia de Mercado Pago.");
  }

  revalidatePath("/protected/pagos");
}
