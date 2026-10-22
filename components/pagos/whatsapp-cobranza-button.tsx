import { MessageCircle } from "lucide-react";

import { enlaceWhatsApp, mensajeCobranza } from "@/lib/whatsapp";
import type { EstadoCobranzaAlumno } from "@/lib/types";

/** Spec 01, R2: enlace `wa.me` con mensaje prearmado — la dueña revisa y envía ella
 * misma, no hay integración con la API de WhatsApp. Sin teléfono válido queda
 * deshabilitado (nunca enlaza a `wa.me/null`). */
export function WhatsAppCobranzaButton({ alumno }: { alumno: EstadoCobranzaAlumno }) {
  const href = enlaceWhatsApp(
    alumno.telefono,
    mensajeCobranza({
      nombre: alumno.nombres,
      estado: alumno.estado_pago,
      vencimiento: alumno.vencimiento_actual,
      planNombre: alumno.plan_nombre,
      planPrecio: alumno.plan_precio,
    }),
  );
  const clase =
    "inline-flex items-center gap-1 rounded-[7px] border border-border px-2 py-1 text-xs";

  if (!href) {
    return (
      <span
        className={`${clase} cursor-not-allowed text-muted-foreground opacity-60`}
        title="El alumno no tiene un teléfono válido registrado"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        WhatsApp
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${clase} text-foreground hover:bg-primary/10`}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      Enviar WhatsApp
    </a>
  );
}
