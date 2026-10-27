"use client";

import { useActionState } from "react";

import type { AlumnoFormState } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatRut } from "@/lib/rut";
import type { Alumno } from "@/lib/types";

type Props = {
  action: (
    state: AlumnoFormState,
    formData: FormData,
  ) => Promise<AlumnoFormState>;
  /** Alumno existente: solo se editan teléfono, correo y ficha de salud. */
  alumno?: Alumno;
  submitLabel: string;
  /** Acciones adicionales junto al botón de guardar (p. ej. dar de baja / activar). */
  acciones?: React.ReactNode;
};

/** Spec 14: editable = blanco; bloqueado = beige y deshabilitado (estilo base del Input). */
const EDITABLE = "bg-white";

export function AlumnoForm({ action, alumno, submitLabel, acciones }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2 xl:col-span-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Datos personales
          </h3>
        </div>
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
              className={EDITABLE}
              required
              autoFocus
            />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nombres">Nombres</Label>
          <Input
            id="nombres"
            name="nombres"
            defaultValue={alumno?.nombres}
            className={EDITABLE}
            disabled={!!alumno}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input
            id="apellidos"
            name="apellidos"
            defaultValue={alumno?.apellidos}
            className={EDITABLE}
            disabled={!!alumno}
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
            className={EDITABLE}
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
            className={EDITABLE}
            defaultValue={alumno?.telefono ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
          <Input
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            type="date"
            className={EDITABLE}
            disabled={!!alumno}
            defaultValue={alumno?.fecha_nacimiento ?? ""}
          />
        </div>

        <div className="grid gap-2 sm:col-span-2 xl:col-span-1 sm:max-w-[240px]">
          <Label htmlFor="fecha_inicio">Fecha de inicio</Label>
          <Input
            id="fecha_inicio"
            name="fecha_inicio"
            type="date"
            className={EDITABLE}
            defaultValue={alumno?.fecha_inicio ?? hoy}
            disabled={!!alumno}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 border-t border-border pt-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="sm:col-span-2 xl:col-span-3">
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
            className={EDITABLE}
            placeholder="Ej. Ninguna conocida"
            defaultValue={alumno?.alergias ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="enfermedades">Enfermedades</Label>
          <Textarea
            id="enfermedades"
            name="enfermedades"
            className={EDITABLE}
            placeholder="Ej. Hipertensión controlada"
            defaultValue={alumno?.enfermedades ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lesiones">Lesiones</Label>
          <Textarea
            id="lesiones"
            name="lesiones"
            className={EDITABLE}
            placeholder="Ej. Esguince de tobillo derecho (2025)"
            defaultValue={alumno?.lesiones ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="objetivos_salud">Objetivos</Label>
          <Textarea
            id="objetivos_salud"
            name="objetivos_salud"
            className={EDITABLE}
            placeholder="Ej. Bajar de peso, mejorar movilidad"
            defaultValue={alumno?.objetivos_salud ?? ""}
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
        {acciones}
      </div>
    </form>
  );
}
