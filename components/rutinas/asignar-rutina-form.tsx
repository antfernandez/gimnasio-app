"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { RutinaPlantilla } from "@/lib/types";

export type AsignarRutinaFormState = {
  error?: string;
};

type Props = {
  action: (
    state: AsignarRutinaFormState,
    formData: FormData,
  ) => Promise<AsignarRutinaFormState>;
  plantillas: RutinaPlantilla[];
};

export function AsignarRutinaForm({ action, plantillas }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  if (plantillas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay plantillas en el catálogo de Rutinas. Crea una primero para
        poder asignarla.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-2">
        <Label htmlFor="plantilla_id">Plantilla</Label>
        <Select id="plantilla_id" name="plantilla_id" required className="min-w-[220px]">
          <option value="">Selecciona una plantilla…</option>
          {plantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2 sm:max-w-[200px]">
        <Label htmlFor="fecha_asignacion">Fecha de asignación</Label>
        <Input
          id="fecha_asignacion"
          name="fecha_asignacion"
          type="date"
          defaultValue={hoy}
          required
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Asignando…" : "Asignar"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
