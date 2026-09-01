"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import type { RutinaFormState } from "@/app/protected/rutinas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RutinaPlantilla } from "@/lib/types";

const CATEGORIAS: { value: string; label: string }[] = [
  { value: "musculacion", label: "Musculación" },
  { value: "cardio", label: "Cardio" },
  { value: "general", label: "General" },
];

type Props = {
  action: (
    state: RutinaFormState,
    formData: FormData,
  ) => Promise<RutinaFormState>;
  plantilla?: RutinaPlantilla;
  submitLabel: string;
};

let nextRowId = 1;

type Fila = {
  id: number;
  ejercicio: string;
  series: number | string;
  reps: number | string;
  notas: string;
};

export function RutinaForm({ action, plantilla, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [filas, setFilas] = useState<Fila[]>(
    plantilla && plantilla.contenido.length > 0
      ? plantilla.contenido.map((ej) => ({ id: nextRowId++, ...ej }))
      : [{ id: nextRowId++, ejercicio: "", series: "", reps: "", notas: "" }],
  );

  const agregarFila = () =>
    setFilas((f) => [...f, { id: nextRowId++, ejercicio: "", series: "", reps: "", notas: "" }]);
  const quitarFila = (id: number) =>
    setFilas((f) => (f.length > 1 ? f.filter((fila) => fila.id !== id) : f));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre de la plantilla</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Musculación — full body"
            defaultValue={plantilla?.nombre}
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="categoria">Categoría</Label>
          <Select
            id="categoria"
            name="categoria"
            defaultValue={plantilla?.categoria ?? "general"}
            required
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="objetivo">Objetivo</Label>
          <Textarea
            id="objetivo"
            name="objetivo"
            placeholder="Ej. Hipertrofia, baja de peso…"
            defaultValue={plantilla?.objetivo ?? ""}
            className="min-h-[44px]"
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
              <Input
                name="ejercicio"
                placeholder="Sentadilla"
                defaultValue={fila.ejercicio}
                required
              />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Series</span>
              )}
              <Input
                name="series"
                type="number"
                min="1"
                placeholder="4"
                defaultValue={fila.series || undefined}
              />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Reps</span>
              )}
              <Input
                name="reps"
                type="number"
                min="1"
                placeholder="12"
                defaultValue={fila.reps || undefined}
              />
            </div>
            <div className="grid gap-1.5">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Notas</span>
              )}
              <Input name="notas" placeholder="Opcional" defaultValue={fila.notas} />
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
          {isPending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
