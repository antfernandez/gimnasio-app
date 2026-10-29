"use client";

import { useActionState } from "react";

import { crearAsignacion } from "@/app/protected/nutricion/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ESTADOS_ASIGNACION } from "@/lib/nutricion";

type Props = {
  alumnos: { id: string; nombre: string }[];
  planes: { id: string; nombre: string }[];
  responsables: { id: string; nombre: string }[];
  responsableActual: string;
  hoy: string;
};

export function AsignarForm({ alumnos, planes, responsables, responsableActual, hoy }: Props) {
  const [state, formAction, isPending] = useActionState(crearAsignacion, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="alumno_id">Alumno *</Label>
          <Select id="alumno_id" name="alumno_id" required defaultValue="">
            <option value="" disabled>
              Selecciona un alumno
            </option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plan_id">Plan nutricional</Label>
          <Select id="plan_id" name="plan_id" defaultValue="">
            <option value="">Sin plan por ahora</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="responsable_id">Responsable</Label>
          <Select id="responsable_id" name="responsable_id" defaultValue={responsableActual}>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fecha_inicio">Fecha de inicio *</Label>
          <Input id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={hoy} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fecha_fin">Fecha de término (opcional)</Label>
          <Input id="fecha_fin" name="fecha_fin" type="date" />
          <p className="text-xs text-muted-foreground">Si queda vacía, se calcula con la duración del plan.</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="estado">Estado</Label>
          <Select id="estado" name="estado" defaultValue="activo">
            {ESTADOS_ASIGNACION.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notas">Notas / personalización</Label>
        <Textarea id="notas" name="notas" />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Asignar alumno"}
        </Button>
      </div>
    </form>
  );
}
