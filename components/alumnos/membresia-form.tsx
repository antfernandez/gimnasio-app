"use client";

import { useActionState } from "react";

import type { MembresiaFormState } from "@/app/protected/alumnos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Opcion = { id: string; nombre: string };

type Props = {
  action: (state: MembresiaFormState, formData: FormData) => Promise<MembresiaFormState>;
  planes: Opcion[];
  rutinas: Opcion[];
  planActualId: string | null;
  /** Rutina del catálogo de la que viene la rutina vigente del alumno. */
  rutinaActualId: string | null;
  tieneRutina: boolean;
  /** Hay un período pagado en curso: plan y rutina vigentes no se pueden cambiar. */
  cicloEnCurso: boolean;
  fechaAsignacion: string;
};

/** Spec 14: plan, rutina y fecha de la membresía. Bloqueado (beige) mientras el ciclo
 * está en curso, salvo que el alumno aún no tenga plan o rutina. */
export function MembresiaForm({
  action,
  planes,
  rutinas,
  planActualId,
  rutinaActualId,
  tieneRutina,
  cicloEnCurso,
  fechaAsignacion,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const planBloqueado = cicloEnCurso && !!planActualId;
  const rutinaBloqueada = cicloEnCurso && tieneRutina;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="plan_id">Plan</Label>
          <Select
            id="plan_id"
            name="plan_id"
            defaultValue={planActualId ?? ""}
            disabled={planBloqueado}
          >
            <option value="">— Sin plan asignado —</option>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="plantilla_id">Rutina</Label>
          <Select
            id="plantilla_id"
            name="plantilla_id"
            defaultValue={rutinaActualId ?? ""}
            disabled={rutinaBloqueada}
          >
            <option value="">— Sin rutina asignada —</option>
            {rutinas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fecha_asignacion">Fecha</Label>
          <Input
            id="fecha_asignacion"
            name="fecha_asignacion"
            type="date"
            defaultValue={fechaAsignacion}
            disabled={planBloqueado && rutinaBloqueada}
            required
          />
        </div>
      </div>

      {cicloEnCurso && (planBloqueado || rutinaBloqueada) && (
        <p className="text-xs text-muted-foreground">
          El plan y la rutina se pueden cambiar cuando termine el ciclo en curso.
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      {!(planBloqueado && rutinaBloqueada) && (
        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando…" : "Guardar membresía"}
          </Button>
        </div>
      )}
    </form>
  );
}
