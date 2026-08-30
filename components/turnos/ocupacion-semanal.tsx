"use client";

import { VistaSemana } from "@/components/turnos/calendario-turnos";
import type { SlotOcupado } from "@/components/turnos/calendario-turnos";

/** Envoltorio de solo lectura sobre la misma grilla del Sprint 8 (`VistaSemana`) —
 * el dashboard no reprograma ni cancela turnos, solo da un vistazo de la ocupación,
 * así que la selección de un slot no abre panel de detalle. Existe como componente
 * cliente separado únicamente porque un Server Component no puede pasarle una
 * función (`onSeleccionar`) directamente a un Client Component. */
export function OcupacionSemanal({
  fecha,
  slots,
}: {
  fecha: string;
  slots: SlotOcupado[];
}) {
  return (
    <VistaSemana
      fecha={fecha}
      slots={slots}
      rol="dueño"
      claveSeleccionada={null}
      onSeleccionar={() => {}}
    />
  );
}
