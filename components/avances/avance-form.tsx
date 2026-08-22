"use client";

import { useActionState } from "react";

import type { AvanceFormState } from "@/app/protected/avances/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  action: (
    state: AvanceFormState,
    formData: FormData,
  ) => Promise<AvanceFormState>;
};

export function AvanceForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="peso_kg">Peso (kg)</Label>
          <Input
            id="peso_kg"
            name="peso_kg"
            type="number"
            min="1"
            step="0.1"
            placeholder="72.5"
            autoFocus
          />
        </div>
      </div>

      <div className="grid gap-3">
        <Label>Medidas (cm)</Label>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Cintura</span>
            <Input
              name="cintura_cm"
              type="number"
              min="1"
              step="0.1"
              placeholder="80"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Cadera</span>
            <Input
              name="cadera_cm"
              type="number"
              min="1"
              step="0.1"
              placeholder="95"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Pecho</span>
            <Input
              name="pecho_cm"
              type="number"
              min="1"
              step="0.1"
              placeholder="100"
            />
          </div>
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">Brazo</span>
            <Input
              name="brazo_cm"
              type="number"
              min="1"
              step="0.1"
              placeholder="32"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notas">Notas del entrenador</Label>
        <Textarea
          id="notas"
          name="notas"
          placeholder="Opcional"
          className="min-h-[70px]"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar avance"}
        </Button>
      </div>
    </form>
  );
}
