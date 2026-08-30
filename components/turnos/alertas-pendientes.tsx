"use client";

import { useTransition } from "react";

import { marcarAlertaVista } from "@/app/protected/turnos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatFecha } from "@/lib/format";
import { formatHora } from "@/lib/turnos";
import type { ReservaConAlumno } from "@/lib/types";

export function AlertasPendientes({ alertas }: { alertas: ReservaConAlumno[] }) {
  if (alertas.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Alertas de reprogramación ({alertas.length})
        </h3>
        {alertas.map((a) => (
          <FilaAlerta key={a.id} alerta={a} />
        ))}
      </CardContent>
    </Card>
  );
}

function FilaAlerta({ alerta }: { alerta: ReservaConAlumno }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between rounded-[7px] border border-border px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground">
          {alerta.alumno?.nombres} {alerta.alumno?.apellidos}
        </span>
        <span className="text-muted-foreground">
          {formatFecha(alerta.fecha)} {formatHora(alerta.hora_inicio)}
        </span>
        {alerta.estado === "cancelada" ? (
          <Badge variant={alerta.cancelado_dentro_ventana ? "secondary" : "destructive"}>
            {alerta.cancelado_dentro_ventana ? "Canceló a tiempo" : "Canceló tarde"}
          </Badge>
        ) : (
          <Badge variant="destructive">No asistió / canceló tarde</Badge>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => marcarAlertaVista(alerta.id))}
      >
        {isPending ? "…" : "Marcar visto"}
      </Button>
    </div>
  );
}
