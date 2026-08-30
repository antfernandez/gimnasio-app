"use client";

import { useActionState } from "react";

import { crearHorario } from "@/app/protected/turnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NOMBRES_DIA } from "@/lib/turnos";

const DIAS = [1, 2, 3, 4, 5, 6, 0] as const; // lunes primero, domingo al final (más natural para configurar)

export function HorarioForm() {
  const [state, formAction, isPending] = useActionState(crearHorario, {});

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="dia_semana">Día</Label>
        <Select id="dia_semana" name="dia_semana" defaultValue="1" required>
          {DIAS.map((d) => (
            <option key={d} value={d}>
              {NOMBRES_DIA[d]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="hora_inicio">Hora</Label>
        <Input id="hora_inicio" name="hora_inicio" type="time" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="duracion_min">Duración (min)</Label>
        <Input
          id="duracion_min"
          name="duracion_min"
          type="number"
          min={1}
          defaultValue={90}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="cupos">Cupos</Label>
        <Input id="cupos" name="cupos" type="number" min={1} defaultValue={2} required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Agregando…" : "Agregar"}
      </Button>
      {state.error && (
        <p className="text-sm text-destructive sm:col-span-5">{state.error}</p>
      )}
    </form>
  );
}
