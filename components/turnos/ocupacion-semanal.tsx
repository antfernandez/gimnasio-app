"use client";

import { useState } from "react";

import { VistaSemana } from "@/components/turnos/calendario-turnos";
import type { SlotOcupado } from "@/components/turnos/calendario-turnos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatHora } from "@/lib/turnos";

function claveSlot(fecha: string, horaInicio: string): string {
  return `${fecha}|${horaInicio}`;
}

/** Envoltorio de solo lectura sobre la misma grilla del Sprint 8 (`VistaSemana`) —
 * el dashboard no reprograma ni cancela turnos. A diferencia del `PanelDetalle`
 * completo de Turnos, seleccionar un slot solo muestra debajo la lista de alumnos
 * reservados, sin acciones (Sprint 14, Parte F). */
export function OcupacionSemanal({
  fecha,
  slots,
}: {
  fecha: string;
  slots: SlotOcupado[];
}) {
  const [claveSeleccionada, setClaveSeleccionada] = useState<string | null>(null);
  const slotSeleccionado =
    claveSeleccionada != null
      ? (slots.find((s) => claveSlot(s.fecha, s.horaInicio) === claveSeleccionada) ?? null)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <VistaSemana
        fecha={fecha}
        slots={slots}
        rol="dueño"
        claveSeleccionada={claveSeleccionada}
        onSeleccionar={(s) => setClaveSeleccionada(claveSlot(s.fecha, s.horaInicio))}
      />

      {slotSeleccionado && (
        <div className="rounded-[9px] border border-border bg-secondary/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">
              {formatHora(slotSeleccionado.horaInicio)} · {slotSeleccionado.fecha}
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setClaveSeleccionada(null)}
            >
              Cerrar
            </Button>
          </div>
          {slotSeleccionado.reservas.filter((r) => r.estado !== "cancelada").length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin reservas todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {slotSeleccionado.reservas
                .filter((r) => r.estado !== "cancelada")
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-[7px] border border-border bg-card px-3 py-2"
                  >
                    <span className="text-sm text-foreground">
                      {r.alumno?.nombres} {r.alumno?.apellidos}
                    </span>
                    <Badge variant={r.estado === "realizada" ? "secondary" : "default"}>
                      {r.estado === "realizada" ? "Realizada" : "Reservada"}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
