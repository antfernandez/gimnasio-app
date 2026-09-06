"use client";

import { useActionState, useId } from "react";

import { duplicarHorarioDia } from "@/app/protected/turnos/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NOMBRES_DIA } from "@/lib/turnos";
import type { DiaSemana } from "@/lib/types";

const DIAS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Sprint 18, Parte 3: copia todos los bloques de un día ya configurado a otros
 * días — el caso típico de un estudio con horario idéntico lunes a viernes, sin
 * repetir el formulario "Agregar" para cada uno. */
export function DuplicarDiaForm({ diasConHorario }: { diasConHorario: DiaSemana[] }) {
  const [state, formAction, isPending] = useActionState(duplicarHorarioDia, {});
  const idBase = useId();

  if (diasConHorario.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Configura al menos un día primero para poder duplicarlo a otros.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-1.5 sm:max-w-[220px]">
        <Label htmlFor={`${idBase}-origen`}>Copiar el horario de</Label>
        <Select id={`${idBase}-origen`} name="dia_origen" defaultValue={String(diasConHorario[0])} required>
          {diasConHorario.map((d) => (
            <option key={d} value={d}>
              {NOMBRES_DIA[d]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <Label>Hacia estos días</Label>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {DIAS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="dias_destino" value={d} />
              {NOMBRES_DIA[d]}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" size="sm" className="self-start" disabled={isPending}>
        {isPending ? "Duplicando…" : "Duplicar día"}
      </Button>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
