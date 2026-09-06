"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useId, useState } from "react";

import { crearHorariosMasivo } from "@/app/protected/turnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NOMBRES_DIA } from "@/lib/turnos";

const DIAS = [1, 2, 3, 4, 5, 6, 0] as const;

type Bloque = { horaInicio: string; duracionMin: string; cupos: string };

function bloqueVacio(): Bloque {
  return { horaInicio: "", duracionMin: "90", cupos: "2" };
}

/** Sprint 18, Parte 3: carga de una vez todos los bloques de un mismo día ("semana
 * tipo" se arma día por día, duplicando después con `DuplicarDiaForm") — en vez de
 * repetir el formulario "Agregar" bloque por bloque, se agregan filas acá y se
 * guardan todas juntas en un solo submit. */
export function SemanaTipoForm() {
  const [state, formAction, isPending] = useActionState(crearHorariosMasivo, {});
  const [bloques, setBloques] = useState<Bloque[]>([bloqueVacio(), bloqueVacio()]);
  const idBase = useId();

  const actualizar = (i: number, campo: keyof Bloque, valor: string) => {
    setBloques((prev) => prev.map((b, idx) => (idx === i ? { ...b, [campo]: valor } : b)));
  };

  const agregarFila = () => setBloques((prev) => [...prev, bloqueVacio()]);
  const quitarFila = (i: number) =>
    setBloques((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-1.5 sm:max-w-[220px]">
        <Label htmlFor={`${idBase}-dia`}>Día</Label>
        <Select id={`${idBase}-dia`} name="dia_semana" defaultValue="1" required>
          {DIAS.map((d) => (
            <option key={d} value={d}>
              {NOMBRES_DIA[d]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        {bloques.map((b, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-[9px] border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
          >
            <div className="grid gap-1">
              {i === 0 && <span className="text-xs text-muted-foreground">Hora</span>}
              <Input
                type="time"
                name="hora_inicio"
                value={b.horaInicio}
                onChange={(e) => actualizar(i, "horaInicio", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              {i === 0 && (
                <span className="text-xs text-muted-foreground">Duración (min)</span>
              )}
              <Input
                type="number"
                min={1}
                name="duracion_min"
                value={b.duracionMin}
                onChange={(e) => actualizar(i, "duracionMin", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1">
              {i === 0 && <span className="text-xs text-muted-foreground">Cupos</span>}
              <Input
                type="number"
                min={1}
                name="cupos"
                value={b.cupos}
                onChange={(e) => actualizar(i, "cupos", e.target.value)}
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={bloques.length === 1}
              onClick={() => quitarFila(i)}
              title="Quitar bloque"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={agregarFila}>
          <Plus className="mr-1 h-4 w-4" />
          Agregar bloque
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar todos los bloques del día"}
        </Button>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
