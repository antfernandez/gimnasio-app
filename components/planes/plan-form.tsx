"use client";

import { useActionState } from "react";

import type { PlanFormState } from "@/app/protected/planes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Plan } from "@/lib/types";

const NIVELES: { value: string; label: string }[] = [
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

type Props = {
  action: (state: PlanFormState, formData: FormData) => Promise<PlanFormState>;
  plan?: Plan;
  submitLabel: string;
};

export function PlanForm({ action, plan, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre del plan</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Plan Intermedio"
            defaultValue={plan?.nombre}
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nivel">Nivel</Label>
          <Select id="nivel" name="nivel" defaultValue={plan?.nivel ?? "basico"} required>
            {NIVELES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="dias_por_semana">Días por semana</Label>
          <Input
            id="dias_por_semana"
            name="dias_por_semana"
            type="number"
            min="1"
            step="1"
            placeholder="3"
            defaultValue={plan?.dias_por_semana}
            required
          />
          <p className="text-xs text-muted-foreground">
            Sugiere las clases mensuales del paquete (días × 4) al registrar un pago.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="precio">Precio</Label>
          <Input
            id="precio"
            name="precio"
            type="number"
            min="0"
            step="1"
            placeholder="35000"
            defaultValue={plan?.precio ?? ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="fecha_vigencia_desde">Vigente desde</Label>
          <Input
            id="fecha_vigencia_desde"
            name="fecha_vigencia_desde"
            type="date"
            defaultValue={
              plan?.fecha_vigencia_desde ?? new Date().toISOString().slice(0, 10)
            }
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="fecha_vigencia_hasta">Vigente hasta (opcional)</Label>
          <Input
            id="fecha_vigencia_hasta"
            name="fecha_vigencia_hasta"
            type="date"
            defaultValue={plan?.fecha_vigencia_hasta ?? ""}
          />
          <p className="text-xs text-muted-foreground">
            Déjalo vacío para un plan vigente indefinidamente.
          </p>
        </div>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
