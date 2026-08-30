"use client";

import { useActionState, useState } from "react";

import type { PagoFormState } from "@/app/protected/pagos/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

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
};

export function PagoForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [crearPaquete, setCrearPaquete] = useState(false);
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

      <div className="rounded-[9px] border border-border bg-secondary/30 p-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="crear_paquete"
            name="crear_paquete"
            checked={crearPaquete}
            onCheckedChange={(v) => setCrearPaquete(v === true)}
          />
          <Label htmlFor="crear_paquete" className="cursor-pointer">
            Este pago origina un paquete de clases nuevo
          </Label>
        </div>
        {crearPaquete && (
          <div className="mt-4 grid gap-2 sm:max-w-[220px]">
            <Label htmlFor="clases_incluidas">N° de clases incluidas</Label>
            <Input
              id="clases_incluidas"
              name="clases_incluidas"
              type="number"
              min="1"
              step="1"
              placeholder="8"
              required={crearPaquete}
            />
            <p className="text-xs text-muted-foreground">
              El paquete queda vigente por 1 mes corrido desde la fecha de pago (no un
              ciclo calendario fijo).
            </p>
          </div>
        )}
      </div>

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
