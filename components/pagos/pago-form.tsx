"use client";

import { useActionState, useState } from "react";

import type { PagoFormState } from "@/app/protected/pagos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Plan } from "@/lib/types";

const METODOS: { value: string; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

function primerDiaProximoMes(): string {
  const hoy = new Date();
  const fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, hoy.getDate());
  return fin.toISOString().slice(0, 10);
}

type Props = {
  action: (
    state: PagoFormState,
    formData: FormData,
  ) => Promise<PagoFormState>;
  /** Sprint 14: planes vigentes del gimnasio, para elegir el plan del próximo
   * período al registrar el pago. */
  planes: Plan[];
  /** Plan que el alumno tiene contratado hoy — preseleccionado por defecto. */
  planActualId: string | null;
};

export function PagoForm({ action, planes, planActualId }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="monto">Monto</Label>
          <Input
            id="monto"
            name="monto"
            type="number"
            min="1"
            step="1"
            placeholder="15000"
            required
            autoFocus
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="metodo">Método de pago</Label>
          <Select id="metodo" name="metodo" defaultValue="efectivo" required>
            {METODOS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="fecha_pago">Fecha de pago</Label>
          <Input
            id="fecha_pago"
            name="fecha_pago"
            type="date"
            defaultValue={hoy}
            required
          />
        </div>
        <div />

        <div className="grid gap-2">
          <Label htmlFor="periodo_desde">Período desde</Label>
          <Input
            id="periodo_desde"
            name="periodo_desde"
            type="date"
            defaultValue={hoy}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="periodo_hasta">Período hasta</Label>
          <Input
            id="periodo_hasta"
            name="periodo_hasta"
            type="date"
            defaultValue={primerDiaProximoMes()}
            required
          />
        </div>
      </div>

      <PlanField planes={planes} planActualId={planActualId} />

      {state.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}

function PlanField({
  planes,
  planActualId,
}: {
  planes: Plan[];
  planActualId: string | null;
}) {
  const [planId, setPlanId] = useState(planActualId ?? "");
  const planSeleccionado = planes.find((p) => p.id === planId) ?? null;

  return (
    <div className="rounded-[9px] border border-border bg-secondary/30 p-4">
      <div className="grid gap-2 sm:max-w-[280px]">
        <Label htmlFor="plan_id">Plan para el próximo período</Label>
        <Select
          id="plan_id"
          name="plan_id"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          <option value="">— No generar paquete este pago —</option>
          {planes.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.nombre} ({plan.dias_por_semana} días/semana)
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {planSeleccionado
          ? `Genera un paquete de ${planSeleccionado.dias_por_semana * 4} clases (${planSeleccionado.dias_por_semana} días/semana × 4). Si es distinto del plan actual del alumno, también actualiza su plan contratado.`
          : "Este pago no generará ni actualizará un paquete de clases."}
      </p>
    </div>
  );
}
