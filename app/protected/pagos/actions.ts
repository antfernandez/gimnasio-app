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

  const perfilData = await getPerfilActual();
  if (!perfilData) redirect("/auth/login");

  const supabase = await createClient();
  const { error } = await supabase.from("pagos").insert({
    gimnasio_id: perfilData.perfil.gimnasio_id,
    alumno_id: alumnoId,
    monto,
    fecha_pago: fechaPago,
    metodo,
    periodo_desde: periodoDesde,
    periodo_hasta: periodoHasta,
  });

  if (error) {
    return { error: "No se pudo registrar el pago. Intenta de nuevo." };
  }

  revalidatePath("/protected/pagos");
  revalidatePath(`/protected/pagos/${alumnoId}`);
  redirect(`/protected/pagos/${alumnoId}?registrado=1`);
}
