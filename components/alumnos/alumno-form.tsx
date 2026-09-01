"use client";

import { useActionState } from "react";

import type { AlumnoFormState } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatRut } from "@/lib/rut";
import type { Alumno, Plan } from "@/lib/types";

type Props = {
  action: (
    state: AlumnoFormState,
    formData: FormData,
  ) => Promise<AlumnoFormState>;
  alumno?: Alumno;
  planes: Plan[];
  submitLabel: string;
};

export function AlumnoForm({ action, alumno, planes, submitLabel }: Props) {
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
          <Label htmlFor="plan_id">Plan</Label>
          <Select id="plan_id" name="plan_id" defaultValue={alumno?.plan_id ?? ""}>
            <option value="">— Sin plan asignado —</option>
            {planes.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.nombre} ({plan.dias_por_semana} días/semana)
              </option>
            ))}
          </Select>
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
        <div className="grid gap-2">
          <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
          <Input
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={alumno?.fecha_nacimiento ?? ""}
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

      <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Ficha de salud
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Alergias y enfermedades quedan visibles como pendientes en el panel mientras
            no se completen.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="alergias">Alergias</Label>
          <Textarea
            id="alergias"
            name="alergias"
            placeholder="Ej. Ninguna conocida"
            defaultValue={alumno?.alergias ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="enfermedades">Enfermedades</Label>
          <Textarea
            id="enfermedades"
            name="enfermedades"
            placeholder="Ej. Hipertensión controlada"
            defaultValue={alumno?.enfermedades ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesiones">Lesiones</Label>
          <Textarea
            id="lesiones"
            name="lesiones"
            placeholder="Ej. Esguince de tobillo derecho (2025)"
            defaultValue={alumno?.lesiones ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="objetivos_salud">Objetivos</Label>
          <Textarea
            id="objetivos_salud"
            name="objetivos_salud"
            placeholder="Ej. Bajar de peso, mejorar movilidad"
            defaultValue={alumno?.objetivos_salud ?? ""}
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
