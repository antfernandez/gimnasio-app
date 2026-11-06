import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";

/** Spec 69: tipos de evento de seguridad registrados en `eventos_seguridad`. */
export const TIPOS_EVENTO = [
  "export_descargado",
  "solicitud_pago_confirmada",
  "solicitud_pago_rechazada",
  "webhook_firma_invalida",
  "acceso_denegado",
  "cambio_plan_aprobado",
  "alumno_dado_de_baja",
  "cuenta_admin_creada",
  "cuenta_admin_baja",
] as const;
export type TipoEventoSeguridad = (typeof TIPOS_EVENTO)[number];

export type DatosEvento = {
  gimnasioId?: string | null;
  usuarioId?: string | null;
  /** Sin datos sensibles: nunca contraseñas, tokens, RUT ni montos completos de tarjeta. */
  detalle?: Record<string, string | number | boolean | null>;
  ip?: string | null;
};

async function ipActual(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null; // fuera de un request
  }
}

/** Registra un evento. NUNCA lanza ni bloquea la acción de negocio: si falla, deja un log. */
export async function registrarEvento(
  tipo: TipoEventoSeguridad,
  datos: DatosEvento = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("eventos_seguridad").insert({
      tipo,
      gimnasio_id: datos.gimnasioId ?? null,
      usuario_id: datos.usuarioId ?? null,
      detalle: datos.detalle ?? {},
      ip: datos.ip !== undefined ? datos.ip : await ipActual(),
    });
    if (error) console.error("No se pudo registrar el evento de seguridad", tipo, error.message);
  } catch (e) {
    console.error("No se pudo registrar el evento de seguridad", tipo, e);
  }
}

/** Umbrales de alerta (spec 69): ventana de 10 minutos. */
export const UMBRALES_ALERTA = { webhook_firma_invalida: 5, acceso_denegado: 20 } as const;
export const VENTANA_ALERTA_MIN = 10;
