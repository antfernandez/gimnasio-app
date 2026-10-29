"use client";

import { useActionState } from "react";

import {
  cambiarPrecioPlan,
  crearPlan,
  editarPlan,
  type PlanFormState,
} from "@/app/superadmin/planes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PlanEditable {
  id: string;
  nombre: string;
  maxAlumnos: number | null;
  descripcion: string | null;
  funciones: string;
  orden: number;
  activo: boolean;
}

function Mensajes({ state }: { state: PlanFormState }) {
  return (
    <>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">{state.ok}</p>}
    </>
  );
}

function CamposPlan({ plan }: { plan?: PlanEditable }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" defaultValue={plan?.nombre} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="max_alumnos">Tope de alumnos (vacío = sin tope)</Label>
          <Input
            id="max_alumnos"
            name="max_alumnos"
            type="number"
            min={1}
            defaultValue={plan?.maxAlumnos ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="orden">Orden</Label>
          <Input id="orden" name="orden" type="number" defaultValue={plan?.orden ?? 0} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Input id="descripcion" name="descripcion" defaultValue={plan?.descripcion ?? ""} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="funciones">Funciones incluidas (una por línea, «Título: detalle»)</Label>
        <Textarea id="funciones" name="funciones" rows={6} defaultValue={plan?.funciones} />
      </div>
    </>
  );
}

export function NuevoPlanForm() {
  const [state, formAction, isPending] = useActionState<PlanFormState, FormData>(crearPlan, {});
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CamposPlan />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="precio_neto">Precio neto mensual</Label>
          <Input id="precio_neto" name="precio_neto" type="number" min={1} step="any" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="iva_pct">IVA %</Label>
          <Input id="iva_pct" name="iva_pct" type="number" min={0} max={100} step="any" defaultValue={19} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vigente_desde">Vigente desde</Label>
          <Input id="vigente_desde" name="vigente_desde" type="date" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="vigente_hasta">Vigente hasta (opcional)</Label>
          <Input id="vigente_hasta" name="vigente_hasta" type="date" />
        </div>
      </div>
      <Mensajes state={state} />
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Creando…" : "Crear plan"}
      </Button>
    </form>
  );
}

export function EditarPlanForm({ plan }: { plan: PlanEditable }) {
  const [state, formAction, isPending] = useActionState<PlanFormState, FormData>(
    editarPlan.bind(null, plan.id),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <CamposPlan plan={plan} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="activo" defaultChecked={plan.activo} />
        Plan activo (se ofrece mientras esté vigente)
      </label>
      <Mensajes state={state} />
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar plan"}
      </Button>
    </form>
  );
}

export function CambiarPrecioForm({
  planId,
  precioNeto,
  ivaPct,
}: {
  planId: string;
  precioNeto: number;
  ivaPct: number;
}) {
  const [state, formAction, isPending] = useActionState<PlanFormState, FormData>(
    cambiarPrecioPlan.bind(null, planId),
    {},
  );
  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="cp_neto">Nuevo precio neto mensual</Label>
          <Input id="cp_neto" name="precio_neto" type="number" min={1} step="any" defaultValue={precioNeto} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cp_iva">IVA %</Label>
          <Input id="cp_iva" name="iva_pct" type="number" min={0} max={100} step="any" defaultValue={ivaPct} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cp_desde">Rige desde</Label>
          <Input id="cp_desde" name="vigente_desde" type="date" required />
        </div>
      </div>
      <Mensajes state={state} />
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Guardando…" : "Registrar nuevo precio"}
      </Button>
    </form>
  );
}
