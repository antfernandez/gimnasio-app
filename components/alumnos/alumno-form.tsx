"use client";

import { useActionState } from "react";

import type { AlumnoFormState } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRut } from "@/lib/rut";
import type { Alumno } from "@/lib/types";

const PLANES_SUGERIDOS = ["Mensual", "Trimestral", "Semestral", "Anual"];

type Props = {
  action: (
    state: AlumnoFormState,
    formData: FormData,
  ) => Promise<AlumnoFormState>;
  alumno?: Alumno;
  submitLabel: string;
};

export function AlumnoForm({ action, alumno, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="rut">RUT</Label>
          {alumno ? (
            <Input
              value={formatRut(alumno.rut, alumno.dig_ver)}
              disabled
              readOnly
            />
          ) : (
            <Input
              id="rut"
              name="rut"
              placeholder="12.345.678-9"
              required
              autoFocus
            />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plan_contratado">Plan contratado</Label>
          <Input
            id="plan_contratado"
            name="plan_contratado"
            placeholder="Ej. Mensual"
            list="planes-sugeridos"
            defaultValue={alumno?.plan_contratado}
            required
          />
          <datalist id="planes-sugeridos">
            {PLANES_SUGERIDOS.map((plan) => (
              <option key={plan} value={plan} />
            ))}
          </datalist>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nombres">Nombres</Label>
          <Input
            id="nombres"
            name="nombres"
            defaultValue={alumno?.nombres}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input
            id="apellidos"
            name="apellidos"
            defaultValue={alumno?.apellidos}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="alumno@correo.cl"
            defaultValue={alumno?.email ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            type="tel"
            placeholder="+56 9 0000 0000"
            defaultValue={alumno?.telefono ?? ""}
          />
        </div>

        <div className="grid gap-2 sm:col-span-2 sm:max-w-[240px]">
          <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
          <Input
            id="fecha_inicio"
            name="fecha_inicio"
            type="date"
            defaultValue={alumno?.fecha_inicio ?? hoy}
            required
          />
        </div>
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
