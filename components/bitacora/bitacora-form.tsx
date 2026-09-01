"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Rutina } from "@/lib/types";

export type BitacoraFormState = {
  error?: string;
};

type Props = {
  action: (
    state: BitacoraFormState,
    formData: FormData,
  ) => Promise<BitacoraFormState>;
  rutina: Rutina;
  /** Portal del alumno: sin selector de fecha, siempre hoy. */
  fechaFija?: boolean;
};

export function BitacoraForm({ action, rutina, fechaFija }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="rutina_id" value={rutina.id} />

      {!fechaFija && (
        <div className="grid gap-2 sm:max-w-[220px]">
          <Label htmlFor="fecha">Fecha</Label>
          <Input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {rutina.contenido.map((ej, i) => (
          <div
            key={i}
            className="grid gap-3 rounded-[9px] border border-border p-4 sm:grid-cols-[1fr_5rem_5rem_6rem_1fr]"
          >
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Ejercicio</span>
              )}
              <div className="flex h-11 items-center text-sm font-medium text-foreground">
                {ej.ejercicio}
              </div>
              <span className="text-xs text-muted-foreground">
                Plan: {ej.series || "—"} series × {ej.reps || "—"} reps
              </span>
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Series</span>
              )}
              <Input name="series_realizadas" type="number" min="0" placeholder={String(ej.series || "")} />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && <span className="text-xs text-muted-foreground">Reps</span>}
              <Input name="reps_realizadas" type="number" min="0" placeholder={String(ej.reps || "")} />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && <span className="text-xs text-muted-foreground">Peso (kg)</span>}
              <Input name="peso_kg" type="number" min="0" step="0.5" placeholder="—" />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && <span className="text-xs text-muted-foreground">Notas</span>}
              <Input name="notas" placeholder="Opcional" />
            </div>
          </div>
        ))}
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar sesión"}
        </Button>
      </div>
    </form>
  );
}
