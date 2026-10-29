"use client";

import { useActionState, useState } from "react";

import { registrarPagoManual, type GimnasioFormState } from "@/app/superadmin/gimnasios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatMonto } from "@/lib/format";
import { MESES_PAGO } from "@/lib/pagar-plan";

export interface PlanPago {
  id: string;
  nombre: string;
  /** Precio mensual con IVA incluido. */
  mensualConIva: number;
}

export interface GimnasioPago {
  id: string;
  nombre: string;
  planId: string | null;
  /** Vencimiento actual (AAAA-MM-DD) para sugerir el mes a pagar. */
  suscripcionHasta?: string | null;
}

/** Mes sugerido: el siguiente al vencimiento si sigue vigente; si no, el mes en curso. */
function mesSugerido(hasta: string | null | undefined): string {
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  if (hasta && hasta >= hoyIso) {
    const [y, m] = hasta.split("-").map(Number);
    return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  }
  return hoyIso.slice(0, 7);
}

/** Con `gimnasioId` el gimnasio es fijo (ficha); con `gimnasios` se elige (módulo Pagos). */
export function PagoManualForm({
  gimnasioId,
  gimnasios,
  planes,
  planInicial,
  suscripcionHasta,
}: {
  gimnasioId?: string;
  /** Con `gimnasioId` fijo: su vencimiento actual. */
  suscripcionHasta?: string | null;
  gimnasios?: GimnasioPago[];
  planes: PlanPago[];
  planInicial?: string | null;
}) {
  const [state, formAction, isPending] = useActionState<GimnasioFormState, FormData>(
    registrarPagoManual,
    {},
  );
  const [gimId, setGimId] = useState(gimnasioId ?? gimnasios?.[0]?.id ?? "");
  const [planId, setPlanId] = useState(
    planInicial ?? gimnasios?.[0]?.planId ?? planes[0]?.id ?? "",
  );
  const [meses, setMeses] = useState(1);
  const [mes, setMes] = useState(
    mesSugerido(suscripcionHasta ?? gimnasios?.[0]?.suscripcionHasta),
  );
  const [monto, setMonto] = useState<string | null>(null);

  const plan = planes.find((p) => p.id === planId);
  const sugerido = plan ? plan.mensualConIva * meses : 0;
  const montoMostrado = monto ?? String(sugerido);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="gimnasio_id" value={gimId} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {gimnasios && (
          <div className="grid gap-2">
            <Label htmlFor="pm_gimnasio">Gimnasio</Label>
            <Select
              id="pm_gimnasio"
              value={gimId}
              onChange={(e) => {
                setGimId(e.target.value);
                const g = gimnasios.find((x) => x.id === e.target.value);
                if (g?.planId) setPlanId(g.planId);
                setMes(mesSugerido(g?.suscripcionHasta));
                setMonto(null);
              }}
              required
            >
              {gimnasios.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="pm_plan">Plan</Label>
          <Select
            id="pm_plan"
            name="plan_sistema_id"
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              setMonto(null);
            }}
            required
          >
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pm_mes">Mes que paga</Label>
          <Input
            id="pm_mes"
            name="mes"
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pm_meses">Meses pagados</Label>
          <Select
            id="pm_meses"
            name="meses"
            value={meses}
            onChange={(e) => {
              setMeses(Number(e.target.value));
              setMonto(null);
            }}
          >
            {MESES_PAGO.map((m) => (
              <option key={m} value={m}>
                {m} {m === 1 ? "mes" : "meses"}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pm_metodo">Método de pago</Label>
          <Select id="pm_metodo" name="metodo" defaultValue="transferencia" required>
            <option value="transferencia">Transferencia</option>
            <option value="mercado_pago">Mercado Pago</option>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pm_monto">Monto (sugerido {formatMonto(sugerido)})</Label>
          <Input
            id="pm_monto"
            name="monto"
            type="number"
            min={1}
            step={1}
            value={montoMostrado}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pm_nota">Nota (opcional)</Label>
          <Input id="pm_nota" name="nota" placeholder="Efectivo, depósito…" />
        </div>
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">{state.ok}</p>}
      <Button type="submit" className="w-fit" disabled={isPending || planes.length === 0}>
        {isPending ? "Registrando…" : "Registrar pago manual"}
      </Button>
    </form>
  );
}
