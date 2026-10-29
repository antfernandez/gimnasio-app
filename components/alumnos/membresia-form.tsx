"use client";

import { useActionState, useState } from "react";

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
  /** Spec 28: opciones de la membresía. */
  medicionCorporal: boolean;
  planNutricional: boolean;
  /** El alumno tiene una asignación nutricional activa (se avisa al desmarcar). */
  tieneAsignacionNutricional: boolean;
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
  medicionCorporal,
  planNutricional,
  tieneAsignacionNutricional,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [nutricionMarcada, setNutricionMarcada] = useState(planNutricional);
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

      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="medicion_corporal_habilitada"
            defaultChecked={medicionCorporal}
            className="h-4 w-4 accent-primary"
          />
          Medición corporal
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="plan_nutricional_habilitado"
            checked={nutricionMarcada}
            onChange={(e) => setNutricionMarcada(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Plan nutricional
        </label>
        {!nutricionMarcada && planNutricional && tieneAsignacionNutricional && (
          <p className="text-xs text-warning">
            El alumno tiene una asignación nutricional activa: quedará oculta para el alumno (no se
            elimina).
          </p>
        )}
      </div>

      {cicloEnCurso && (planBloqueado || rutinaBloqueada) && (
        <p className="text-xs text-muted-foreground">
          El plan y la rutina se pueden cambiar cuando termine el ciclo en curso.
        </p>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar membresía"}
        </Button>
      </div>
    </form>
  );
}
