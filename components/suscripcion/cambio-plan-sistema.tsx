"use client";

import { useActionState } from "react";

import {
  cancelarCambioPlanSistema,
  solicitarCambioPlanSistema,
  type CambioPlanSistemaState,
} from "@/app/protected/pagar-plan/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMonto } from "@/lib/format";

const inicial: CambioPlanSistemaState = {};

type Opcion = { id: string; nombre: string; precioNeto: number };

/** Spec 54: marcar el plan al que se quiere cambiar. Necesita aprobación del Superadmin. */
export function CambioPlanSistema({
  opciones,
  pendiente,
}: {
  opciones: Opcion[];
  pendiente: { id: string; planNuevo: string } | null;
}) {
  const [state, action, enviando] = useActionState(solicitarCambioPlanSistema, inicial);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="text-sm font-semibold">Cambiar de plan</div>
        {pendiente ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              Solicitaste cambiarte a <strong>{pendiente.planNuevo}</strong>. Está pendiente de aprobación del
              Superadmin; mientras tanto sigues con tu plan actual.
            </span>
            <form action={cancelarCambioPlanSistema.bind(null, pendiente.id)}>
              <Button type="submit" variant="outline" size="sm">
                Cancelar solicitud
              </Button>
            </form>
          </div>
        ) : opciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay otros planes disponibles.</p>
        ) : (
          <form action={action} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="plan_nuevo_id">Plan al que quieres cambiarte</Label>
              <Select id="plan_nuevo_id" name="plan_nuevo_id" required defaultValue="">
                <option value="" disabled>
                  Selecciona un plan
                </option>
                {opciones.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre} — {formatMonto(o.precioNeto)} + IVA
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nota_cambio">Nota (opcional)</Label>
              <Textarea id="nota_cambio" name="nota" rows={1} className="min-h-[44px]" />
            </div>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Enviando…" : "Solicitar cambio"}
            </Button>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              El cambio rige solo cuando el Superadmin lo aprueba; el nuevo precio aplica desde tu próximo pago.
            </p>
          </form>
        )}
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
