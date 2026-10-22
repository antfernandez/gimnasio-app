import { MessageCircle } from "lucide-react";

import { IconAction } from "@/components/ui/icon-action";
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

  if (!href) {
    return (
      <IconAction
        icon={MessageCircle}
        label="El alumno no tiene un teléfono válido registrado"
        disabled
      />
    );
  }
  return <IconAction icon={MessageCircle} label="Enviar WhatsApp" href={href} externo />;
}
