"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { alternarHorarioActivo, eliminarHorario } from "@/app/protected/turnos/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function HorarioRowActions({
  id,
  activo,
}: {
  id: string;
  activo: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-4">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={activo}
          disabled={isPending}
          onCheckedChange={(checked) =>
            startTransition(() => alternarHorarioActivo(id, checked === true))
          }
        />
        Activo
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending}
        onClick={() => startTransition(() => eliminarHorario(id))}
        title="Eliminar horario"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
