"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import type { RutinaFormState } from "@/app/protected/rutinas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  action: (
    state: RutinaFormState,
    formData: FormData,
  ) => Promise<RutinaFormState>;
};

let nextRowId = 1;

export function RutinaForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [filas, setFilas] = useState([{ id: nextRowId++ }]);
  const hoy = new Date().toISOString().slice(0, 10);

  const agregarFila = () => setFilas((f) => [...f, { id: nextRowId++ }]);
  const quitarFila = (id: number) =>
    setFilas((f) => (f.length > 1 ? f.filter((fila) => fila.id !== id) : f));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre de la rutina</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Rutina fuerza — nivel 1"
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="objetivo">Objetivo</Label>
          <Textarea
            id="objetivo"
            name="objetivo"
            placeholder="Ej. Hipertrofia, baja de peso…"
            className="min-h-[44px]"
          />
        </div>
        <div className="grid gap-2 sm:max-w-[240px]">
          <Label htmlFor="fecha_asignacion">Fecha de asignación</Label>
          <Input
            id="fecha_asignacion"
            name="fecha_asignacion"
            type="date"
            defaultValue={hoy}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Ejercicios</Label>
        {filas.map((fila, i) => (
          <div
            key={fila.id}
            className="grid gap-3 rounded-[9px] border border-border p-4 sm:grid-cols-[1fr_5rem_5rem_1fr_auto]"
          >
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">
                  Ejercicio
                </span>
              )}
              <Input name="ejercicio" placeholder="Sentadilla" required />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Series</span>
              )}
              <Input name="series" type="number" min="1" placeholder="4" />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Reps</span>
              )}
              <Input name="reps" type="number" min="1" placeholder="12" />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Notas</span>
              )}
              <Input name="notas" placeholder="Opcional" />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={filas.length === 1}
                onClick={() => quitarFila(fila.id)}
                aria-label="Quitar ejercicio"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={agregarFila}
        >
          <Plus className="h-4 w-4" />
          Agregar ejercicio
        </Button>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Asignar rutina"}
        </Button>
      </div>
    </form>
  );
}
