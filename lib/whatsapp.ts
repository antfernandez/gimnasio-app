import { formatFecha, formatMonto } from "@/lib/format";
import type { EstadoPago } from "@/lib/types";

/** Normaliza un teléfono guardado en formato libre a dígitos internacionales
 * (sin "+", como espera `wa.me`). Asume Chile (+56) cuando no trae código de país:
 *  - "+56 9 1234 5678", "56912345678"  → "56912345678"
 *  - "9 1234 5678", "09 1234 5678"     → "56912345678"
 *  - "1234 5678" (8 dígitos)           → "56912345678" (móvil sin el 9 inicial)
 *  - "+54 9 11 …" u otro "+" explícito → se respeta el código de país
 * Devuelve `null` si no se puede interpretar (el botón queda deshabilitado). */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const raw = telefono.trim();
  const digitos = raw.replace(/\D/g, "");
  if (!digitos) return null;

  if (raw.startsWith("+") || raw.startsWith("00")) {
    const intl = raw.startsWith("00") ? digitos.slice(2) : digitos;
    return intl.length >= 10 && intl.length <= 15 ? intl : null;
  }
  const sinCero = digitos.replace(/^0+/, "");
  if (sinCero.startsWith("56") && sinCero.length === 11) return sinCero;
  if (sinCero.length === 9) return `56${sinCero}`;
  if (sinCero.length === 8) return `569${sinCero}`;
  return null;
}

export function mensajeCobranza(opts: {
  nombre: string;
  estado: EstadoPago;
  vencimiento: string | null;
  planNombre?: string | null;
  planPrecio?: number | null;
}): string {
  const plan = opts.planNombre
    ? `tu plan ${opts.planNombre}${opts.planPrecio ? ` (${formatMonto(opts.planPrecio)})` : ""}`
    : "tu plan";
  const fecha = opts.vencimiento ? formatFecha(opts.vencimiento) : null;
  if (opts.estado === "atrasado") {
    return `Hola ${opts.nombre}, te escribimos de Valinor para recordarte que ${plan} venció${fecha ? ` el ${fecha}` : ""}. Cuando puedas, avísanos para coordinar el pago. ¡Gracias!`;
  }
  return `Hola ${opts.nombre}, te avisamos de Valinor que ${plan} vence${fecha ? ` el ${fecha}` : " pronto"}. Si quieres renovarlo, escríbenos y lo coordinamos. ¡Nos vemos en clases!`;
}

export function enlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const numero = normalizarTelefono(telefono);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null;
}
