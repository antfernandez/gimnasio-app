"use client";

import { CheckCircle2, Pause, Play, XCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { cambiarEstadoAsignacion } from "@/app/protected/nutricion/actions";
import { IconAction } from "@/components/ui/icon-action";
import type { EstadoAsignacion } from "@/lib/nutricion";

const ACCIONES: { estado: EstadoAsignacion; label: string; icon: typeof Play; desde: EstadoAsignacion[] }[] = [
  { estado: "activo", label: "Activar", icon: Play, desde: ["pausado"] },
  { estado: "pausado", label: "Pausar", icon: Pause, desde: ["activo"] },
  { estado: "completado", label: "Marcar completado", icon: CheckCircle2, desde: ["activo", "pausado"] },
  { estado: "cancelado", label: "Cancelar", icon: XCircle, desde: ["activo", "pausado"] },
];

/** Cambios de estado de una asignación como iconos de la grilla (patrón spec 07). */
export function AsignacionAcciones({ id, estado }: { id: string; estado: EstadoAsignacion }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex justify-end gap-1">
        {ACCIONES.map((a) => (
          <IconAction
            key={a.estado}
            icon={a.icon}
            label={a.label}
            disabled={isPending || !a.desde.includes(estado)}
            onClick={() =>
              startTransition(async () => {
                const r = await cambiarEstadoAsignacion(id, a.estado);
                setError(r.error ?? null);
              })
            }
          />
        ))}
      </div>
      {error && <p className="max-w-[16rem] text-xs text-destructive">{error}</p>}
    </div>
  );
}
