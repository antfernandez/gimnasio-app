"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import type { RutinaFormState } from "@/app/protected/rutinas/actions";
import {
  EjercicioCombobox,
  type EjercicioOpcion,
  type ZonaOpcion,
} from "@/components/ejercicios/ejercicio-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EjercicioRutina } from "@/lib/types";

type Props = {
  action: (state: RutinaFormState, formData: FormData) => Promise<RutinaFormState>;
  contenido: EjercicioRutina[];
  zonas: ZonaOpcion[];
  ejercicios: EjercicioOpcion[];
};

type Fila = {
  id: number;
  ejercicio_id: string;
  ejercicio: string;
  series: number | string;
  reps: number | string;
  peso: string;
  notas: string;
};

let nextId = 1;

/** Spec 14: ajuste personalizado de la rutina vigente del alumno (cambiar un ejercicio,
 * series, reps, peso o notas). Solo afecta a este alumno: la rutina del catálogo y las
 * de otros alumnos quedan como están. */
export function PersonalizarRutinaForm({ action, contenido, zonas, ejercicios }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [filas, setFilas] = useState<Fila[]>(() =>
    contenido.map((ej) => ({
      id: nextId++,
      ejercicio_id: ej.ejercicio_id ?? "",
      ejercicio: ej.ejercicio,
      series: ej.series,
      reps: ej.reps,
      peso: ej.peso ?? "",
      notas: ej.notas ?? "",
    })),
  );

  const elegir = (id: number, ejercicioId: string) =>
    setFilas((f) =>
      f.map((fila) =>
        fila.id === id
          ? {
              ...fila,
              ejercicio_id: ejercicioId,
              ejercicio: ejercicios.find((e) => e.id === ejercicioId)?.nombre ?? "",
            }
          : fila,
      ),
    );
  const agregar = () =>
    setFilas((f) => [
      ...f,
      { id: nextId++, ejercicio_id: "", ejercicio: "", series: "", reps: "", peso: "", notas: "" },
    ]);
  const quitar = (id: number) =>
    setFilas((f) => (f.length > 1 ? f.filter((x) => x.id !== id) : f));

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {filas.map((fila, i) => (
        <div
          key={fila.id}
          className="grid gap-3 rounded-[9px] border border-border p-3 sm:grid-cols-[1fr_5rem_5rem_6rem_1fr_auto]"
        >
          <div className="grid gap-1.5">
            {i === 0 && <span className="text-xs text-muted-foreground">Ejercicio</span>}
            <EjercicioCombobox
              zonas={zonas}
              ejercicios={ejercicios}
              value={fila.ejercicio_id}
              onChange={(eid) => elegir(fila.id, eid)}
              etiquetaFallback={fila.ejercicio_id ? fila.ejercicio : undefined}
            />
            <input type="hidden" name="ejercicio_id" value={fila.ejercicio_id} />
            <input
              type="hidden"
              name="ejercicio_legacy"
              value={fila.ejercicio_id ? "" : fila.ejercicio}
            />
          </div>
          <div className="grid gap-1.5">
            {i === 0 && <span className="text-xs text-muted-foreground">Series</span>}
            <Input
              name="series"
              type="number"
              min="1"
              defaultValue={fila.series || undefined}
            />
          </div>
          <div className="grid gap-1.5">
            {i === 0 && <span className="text-xs text-muted-foreground">Reps</span>}
            <Input
              name="reps"
              type="number"
              min="1"
              defaultValue={fila.reps || undefined}
            />
          </div>
          <div className="grid gap-1.5">
            {i === 0 && <span className="text-xs text-muted-foreground">Peso</span>}
            <Input name="peso" defaultValue={fila.peso} />
          </div>
          <div className="grid gap-1.5">
            {i === 0 && <span className="text-xs text-muted-foreground">Notas</span>}
            <Input name="notas" defaultValue={fila.notas} />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={filas.length === 1}
              onClick={() => quitar(fila.id)}
              aria-label="Quitar ejercicio"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={agregar}>
        <Plus className="h-4 w-4" />
        Agregar ejercicio
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar ajustes"}
        </Button>
      </div>
    </form>
  );
}
